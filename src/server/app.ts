import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import type { Pool } from 'pg';
import { withReadOnly, withTransaction, type TransactionHooks } from '../platform/db.ts';
import { clinicDateInZone } from '../platform/clock.ts';
import { AppError, failApp, localizeAppError } from '../platform/errors.ts';
import { runIdempotentCommand } from '../platform/idempotency.ts';
import {
  assertCsrfToken,
  assertModulePermission,
  authenticateStaffLogin,
  createStaffUser,
  defaultClinicOperationalSettings,
  getClinicSettings,
  listActiveDoctorsDirectory,
  listAuditEvents,
  listStaffUsers,
  resolveSessionActor,
  revokeSession,
  updateClinicSettings,
  updateStaffGovernance,
  type AuthenticatedActor,
} from '../modules/governance/index.ts';
import {
  correctPatientFileNumber,
  createPatient,
  downloadPatientAttachment,
  getPatientById,
  grantDoctorPatientAccess,
  listPatientAttachments,
  searchPatients,
  updatePatientMedicalHistory,
  uploadPatientAttachment,
} from '../modules/patients/index.ts';
import {
  createAppointment,
  createDoctorLeave,
  listAppointmentsForDate,
  listOutboxMessages,
  updateAppointmentStatus,
} from '../modules/appointments/index.ts';
import {
  addVisitProcedure,
  buildUnifiedDentalChart,
  completeClinicalVisit,
  listPatientVisits,
  openClinicalVisit,
} from '../modules/clinical/index.ts';
import {
  createInstallmentSchedule,
  getInvoiceById,
  getPatientStatement,
  getReceiptById,
  issueInvoice,
  recordPrintLog,
  recordReceipt,
  reverseReceipt,
  voidInvoice,
} from '../modules/billing/index.ts';
import {
  createInventoryItem,
  createLabOrder,
  getLabOrderById,
  listInventoryItems,
  listPatientLabOrders,
  recordInventoryMovement,
  updateInventoryItemMetadata,
} from '../modules/lab-inventory/index.ts';
import { createConsistentBackupBundle } from '../modules/backup/index.ts';
import { renderLoginPage, renderWorkspaceApp } from '../web/ui.ts';
import {
  renderOfficialInvoiceA4,
  renderOfficialLabSlipA5,
  renderOfficialReceiptA6,
  renderOfficialStatementAndScheduleA4,
} from '../web/print.ts';

export interface ClinicAppConfig {
  readonly pool: Pool;
  readonly clinicId: string;
  readonly attachmentsRootDir: string;
  readonly now?: () => Date;
  readonly txHooksProvider?: (req: IncomingMessage) => TransactionHooks | undefined;
}

const PUBLIC_ASSETS: Readonly<Record<string, { relPath: string; contentType: string }>> = Object.freeze({
  '/public/styles.css': { relPath: '../web/public/styles.css', contentType: 'text/css; charset=utf-8' },
  '/public/app.js': { relPath: '../web/public/app.js', contentType: 'application/javascript; charset=utf-8' },
  '/public/logo.png': { relPath: '../web/public/logo.png', contentType: 'image/png' },
  '/public/logo-white.png': { relPath: '../web/public/logo-white.png', contentType: 'image/png' },
  '/public/favicon.png': { relPath: '../web/public/favicon.png', contentType: 'image/png' },
});

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      if (k) out[k] = decodeURIComponent(v);
    }
  }
  return out;
}

async function readJsonBody(req: IncomingMessage, maxBytes = 8 * 1024 * 1024): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    total += buf.length;
    if (total > maxBytes) {
      failApp('INVALID_INPUT', 413, 'Request body exceeds maximum permitted size');
    }
    chunks.push(buf);
  }
  if (total === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    failApp('INVALID_INPUT', 400, 'Malformed JSON request body');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    failApp('INVALID_INPUT', 400, 'Expected JSON object body');
  }
  return parsed as Record<string, unknown>;
}

function setSecurityHeaders(res: ServerResponse, cspNonce?: string): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  if (cspNonce) {
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'self' 'nonce-${cspNonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
    );
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown, extraHeaders?: Record<string, string>): void {
  setSecurityHeaders(res);
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  }
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function sendHtml(res: ServerResponse, status: number, markup: string, cspNonce: string): void {
  setSecurityHeaders(res, cspNonce);
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(markup);
}

function resolveLang(url: URL, actor?: AuthenticatedActor | null, defaultLang: 'ar' | 'en' = 'ar'): 'ar' | 'en' {
  const q = url.searchParams.get('lang');
  if (q === 'ar' || q === 'en') return q;
  if (actor?.preferredLanguage === 'ar' || actor?.preferredLanguage === 'en') return actor.preferredLanguage;
  return defaultLang;
}

export function createClinicHttpServer(config: ClinicAppConfig): Server {
  const clock = config.now ?? (() => new Date());

  return createServer(async (req, res) => {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', 'http://localhost');
    const pathname = url.pathname;
    const nonce = randomBytes(16).toString('base64');
    let currentLang: 'ar' | 'en' = url.searchParams.get('lang') === 'en' ? 'en' : 'ar';

    try {
      // 1. Static Brand/UI Assets
      const staticAsset = PUBLIC_ASSETS[pathname];
      if (method === 'GET' && staticAsset !== undefined) {
        const bytes = await readFile(new URL(staticAsset.relPath, import.meta.url));
        setSecurityHeaders(res);
        res.statusCode = 200;
        res.setHeader('Content-Type', staticAsset.contentType);
        res.end(bytes);
        return;
      }

      // 2. Health endpoint
      if (method === 'GET' && pathname === '/api/v1/health') {
        sendJson(res, 200, { ok: true, clinicId: config.clinicId });
        return;
      }

      // 3. Login HTML screen
      if (method === 'GET' && pathname === '/login') {
        const titles = await withReadOnly(config.pool, async tx => {
          try {
            const s = await getClinicSettings(tx, config.clinicId);
            return s.settings.print;
          } catch {
            return defaultClinicOperationalSettings().print;
          }
        });
        currentLang = resolveLang(url, null, titles.defaultLanguage);
        sendHtml(
          res,
          200,
          renderLoginPage({
            lang: currentLang,
            cspNonce: nonce,
            clinicTitleAr: titles.clinicTitleAr,
            clinicTitleEn: titles.clinicTitleEn,
          }),
          nonce,
        );
        return;
      }

      // 4. Login API
      if (method === 'POST' && pathname === '/api/v1/auth/login') {
        const body = await readJsonBody(req);
        const now = clock();
        const ip = req.socket.remoteAddress ?? '127.0.0.1';
        const auth = await withTransaction(config.pool, {}, tx =>
          authenticateStaffLogin(tx, {
            clinicId: config.clinicId,
            username: String(body.username ?? ''),
            password: body.password,
            clientIp: ip,
            now,
          }),
        );
        sendJson(
          res,
          200,
          {
            authenticated: true,
            csrfToken: auth.csrfToken,
            user: {
              userId: auth.actor.userId,
              username: auth.actor.username,
              displayName: auth.actor.displayName,
              role: auth.actor.role,
              doctorPatientScope: auth.actor.doctorPatientScope,
              hiddenModules: auth.actor.hiddenModules,
            },
          },
          {
            'Set-Cookie': `aqlan_sid=${encodeURIComponent(auth.rawSessionToken)}; HttpOnly; Path=/; SameSite=Lax`,
          },
        );
        return;
      }

      // 5. All subsequent routes require LIVE session resolution from PostgreSQL
      const cookies = parseCookies(req.headers.cookie);
      const rawSid = cookies.aqlan_sid;
      const now = clock();

      const liveContext = await withReadOnly(config.pool, async tx => {
        const actor = await resolveSessionActor(tx, rawSid, now);
        if (!actor) return null;
        const settingsWrap = await getClinicSettings(tx, actor.clinicId);
        return { actor, settingsWrap };
      });

      if (!liveContext) {
        if (pathname === '/' || pathname === '/admin' || pathname.startsWith('/print/')) {
          setSecurityHeaders(res);
          res.statusCode = 302;
          res.setHeader('Location', `/login?lang=${currentLang}`);
          res.end();
          return;
        }
        failApp('UNAUTHENTICATED', 401);
      }

      const { actor, settingsWrap } = liveContext;
      currentLang = resolveLang(url, actor, settingsWrap.settings.print.defaultLanguage);
      const clinicToday = clinicDateInZone(now, settingsWrap.settings.schedule.timezone);

      if (method !== 'GET' && method !== 'HEAD') {
        assertCsrfToken(actor, req.headers['x-csrf-token']);
      }

      // Logout
      if (method === 'POST' && pathname === '/api/v1/auth/logout') {
        await withTransaction(config.pool, {}, tx => revokeSession(tx, actor.sessionId, now));
        sendJson(
          res,
          200,
          { loggedOut: true },
          { 'Set-Cookie': 'aqlan_sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax' },
        );
        return;
      }

      // Current live session & permissions probe
      if (method === 'GET' && pathname === '/api/v1/auth/me') {
        sendJson(res, 200, {
          clinicToday,
          csrfToken: actor.csrfToken,
          actor: {
            userId: actor.userId,
            username: actor.username,
            displayName: actor.displayName,
            role: actor.role,
            isPrimaryOwner: actor.isPrimaryOwner,
            doctorPatientScope: actor.doctorPatientScope,
            hiddenModules: actor.hiddenModules,
            permissions: actor.permissions,
            authorityVersion: actor.authorityVersion,
          },
        });
        return;
      }

      // HTML Workspace `/` and `/admin`
      if (method === 'GET' && (pathname === '/' || pathname === '/admin')) {
        if (pathname === '/admin') {
          assertModulePermission(actor, 'governance', 'view');
        }
        const initialSection: 'patients' | 'appointments' | 'inventory' | 'governance' =
          pathname === '/admin'
            ? 'governance'
            : !actor.hiddenModules.includes('patients') && actor.permissions.patients.view
              ? 'patients'
              : !actor.hiddenModules.includes('appointments') && actor.permissions.appointments.view
                ? 'appointments'
                : !actor.hiddenModules.includes('inventory') && actor.permissions.inventory.view
                  ? 'inventory'
                  : 'governance';

        sendHtml(
          res,
          200,
          renderWorkspaceApp({
            lang: currentLang,
            cspNonce: nonce,
            initialSection,
            actor,
            settings: settingsWrap.settings,
            settingsVersion: settingsWrap.version,
            clinicToday,
          }),
          nonce,
        );
        return;
      }

      // ==================== OFFICIAL PRINT ROUTES ====================
      const invPrintMatch = /^\/print\/invoice\/([^/]+)$/.exec(pathname);
      if (method === 'GET' && invPrintMatch) {
        const invoiceId = decodeURIComponent(invPrintMatch[1] ?? '');
        const htmlDoc = await withTransaction(config.pool, {}, async tx => {
          const liveActor = await resolveSessionActor(tx, rawSid, now);
          if (!liveActor) failApp('UNAUTHENTICATED', 401);
          const { settings } = await getClinicSettings(tx, liveActor.clinicId);
          const invoice = await getInvoiceById(tx, liveActor, invoiceId, clinicToday);
          const patient = await getPatientById(tx, liveActor, invoice.patientId, clinicToday);
          const copy = await recordPrintLog(tx, liveActor, {
            docType: 'INVOICE_A4',
            entityId: invoice.invoiceId,
            patientId: patient.patientId,
          });
          return renderOfficialInvoiceA4({
            lang: currentLang,
            cspNonce: nonce,
            settings,
            patient,
            invoice,
            copyOrdinal: copy.copyOrdinal,
            isReprint: copy.isReprint,
          });
        });
        sendHtml(res, 200, htmlDoc, nonce);
        return;
      }

      const rcpPrintMatch = /^\/print\/receipt\/([^/]+)$/.exec(pathname);
      if (method === 'GET' && rcpPrintMatch) {
        const receiptId = decodeURIComponent(rcpPrintMatch[1] ?? '');
        const htmlDoc = await withTransaction(config.pool, {}, async tx => {
          const liveActor = await resolveSessionActor(tx, rawSid, now);
          if (!liveActor) failApp('UNAUTHENTICATED', 401);
          const { settings } = await getClinicSettings(tx, liveActor.clinicId);
          const receipt = await getReceiptById(tx, liveActor, receiptId, clinicToday);
          const invoice = await getInvoiceById(tx, liveActor, receipt.invoiceId, clinicToday);
          const patient = await getPatientById(tx, liveActor, receipt.patientId, clinicToday);
          const copy = await recordPrintLog(tx, liveActor, {
            docType: 'RECEIPT_A6',
            entityId: receipt.receiptId,
            patientId: patient.patientId,
          });
          return renderOfficialReceiptA6({
            lang: currentLang,
            cspNonce: nonce,
            settings,
            patient,
            receipt,
            invoice,
            copyOrdinal: copy.copyOrdinal,
            isReprint: copy.isReprint,
          });
        });
        sendHtml(res, 200, htmlDoc, nonce);
        return;
      }

      const stmPrintMatch = /^\/print\/statement\/([^/]+)$/.exec(pathname);
      if (method === 'GET' && stmPrintMatch) {
        const patientId = decodeURIComponent(stmPrintMatch[1] ?? '');
        const htmlDoc = await withTransaction(config.pool, {}, async tx => {
          const liveActor = await resolveSessionActor(tx, rawSid, now);
          if (!liveActor) failApp('UNAUTHENTICATED', 401);
          const { settings } = await getClinicSettings(tx, liveActor.clinicId);
          const statement = await getPatientStatement(tx, liveActor, patientId, clinicToday);
          const copy = await recordPrintLog(tx, liveActor, {
            docType: 'STATEMENT_A4',
            entityId: patientId,
            patientId,
          });
          return renderOfficialStatementAndScheduleA4({
            lang: currentLang,
            cspNonce: nonce,
            settings,
            statement,
            copyOrdinal: copy.copyOrdinal,
            isReprint: copy.isReprint,
          });
        });
        sendHtml(res, 200, htmlDoc, nonce);
        return;
      }

      const labPrintMatch = /^\/print\/lab\/([^/]+)$/.exec(pathname);
      if (method === 'GET' && labPrintMatch) {
        const labOrderId = decodeURIComponent(labPrintMatch[1] ?? '');
        const htmlDoc = await withTransaction(config.pool, {}, async tx => {
          const liveActor = await resolveSessionActor(tx, rawSid, now);
          if (!liveActor) failApp('UNAUTHENTICATED', 401);
          const { settings } = await getClinicSettings(tx, liveActor.clinicId);
          const labOrder = await getLabOrderById(tx, liveActor, labOrderId, clinicToday, true);
          const copy = await recordPrintLog(tx, liveActor, {
            docType: 'LAB_ORDER_A5',
            entityId: labOrderId,
            patientId: labOrder.patientId,
          });
          return renderOfficialLabSlipA5({
            lang: currentLang,
            cspNonce: nonce,
            settings,
            labOrder,
            copyOrdinal: copy.copyOrdinal,
            isReprint: copy.isReprint,
          });
        });
        sendHtml(res, 200, htmlDoc, nonce);
        return;
      }

      // ==================== JSON API ROUTES ====================
      const txHooks = config.txHooksProvider?.(req);
      const txOpts = txHooks ? { hooks: txHooks } : {};
      const idemKeyHeader = req.headers['idempotency-key'];

      // Doctors directory for booking/assignment dropdowns
      if (method === 'GET' && pathname === '/api/v1/doctors') {
        const doctors = await withReadOnly(config.pool, tx =>
          listActiveDoctorsDirectory(tx, actor.clinicId),
        );
        sendJson(res, 200, { doctors });
        return;
      }

      // Patients Search & Create
      if (pathname === '/api/v1/patients' && method === 'GET') {
        const q = url.searchParams.get('q') ?? undefined;
        const patients = await withReadOnly(config.pool, tx =>
          searchPatients(tx, actor, q, clinicToday),
        );
        sendJson(res, 200, { patients });
        return;
      }

      if (pathname === '/api/v1/patients' && method === 'POST') {
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'patients.create',
              key: String(idemKeyHeader ?? ''),
              payload: body,
            },
            async () => {
              const patient = await createPatient(
                tx,
                actor,
                body as unknown as Parameters<typeof createPatient>[2],
                settingsWrap.settings.finance.defaultCurrency,
                clinicToday,
              );
              return { status: 201, body: { patient } };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      // Patient Workspace Composite (respecting live module visibility)
      const patWsMatch = /^\/api\/v1\/patients\/([^/]+)\/workspace$/.exec(pathname);
      if (method === 'GET' && patWsMatch) {
        const patientId = decodeURIComponent(patWsMatch[1] ?? '');
        const bundle = await withReadOnly(config.pool, async tx => {
          const patient = await getPatientById(tx, actor, patientId, clinicToday);
          const canClinical =
            !actor.hiddenModules.includes('clinical') && Boolean(actor.permissions.clinical.view);
          const canBilling =
            !actor.hiddenModules.includes('billing') && Boolean(actor.permissions.billing.view);
          const canLab =
            !actor.hiddenModules.includes('lab') && Boolean(actor.permissions.lab.view);

          const chart = canClinical ? await buildUnifiedDentalChart(tx, actor, patientId, clinicToday) : null;
          const visits = canClinical ? await listPatientVisits(tx, actor, patientId, clinicToday) : null;
          const statement = canBilling ? await getPatientStatement(tx, actor, patientId, clinicToday) : null;
          const labOrders = canLab ? await listPatientLabOrders(tx, actor, patientId, clinicToday) : null;
          const attachments = await listPatientAttachments(tx, actor, patientId, clinicToday);
          return { patient, chart, visits, statement, labOrders, attachments };
        });
        sendJson(res, 200, bundle);
        return;
      }

      const patGetMatch = /^\/api\/v1\/patients\/([^/]+)$/.exec(pathname);
      if (method === 'GET' && patGetMatch) {
        const patientId = decodeURIComponent(patGetMatch[1] ?? '');
        const patient = await withReadOnly(config.pool, tx =>
          getPatientById(tx, actor, patientId, clinicToday),
        );
        sendJson(res, 200, { patient });
        return;
      }

      const patMedMatch = /^\/api\/v1\/patients\/([^/]+)\/medical-history$/.exec(pathname);
      if (method === 'PATCH' && patMedMatch) {
        const patientId = decodeURIComponent(patMedMatch[1] ?? '');
        const body = await readJsonBody(req);
        const medicalHistory = await withTransaction(config.pool, txOpts, tx =>
          updatePatientMedicalHistory(
            tx,
            actor,
            {
              patientId,
              expectedVersion: Number(body.expectedVersion),
              allergies: (body.allergies as string[]) ?? [],
              chronicConditions: (body.chronicConditions as string[]) ?? [],
              currentMedications: (body.currentMedications as string[]) ?? [],
              isPregnant: Boolean(body.isPregnant),
              takesAnticoagulants: Boolean(body.takesAnticoagulants),
              criticalNotes: String(body.criticalNotes ?? ''),
              reason: String(body.reason ?? ''),
            },
            clinicToday,
          ),
        );
        sendJson(res, 200, { medicalHistory });
        return;
      }

      const patFileNoMatch = /^\/api\/v1\/patients\/([^/]+)\/file-number$/.exec(pathname);
      if (method === 'PATCH' && patFileNoMatch) {
        const patientId = decodeURIComponent(patFileNoMatch[1] ?? '');
        const body = await readJsonBody(req);
        const patient = await withTransaction(config.pool, txOpts, tx =>
          correctPatientFileNumber(
            tx,
            actor,
            {
              patientId,
              newFileNumber: Number(body.newFileNumber),
              reason: String(body.reason ?? ''),
            },
            clinicToday,
          ),
        );
        sendJson(res, 200, { patient });
        return;
      }

      const patGrantMatch = /^\/api\/v1\/patients\/([^/]+)\/grants$/.exec(pathname);
      if (method === 'POST' && patGrantMatch) {
        const patientId = decodeURIComponent(patGrantMatch[1] ?? '');
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'patients.grant',
              key: String(idemKeyHeader ?? ''),
              payload: { patientId, ...body },
            },
            async () => {
              const grantInput: Parameters<typeof grantDoctorPatientAccess>[2] = {
                patientId,
                doctorUserId: String(body.doctorUserId ?? ''),
                grantKind: body.grantKind as 'REFERRAL' | 'COVERAGE' | 'EMERGENCY_DAY',
                reason: String(body.reason ?? ''),
                ...(typeof body.validOnDate === 'string' ? { validOnDate: body.validOnDate } : {}),
              };
              const resGrant = await grantDoctorPatientAccess(tx, actor, grantInput, clinicToday);
              return { status: 201, body: resGrant };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      const patAttMatch = /^\/api\/v1\/patients\/([^/]+)\/attachments$/.exec(pathname);
      if (method === 'POST' && patAttMatch) {
        const patientId = decodeURIComponent(patAttMatch[1] ?? '');
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'patients.attachment',
              key: String(idemKeyHeader ?? ''),
              payload: { patientId, category: body.category, originalFilename: body.originalFilename },
            },
            async () => {
              const attachment = await uploadPatientAttachment(
                tx,
                actor,
                config.attachmentsRootDir,
                {
                  patientId,
                  category: body.category as 'XRAY' | 'CONSENT' | 'DOCUMENT' | 'PHOTO',
                  originalFilename: String(body.originalFilename ?? 'file.bin'),
                  base64Data: String(body.base64Data ?? ''),
                },
                clinicToday,
              );
              return { status: 201, body: { attachment } };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      const attDlMatch = /^\/api\/v1\/attachments\/([^/]+)$/.exec(pathname);
      if (method === 'GET' && attDlMatch) {
        const attachmentId = decodeURIComponent(attDlMatch[1] ?? '');
        const dl = await withReadOnly(config.pool, tx =>
          downloadPatientAttachment(tx, actor, config.attachmentsRootDir, attachmentId, clinicToday),
        );
        setSecurityHeaders(res);
        res.statusCode = 200;
        res.setHeader('Content-Type', dl.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${dl.filename}"`);
        res.end(dl.bytes);
        return;
      }

      const patStmMatch = /^\/api\/v1\/patients\/([^/]+)\/statement$/.exec(pathname);
      if (method === 'GET' && patStmMatch) {
        const patientId = decodeURIComponent(patStmMatch[1] ?? '');
        const statement = await withReadOnly(config.pool, tx =>
          getPatientStatement(tx, actor, patientId, clinicToday),
        );
        sendJson(res, 200, { statement });
        return;
      }

      // Patient CSV Export (tests `export` permission + module visibility)
      const patExportMatch = /^\/api\/v1\/patients\/([^/]+)\/statement\/export$/.exec(pathname);
      if (method === 'GET' && patExportMatch) {
        const patientId = decodeURIComponent(patExportMatch[1] ?? '');
        const csv = await withReadOnly(config.pool, async tx => {
          assertModulePermission(actor, 'billing', 'export');
          const stm = await getPatientStatement(tx, actor, patientId, clinicToday);
          const lines = ['type,reference,date,currency,minor_amount'];
          for (const inv of stm.invoices) {
            if (inv.status !== 'VOIDED') {
              lines.push(`INVOICE,INV-${inv.invoiceNumber},${inv.issuedDate},${inv.currency},${inv.netMinor}`);
            }
          }
          for (const rcp of stm.receipts) {
            lines.push(`RECEIPT_${rcp.kind},RCP-${rcp.receiptNumber},${rcp.receiptDate},${rcp.invoiceCurrency},${rcp.allocatedInvoiceMinor}`);
          }
          return lines.join('\n');
        });
        setSecurityHeaders(res);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.end(csv);
        return;
      }

      // Appointments & Leaves
      if (pathname === '/api/v1/appointments' && method === 'GET') {
        const dateParam = url.searchParams.get('date') ?? clinicToday;
        const appointments = await withReadOnly(config.pool, tx =>
          listAppointmentsForDate(tx, actor, dateParam, clinicToday),
        );
        sendJson(res, 200, { appointments });
        return;
      }

      if (pathname === '/api/v1/appointments' && method === 'POST') {
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'appointments.create',
              key: String(idemKeyHeader ?? ''),
              payload: body,
            },
            async () => {
              const appointment = await createAppointment(
                tx,
                actor,
                body as unknown as Parameters<typeof createAppointment>[2],
                clinicToday,
              );
              return { status: 201, body: { appointment } };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      const apptStatusMatch = /^\/api\/v1\/appointments\/([^/]+)\/status$/.exec(pathname);
      if (method === 'PATCH' && apptStatusMatch) {
        const appointmentId = decodeURIComponent(apptStatusMatch[1] ?? '');
        const body = await readJsonBody(req);
        const appointment = await withTransaction(config.pool, txOpts, tx =>
          updateAppointmentStatus(
            tx,
            actor,
            {
              appointmentId,
              expectedVersion: Number(body.expectedVersion),
              nextStatus: body.nextStatus as Parameters<typeof updateAppointmentStatus>[2]['nextStatus'],
              ...(typeof body.reason === 'string' ? { reason: body.reason } : {}),
            },
            clinicToday,
          ),
        );
        sendJson(res, 200, { appointment });
        return;
      }

      if (pathname === '/api/v1/doctor-leaves' && method === 'POST') {
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'appointments.leave',
              key: String(idemKeyHeader ?? ''),
              payload: body,
            },
            async () => {
              const leave = await createDoctorLeave(tx, actor, {
                doctorUserId: String(body.doctorUserId ?? ''),
                startDate: String(body.startDate ?? ''),
                endDate: String(body.endDate ?? ''),
                reason: String(body.reason ?? ''),
              });
              return { status: 201, body: leave };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      // Clinical Visits & FDI Procedures
      if (pathname === '/api/v1/visits' && method === 'POST') {
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'clinical.visit.open',
              key: String(idemKeyHeader ?? ''),
              payload: body,
            },
            async () => {
              const visit = await openClinicalVisit(
                tx,
                actor,
                body as unknown as Parameters<typeof openClinicalVisit>[2],
                clinicToday,
              );
              return { status: 201, body: { visit } };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      const visProcMatch = /^\/api\/v1\/visits\/([^/]+)\/procedures$/.exec(pathname);
      if (method === 'POST' && visProcMatch) {
        const visitId = decodeURIComponent(visProcMatch[1] ?? '');
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'clinical.procedure.add',
              key: String(idemKeyHeader ?? ''),
              payload: { visitId, ...body },
            },
            async () => {
              const procedure = await addVisitProcedure(
                tx,
                actor,
                { visitId, ...(body as unknown as Omit<Parameters<typeof addVisitProcedure>[2], 'visitId'>) },
                clinicToday,
              );
              return { status: 201, body: { procedure } };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      const visCompMatch = /^\/api\/v1\/visits\/([^/]+)\/complete$/.exec(pathname);
      if (method === 'POST' && visCompMatch) {
        const visitId = decodeURIComponent(visCompMatch[1] ?? '');
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'clinical.visit.complete',
              key: String(idemKeyHeader ?? ''),
              payload: { visitId, ...body },
            },
            async () => {
              const visit = await completeClinicalVisit(
                tx,
                actor,
                {
                  visitId,
                  expectedVersion: Number(body.expectedVersion),
                  ...(typeof body.closingNote === 'string' ? { closingNote: body.closingNote } : {}),
                },
                clinicToday,
              );
              return { status: 200, body: { visit } };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      // Billing: Invoices, Receipts & Remaining-Balance Installments
      if (pathname === '/api/v1/invoices' && method === 'POST') {
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'billing.invoice.issue',
              key: String(idemKeyHeader ?? ''),
              payload: body,
            },
            async () => {
              const invoice = await issueInvoice(
                tx,
                actor,
                body as unknown as Parameters<typeof issueInvoice>[2],
                clinicToday,
              );
              return { status: 201, body: { invoice } };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      const invVoidMatch = /^\/api\/v1\/invoices\/([^/]+)\/void$/.exec(pathname);
      if (method === 'POST' && invVoidMatch) {
        const invoiceId = decodeURIComponent(invVoidMatch[1] ?? '');
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'billing.invoice.void',
              key: String(idemKeyHeader ?? ''),
              payload: { invoiceId, ...body },
            },
            async () => {
              const invoice = await voidInvoice(
                tx,
                actor,
                {
                  invoiceId,
                  expectedVersion: Number(body.expectedVersion),
                  reason: String(body.reason ?? ''),
                },
                clinicToday,
              );
              return { status: 200, body: { invoice } };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      if (pathname === '/api/v1/receipts' && method === 'POST') {
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'billing.receipt.record',
              key: String(idemKeyHeader ?? ''),
              payload: body,
            },
            async () => {
              const receipt = await recordReceipt(
                tx,
                actor,
                {
                  ...(body as unknown as Omit<Parameters<typeof recordReceipt>[2], 'now'>),
                  now,
                },
                clinicToday,
              );
              return { status: 201, body: { receipt } };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      const rcpRevMatch = /^\/api\/v1\/receipts\/([^/]+)\/reverse$/.exec(pathname);
      if (method === 'POST' && rcpRevMatch) {
        const receiptId = decodeURIComponent(rcpRevMatch[1] ?? '');
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'billing.receipt.reverse',
              key: String(idemKeyHeader ?? ''),
              payload: { receiptId, ...body },
            },
            async () => {
              const reversal = await reverseReceipt(
                tx,
                actor,
                {
                  receiptId,
                  reversalDate: String(body.reversalDate ?? clinicToday),
                  reason: String(body.reason ?? ''),
                },
                clinicToday,
              );
              return { status: 201, body: { receipt: reversal } };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      if (pathname === '/api/v1/installments' && method === 'POST') {
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'billing.installments.create',
              key: String(idemKeyHeader ?? ''),
              payload: body,
            },
            async () => {
              const schedule = await createInstallmentSchedule(
                tx,
                actor,
                body as unknown as Parameters<typeof createInstallmentSchedule>[2],
                clinicToday,
              );
              return { status: 201, body: { schedule } };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      // Lab & Inventory Operational Settings Consumers
      if (pathname === '/api/v1/lab-orders' && method === 'POST') {
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'lab.order.create',
              key: String(idemKeyHeader ?? ''),
              payload: body,
            },
            async () => {
              const labOrder = await createLabOrder(
                tx,
                actor,
                body as unknown as Parameters<typeof createLabOrder>[2],
                clinicToday,
              );
              return { status: 201, body: { labOrder } };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      if (pathname === '/api/v1/inventory/items' && method === 'GET') {
        const items = await withReadOnly(config.pool, tx => listInventoryItems(tx, actor));
        sendJson(res, 200, { items });
        return;
      }

      if (pathname === '/api/v1/inventory/items' && method === 'POST') {
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'inventory.item.create',
              key: String(idemKeyHeader ?? ''),
              payload: body,
            },
            async () => {
              const item = await createInventoryItem(
                tx,
                actor,
                body as unknown as Parameters<typeof createInventoryItem>[2],
              );
              return { status: 201, body: { item } };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      const invMetaMatch = /^\/api\/v1\/inventory\/items\/([^/]+)$/.exec(pathname);
      if (method === 'PATCH' && invMetaMatch) {
        const itemId = decodeURIComponent(invMetaMatch[1] ?? '');
        const body = await readJsonBody(req);
        const item = await withTransaction(config.pool, txOpts, tx =>
          updateInventoryItemMetadata(tx, actor, {
            itemId,
            expectedVersion: Number(body.expectedVersion),
            reason: String(body.reason ?? ''),
            ...(typeof body.nameAr === 'string' ? { nameAr: body.nameAr } : {}),
            ...(typeof body.nameEn === 'string' ? { nameEn: body.nameEn } : {}),
            ...(typeof body.unitOfMeasure === 'string' ? { unitOfMeasure: body.unitOfMeasure } : {}),
            ...(typeof body.lowStockThreshold === 'number' ? { lowStockThreshold: body.lowStockThreshold } : {}),
          }),
        );
        sendJson(res, 200, { item });
        return;
      }

      if (pathname === '/api/v1/inventory/movements' && method === 'POST') {
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'inventory.movement.record',
              key: String(idemKeyHeader ?? ''),
              payload: body,
            },
            async () => {
              const movement = await recordInventoryMovement(
                tx,
                actor,
                body as unknown as Parameters<typeof recordInventoryMovement>[2],
                clinicToday,
              );
              return { status: 201, body: { movement } };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      // ==================== OWNER ADMIN & GOVERNANCE API ====================
      if (pathname === '/api/v1/admin/overview' && method === 'GET') {
        const overview = await withReadOnly(config.pool, async tx => {
          const staff = await listStaffUsers(tx, actor);
          const settings = await getClinicSettings(tx, actor.clinicId);
          const audit = await listAuditEvents(tx, actor, 50);
          const outbox = await listOutboxMessages(tx, actor, 40);
          return { staff, settings, audit, outbox };
        });
        sendJson(res, 200, overview);
        return;
      }

      if (pathname === '/api/v1/admin/staff' && method === 'POST') {
        const body = await readJsonBody(req);
        const env = await withTransaction(config.pool, txOpts, tx =>
          runIdempotentCommand(
            tx,
            {
              clinicId: actor.clinicId,
              actorUserId: actor.userId,
              scope: 'governance.staff.create',
              key: String(idemKeyHeader ?? ''),
              payload: { ...body, password: '[REDACTED]' },
            },
            async () => {
              const staff = await createStaffUser(
                tx,
                actor,
                body as unknown as Parameters<typeof createStaffUser>[2],
              );
              return { status: 201, body: { staff } };
            },
          ),
        );
        sendJson(res, env.status, { ...env.body, replayed: env.replayed });
        return;
      }

      const staffPatchMatch = /^\/api\/v1\/admin\/staff\/([^/]+)$/.exec(pathname);
      if (method === 'PATCH' && staffPatchMatch) {
        const targetUserId = decodeURIComponent(staffPatchMatch[1] ?? '');
        const body = await readJsonBody(req);
        const staff = await withTransaction(config.pool, txOpts, tx =>
          updateStaffGovernance(tx, actor, {
            targetUserId,
            expectedVersion: Number(body.expectedVersion),
            reason: String(body.reason ?? ''),
            ...(typeof body.displayName === 'string' ? { displayName: body.displayName } : {}),
            ...(typeof body.role === 'string' ? { role: body.role as Parameters<typeof updateStaffGovernance>[2]['role'] & string } : {}),
            ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}),
            ...(typeof body.doctorPatientScope === 'string'
              ? { doctorPatientScope: body.doctorPatientScope as 'own' | 'authorized' }
              : {}),
            ...(Array.isArray(body.hiddenModules)
              ? { hiddenModules: body.hiddenModules as Parameters<typeof updateStaffGovernance>[2]['hiddenModules'] & readonly string[] }
              : {}),
            ...(body.permissions && typeof body.permissions === 'object'
              ? { permissions: body.permissions as Parameters<typeof updateStaffGovernance>[2]['permissions'] & object }
              : {}),
            ...(typeof body.newPassword === 'string' ? { newPassword: body.newPassword } : {}),
          }),
        );
        sendJson(res, 200, { staff });
        return;
      }

      if (pathname === '/api/v1/admin/settings' && method === 'PATCH') {
        const body = await readJsonBody(req);
        const updated = await withTransaction(config.pool, txOpts, tx =>
          updateClinicSettings(tx, actor, {
            expectedVersion: Number(body.expectedVersion),
            settings: body.settings,
            reason: String(body.reason ?? ''),
          }),
        );
        sendJson(res, 200, updated);
        return;
      }

      if (pathname === '/api/v1/admin/backup' && method === 'GET') {
        const bundle = await createConsistentBackupBundle(
          config.pool,
          actor,
          config.attachmentsRootDir,
        );
        sendJson(res, 200, bundle);
        return;
      }

      failApp('NOT_FOUND', 404);
    } catch (err) {
      if (err instanceof AppError) {
        sendJson(res, err.status, {
          code: err.code,
          message: localizeAppError(err.code, currentLang),
        });
        return;
      }
      sendJson(res, 500, {
        code: 'INTERNAL_ERROR',
        message: localizeAppError('INTERNAL_ERROR', currentLang),
      });
    }
  });
}
