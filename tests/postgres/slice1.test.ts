import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import pg from 'pg';
import { parseIsolatedDatabaseConfig, withTransaction, type TransactionHooks } from '../../src/platform/db.ts';
import { runMigrations } from '../../src/platform/migrations.ts';
import { ensureClinicBootstrap } from '../../src/modules/governance/index.ts';
import { restoreBackupToIsolatedDatabase, type ClinicBackupBundle } from '../../src/modules/backup/index.ts';
import { createClinicHttpServer } from '../../src/server/app.ts';

const dbUrl = process.env.AQLAN_TEST_DATABASE_URL;
const isoFlag = process.env.AQLAN_ISOLATED_DB;
if (isoFlag !== '1' || !dbUrl) {
  throw new Error('AQLAN_ISOLATED_DB=1 and AQLAN_TEST_DATABASE_URL are required for real PostgreSQL Slice 1 tests');
}

interface HttpSessionClient {
  cookie: string;
  csrfToken: string;
  login(username: string, password: string): Promise<{ status: number; body: Record<string, unknown> }>;
  request(
    method: string,
    path: string,
    opts?: { body?: unknown; idemKey?: string; headers?: Record<string, string> },
  ): Promise<{ status: number; body: Record<string, unknown>; text: string; contentType: string }>;
}

function makeClient(baseUrl: string): HttpSessionClient {
  let cookie = '';
  let csrfToken = '';
  let seq = 0;

  return {
    get cookie() {
      return cookie;
    },
    get csrfToken() {
      return csrfToken;
    },
    async login(username: string, password: string) {
      const res = await fetch(`${baseUrl}/api/v1/auth/login?lang=ar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const setCookie = res.headers.get('set-cookie');
      if (setCookie) {
        cookie = setCookie.split(';')[0] ?? '';
      }
      const body = (await res.json()) as Record<string, unknown>;
      if (typeof body.csrfToken === 'string') {
        csrfToken = body.csrfToken;
      }
      return { status: res.status, body };
    },
    async request(method, path, opts = {}) {
      const headers: Record<string, string> = { ...(opts.headers ?? {}) };
      if (cookie) headers.Cookie = cookie;
      if (method !== 'GET' && method !== 'HEAD') {
        headers['X-CSRF-Token'] = csrfToken;
        headers['Idempotency-Key'] = opts.idemKey ?? `test-key-${++seq}-${Date.now()}`;
      }
      if (opts.body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        redirect: 'manual',
        ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
      });
      const contentType = res.headers.get('content-type') ?? '';
      const text = await res.text();
      let body: Record<string, unknown> = {};
      if (contentType.includes('application/json') && text) {
        body = JSON.parse(text) as Record<string, unknown>;
      }
      return { status: res.status, body, text, contentType };
    },
  };
}

test('Slice 1 + Owner Governance real PostgreSQL 18.6 end-to-end verification', async t => {
  const adminCfg = parseIsolatedDatabaseConfig(dbUrl, isoFlag, { max: 4 });
  const adminPool = new pg.Pool({ ...adminCfg, database: 'postgres' });

  const mainDbName = adminCfg.database ?? 'aqlan_slice1_test';
  const restoreDbName = 'aqlan_restore_verify_test';

  // Ensure clean isolated schemas/databases before running
  await adminPool.query(`DROP DATABASE IF EXISTS ${restoreDbName}`);
  await adminPool.query(`CREATE DATABASE ${restoreDbName}`);

  // Tiny pool (`max: 2`) intentionally stresses single-connection `withTransaction` discipline!
  const pool = new pg.Pool({ ...adminCfg, max: 2 });
  await pool.query('DROP SCHEMA IF EXISTS aqlan_app CASCADE');

  const attDirMain = await mkdtemp(join(tmpdir(), 'aqlan-att-main-'));
  const attDirRestore = await mkdtemp(join(tmpdir(), 'aqlan-att-restore-'));

  let currentNow = new Date('2026-10-29T09:00:00Z'); // 12:00 in Asia/Aden (Thursday)
  let nextTxHook: TransactionHooks | undefined;

  const clinicId = 'clinic-aqlan-test';
  const server = createClinicHttpServer({
    pool,
    clinicId,
    attachmentsRootDir: attDirMain,
    now: () => currentNow,
    txHooksProvider: () => {
      const h = nextTxHook;
      nextTxHook = undefined;
      return h;
    },
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await t.test('T-01: Single migration runner, checksum stability, and append-only DB triggers', async () => {
      const firstRun = await runMigrations(pool);
      assert.deepEqual(firstRun.applied, ['0001_slice1_core']);
      const secondRun = await runMigrations(pool);
      assert.deepEqual(secondRun.applied, []);
      assert.deepEqual(secondRun.skipped, ['0001_slice1_core']);

      await withTransaction(pool, {}, tx =>
        ensureClinicBootstrap(tx, {
          clinicId,
          ownerUsername: 'owner',
          ownerDisplayName: 'د. عقلان الكامل',
          ownerPassword: 'Owner-Synthetic-Pass-2026!',
        }),
      );

      // Verify append-only trigger blocks UPDATE/DELETE on app_audit_events
      await assert.rejects(
        pool.query(`DELETE FROM aqlan_app.app_audit_events`),
        { code: '23514' },
      );
    });

    const owner = makeClient(baseUrl);
    const drAlpha = makeClient(baseUrl);
    const drBeta = makeClient(baseUrl);
    const reception = makeClient(baseUrl);
    const cashier = makeClient(baseUrl);
    const assistant = makeClient(baseUrl);

    let drAlphaId = '';
    let drBetaId = '';
    let cashierId = '';
    let mainPatientId = '';
    let mainAttachmentId = '';
    let mainVisitId = '';
    let mainInvoiceId = '';
    let mainReceiptId = '';

    await t.test('T-02: Staff governance, primary owner lockout protection, legacy (<7000) & concurrent (>=7000) patient numbering on tiny pool (max=2)', async () => {
      const loginRes = await owner.login('owner', 'Owner-Synthetic-Pass-2026!');
      assert.equal(loginRes.status, 200);

      const meRes = await owner.request('GET', '/api/v1/auth/me');
      const ownerId = (meRes.body.actor as { userId: string }).userId;

      // Attempt to lock out primary owner (deactivate or hide governance) -> 409 OWNER_LOCKOUT_PROTECTED
      const lockoutAttempt = await owner.request('PATCH', `/api/v1/admin/staff/${ownerId}`, {
        body: { expectedVersion: 1, isActive: false, reason: 'Accidental self-disable' },
      });
      assert.equal(lockoutAttempt.status, 409);
      assert.equal(lockoutAttempt.body.code, 'OWNER_LOCKOUT_PROTECTED');

      const hideGovAttempt = await owner.request('PATCH', `/api/v1/admin/staff/${ownerId}`, {
        body: { expectedVersion: 1, hiddenModules: ['governance'], reason: 'Accidental hide' },
      });
      assert.equal(hideGovAttempt.status, 409);
      assert.equal(hideGovAttempt.body.code, 'OWNER_LOCKOUT_PROTECTED');

      // Onboard multi-role team
      const mkStaff = async (username: string, displayName: string, role: string, scope = 'own') => {
        const r = await owner.request('POST', '/api/v1/admin/staff', {
          body: {
            username,
            displayName,
            password: `Pass-${username}-2026!`,
            role,
            doctorPatientScope: scope,
            reason: `Onboard ${role}`,
          },
        });
        assert.equal(r.status, 201);
        return (r.body.staff as { userId: string }).userId;
      };

      drAlphaId = await mkStaff('dr.alpha', 'د. خالد التقويم', 'DOCTOR', 'own');
      drBetaId = await mkStaff('dr.beta', 'د. سامي العصب', 'DOCTOR', 'authorized');
      await mkStaff('reception.sara', 'سارة الاستقبال', 'RECEPTION', 'own');
      cashierId = await mkStaff('cashier.ali', 'علي المحاسب', 'CASHIER', 'own');
      await mkStaff('assistant.mona', 'منى المساعدة', 'ASSISTANT', 'own');

      assert.equal((await drAlpha.login('dr.alpha', 'Pass-dr.alpha-2026!')).status, 200);
      assert.equal((await drBeta.login('dr.beta', 'Pass-dr.beta-2026!')).status, 200);
      assert.equal((await reception.login('reception.sara', 'Pass-reception.sara-2026!')).status, 200);
      assert.equal((await cashier.login('cashier.ali', 'Pass-cashier.ali-2026!')).status, 200);
      assert.equal((await assistant.login('assistant.mona', 'Pass-assistant.mona-2026!')).status, 200);

      // Import legacy archive patient (< 7000) — must stay 412 and NOT alter >= 7000 sequence
      const legacyRes = await owner.request('POST', '/api/v1/patients', {
        body: {
          fullName: 'مريض أرشيف سابق',
          phone: '771000412',
          sex: 'MALE',
          legacyArchiveFileNumber: 412,
        },
      });
      assert.equal(legacyRes.status, 201);
      assert.equal((legacyRes.body.patient as { fileNumber: number }).fileNumber, 412);

      // Fire 6 concurrent new patient creations against pool max=2 -> atomic unique 7000..7005!
      const concurrentCreates = await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          reception.request('POST', '/api/v1/patients', {
            body: {
              fullName: `مريض متزامن رقم ${i + 1}`,
              phone: `77710000${i}`,
              sex: i % 2 === 0 ? 'MALE' : 'FEMALE',
              primaryDoctorUserId: drAlphaId,
            },
          }),
        ),
      );
      const assignedNumbers = concurrentCreates
        .map(r => {
          assert.equal(r.status, 201);
          const p = r.body.patient as { fileNumber: number; portalStatus: string; portalHandle: string };
          assert.equal(p.portalStatus, 'DISABLED');
          assert.ok(p.portalHandle.startsWith('ptl-'));
          return p.fileNumber;
        })
        .sort((a, b) => a - b);
      assert.deepEqual(assignedNumbers, [7000, 7001, 7002, 7003, 7004, 7005]);

      // Audited manual file number correction (7005 -> 7050): keeps patient_id & searchable by old/new
      const p7005 = concurrentCreates.find(
        r => (r.body.patient as { fileNumber: number }).fileNumber === 7005,
      )!.body.patient as { patientId: string };

      const corr = await owner.request('PATCH', `/api/v1/patients/${p7005.patientId}/file-number`, {
        body: { newFileNumber: 7050, reason: 'تصحيح رقم ملف ورقي مطابق' },
      });
      assert.equal(corr.status, 200);
      assert.equal((corr.body.patient as { fileNumber: number }).fileNumber, 7050);

      const searchByOld = await reception.request('GET', '/api/v1/patients?q=7005');
      assert.equal((searchByOld.body.patients as { patientId: string }[])[0]?.patientId, p7005.patientId);
    });

    await t.test('T-03: Full Vertical Journey + Mandatory 2300 / 500 / 1800 / 24 = 75 Installment Acceptance + Reprint Marks', async () => {
      // Create patient #7006 with Penicillin allergy & anticoagulants
      const patRes = await reception.request('POST', '/api/v1/patients', {
        body: {
          fullName: 'عبدالله صالح التجريبي',
          phone: '777888999',
          sex: 'MALE',
          primaryDoctorUserId: drAlphaId,
          medicalHistory: {
            allergies: ['Penicillin'],
            takesAnticoagulants: true,
            criticalNotes: 'مراجعة السيولة قبل أي قلع جراحي',
          },
        },
      });
      assert.equal(patRes.status, 201);
      const pat = patRes.body.patient as { patientId: string; fileNumber: number };
      assert.equal(pat.fileNumber, 7006);
      mainPatientId = pat.patientId;

      // Reject disguised HTML/script attachment; accept real PNG magic header
      const badAtt = await reception.request('POST', `/api/v1/patients/${mainPatientId}/attachments`, {
        body: {
          category: 'XRAY',
          originalFilename: 'evil.html',
          base64Data: Buffer.from('<script>alert(1)</script>').toString('base64'),
        },
      });
      assert.equal(badAtt.status, 400);

      const validPngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02, 0x03]);
      const okAtt = await reception.request('POST', `/api/v1/patients/${mainPatientId}/attachments`, {
        body: {
          category: 'XRAY',
          originalFilename: 'panoramic-7006.png',
          base64Data: validPngBytes.toString('base64'),
        },
      });
      assert.equal(okAtt.status, 201);
      mainAttachmentId = (okAtt.body.attachment as { attachmentId: string }).attachmentId;

      // Book appointment on Thursday 2026-10-29 at 10:00 Chair 1
      const apptRes = await reception.request('POST', '/api/v1/appointments', {
        body: {
          patientId: mainPatientId,
          doctorUserId: drAlphaId,
          appointmentDate: '2026-10-29',
          startTime: '10:00',
          chairNo: 1,
          kind: 'TREATMENT',
          reason: 'بداية خطة التقويم والعصب',
        },
      });
      assert.equal(apptRes.status, 201);
      const apptId = (apptRes.body.appointment as { appointmentId: string }).appointmentId;

      // Clinical safety gate: opening visit WITHOUT acknowledging critical medical alert MUST fail!
      const unackedVisit = await drAlpha.request('POST', '/api/v1/visits', {
        body: {
          patientId: mainPatientId,
          appointmentId: apptId,
          visitDate: '2026-10-29',
          kind: 'INITIAL',
          chiefComplaint: 'خطة تقويم شاملة وعلاج عصب #16',
          acknowledgeMedicalAlerts: false,
        },
      });
      assert.equal(unackedVisit.status, 409);
      assert.equal(unackedVisit.body.code, 'MEDICAL_ALERT_UNACKNOWLEDGED');

      // Open visit WITH medical alert acknowledgment
      const visitRes = await drAlpha.request('POST', '/api/v1/visits', {
        body: {
          patientId: mainPatientId,
          appointmentId: apptId,
          visitDate: '2026-10-29',
          kind: 'INITIAL',
          chiefComplaint: 'خطة تقويم شاملة وعلاج عصب #16',
          acknowledgeMedicalAlerts: true,
        },
      });
      assert.equal(visitRes.status, 201);
      mainVisitId = (visitRes.body.visit as { visitId: string }).visitId;

      // Record clinical procedure (2300.00 YER) on FDI #16
      const procRes = await drAlpha.request('POST', `/api/v1/visits/${mainVisitId}/procedures`, {
        body: {
          serviceCode: 'ENDO',
          fdiTooth: '16',
          procedureNameAr: 'خطة علاجية متكاملة للسن #16 والتقويم',
          procedureNameEn: 'Comprehensive Endo & Ortho Plan #16',
          plannedSessions: 1,
          completedSessions: 1,
          feeDecimal: '2300.00',
          currency: 'YER',
          clinicalNote: 'تمت الجلسة بنجاح مع مراعاة الحساسية للبنسلين',
        },
      });
      assert.equal(procRes.status, 201);
      const procId = (procRes.body.procedure as { procedureId: string }).procedureId;

      // Complete visit -> automatically completes appointment too
      const compRes = await drAlpha.request('POST', `/api/v1/visits/${mainVisitId}/complete`, {
        body: { expectedVersion: 1, closingNote: 'اكتملت الزيارة' },
      });
      assert.equal(compRes.status, 200);

      // Verify Unified Non-Mirrored FDI Chart
      const wsRes = await drAlpha.request('GET', `/api/v1/patients/${mainPatientId}/workspace`);
      assert.equal(wsRes.status, 200);
      const chart = wsRes.body.chart as {
        perspective: string;
        teeth: Record<string, { hasEndo: boolean; latestStatus: string }>;
      };
      assert.equal(chart.perspective, 'VIEWER_CANONICAL_NON_MIRRORED');
      assert.equal(chart.teeth['16']?.hasEndo, true);
      assert.equal(chart.teeth['16']?.latestStatus, 'COMPLETED');

      // Cashier issues Invoice for 2300.00 YER from procedure
      const invRes = await cashier.request('POST', '/api/v1/invoices', {
        body: {
          patientId: mainPatientId,
          visitId: mainVisitId,
          issuedDate: '2026-10-29',
          currency: 'YER',
          visitProcedureIds: [procId],
          notes: 'اتفاق علاجي إجمالي 2300',
        },
      });
      assert.equal(invRes.status, 201);
      const inv = invRes.body.invoice as { invoiceId: string; netMinor: string; remainingMinor: string };
      assert.equal(inv.netMinor, '230000');
      assert.equal(inv.remainingMinor, '230000');
      mainInvoiceId = inv.invoiceId;

      // Attempting to bill the same clinical procedure again MUST fail with DUPLICATE_BILLING!
      const dupBill = await cashier.request('POST', '/api/v1/invoices', {
        body: {
          patientId: mainPatientId,
          issuedDate: '2026-10-29',
          currency: 'YER',
          visitProcedureIds: [procId],
        },
      });
      assert.equal(dupBill.status, 409);
      assert.equal(dupBill.body.code, 'DUPLICATE_BILLING');

      // Cashier collects Partial Receipt of 500.00 YER
      const rcpRes = await cashier.request('POST', '/api/v1/receipts', {
        body: {
          invoiceId: mainInvoiceId,
          receiptDate: '2026-10-29',
          paymentMethod: 'CASH',
          paymentCurrency: 'YER',
          amountDecimal: '500.00',
          reason: 'دفعة مقدمة 500',
        },
      });
      assert.equal(rcpRes.status, 201);
      mainReceiptId = (rcpRes.body.receipt as { receiptId: string }).receiptId;

      // Mandatory Installment Acceptance Test:
      // Total = 2300.00 (230000), Paid = 500.00 (50000), Remaining = 1800.00 (180000)
      // Over 24 months => 75.00 (7500) per month across 24 lines, zero double deduction!
      const schRes = await cashier.request('POST', '/api/v1/installments', {
        body: {
          invoiceId: mainInvoiceId,
          monthsCount: 24,
          startDueDate: '2026-11-30',
          notes: 'تقسيط المتبقي على 24 شهراً',
        },
      });
      assert.equal(schRes.status, 201);
      const sch = schRes.body.schedule as {
        invoiceNetMinor: string;
        paidAtCreationMinor: string;
        financedRemainingMinor: string;
        currentInvoiceRemainingMinor: string;
        lines: { installmentNo: number; amountMinor: string; remainingMinor: string }[];
      };
      assert.equal(sch.invoiceNetMinor, '230000');
      assert.equal(sch.paidAtCreationMinor, '50000');
      assert.equal(sch.financedRemainingMinor, '180000');
      assert.equal(sch.currentInvoiceRemainingMinor, '180000');
      assert.equal(sch.lines.length, 24);
      let sumLines = 0n;
      for (const line of sch.lines) {
        assert.equal(line.amountMinor, '7500');
        assert.equal(line.remainingMinor, '7500');
        sumLines += BigInt(line.amountMinor);
      }
      assert.equal(sumLines, 180000n);

      // Official Printables: 1st print = ORIGINAL, 2nd print = REPRINT COPY (#2)
      const p1 = await cashier.request('GET', `/print/invoice/${mainInvoiceId}?lang=en`);
      assert.equal(p1.status, 200);
      assert.ok(p1.text.includes('ORIGINAL'));

      const p2 = await cashier.request('GET', `/print/invoice/${mainInvoiceId}?lang=en`);
      assert.equal(p2.status, 200);
      assert.ok(p2.text.includes('REPRINT COPY (#2)'));

      const rcpPrint = await cashier.request('GET', `/print/receipt/${mainReceiptId}?lang=ar`);
      assert.equal(rcpPrint.status, 200);
      assert.ok(rcpPrint.text.includes('105mm 148mm'));

      const stmPrint = await cashier.request('GET', `/print/statement/${mainPatientId}?lang=ar`);
      assert.equal(stmPrint.status, 200);
      assert.ok(stmPrint.text.includes('كشف حساب المريض واتفاقية الأقساط الرسمية'));
    });

    await t.test('T-04: Live Doctor Scope (`own` vs `authorized`) & Immediate Server-Side Module Hiding without Stale Session Reliance', async () => {
      // drBeta is NOT authorized for #7006 yet -> 403 across view, appointment hijack, visit hijack, print, attachment
      assert.equal((await drBeta.request('GET', `/api/v1/patients/${mainPatientId}`)).status, 403);
      assert.equal(
        (
          await drBeta.request('POST', '/api/v1/appointments', {
            body: {
              patientId: mainPatientId,
              doctorUserId: drBetaId,
              appointmentDate: '2026-10-29',
              startTime: '14:00',
              chairNo: 2,
              kind: 'CONSULTATION',
            },
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await drBeta.request('POST', '/api/v1/visits', {
            body: {
              patientId: mainPatientId,
              visitDate: '2026-10-29',
              kind: 'FOLLOW_UP',
              chiefComplaint: 'Unauthorized visit attempt',
              acknowledgeMedicalAlerts: true,
            },
          })
        ).status,
        403,
      );
      assert.equal((await drBeta.request('GET', `/api/v1/attachments/${mainAttachmentId}`)).status, 403);

      // Owner grants REFERRAL to drBeta -> drBeta (same session!) immediately gains access because scope='authorized'
      const grantRes = await owner.request('POST', `/api/v1/patients/${mainPatientId}/grants`, {
        body: {
          doctorUserId: drBetaId,
          grantKind: 'REFERRAL',
          reason: 'تحويل استشارة عصب للدكتور سامي',
        },
      });
      assert.equal(grantRes.status, 201);
      assert.equal((await drBeta.request('GET', `/api/v1/patients/${mainPatientId}`)).status, 200);

      // Now Owner narrows drBeta's scope from 'authorized' -> 'own' in /admin!
      const ov1 = await owner.request('GET', '/api/v1/admin/overview');
      const drBetaRow = (ov1.body.staff as { userId: string; version: number }[]).find(
        s => s.userId === drBetaId,
      )!;
      const scopePatch = await owner.request('PATCH', `/api/v1/admin/staff/${drBetaId}`, {
        body: {
          expectedVersion: drBetaRow.version,
          doctorPatientScope: 'own',
          reason: 'حصر نطاق الطبيب بمرضاه الأساسيين فقط',
        },
      });
      assert.equal(scopePatch.status, 200);

      // WITHOUT drBeta logging out, the very next request is immediately blocked 403!
      assert.equal((await drBeta.request('GET', `/api/v1/patients/${mainPatientId}`)).status, 403);

      // Now test server-side Module Hiding on cashier's active session!
      assert.equal(
        (await cashier.request('GET', `/api/v1/patients/${mainPatientId}/statement`)).status,
        200,
      );
      assert.equal(
        (await cashier.request('GET', `/api/v1/patients/${mainPatientId}/statement/export`)).status,
        200,
      );

      const cashierRow = (ov1.body.staff as { userId: string; version: number }[]).find(
        s => s.userId === cashierId,
      )!;
      const hideBilling = await owner.request('PATCH', `/api/v1/admin/staff/${cashierId}`, {
        body: {
          expectedVersion: cashierRow.version,
          hiddenModules: ['billing'],
          reason: 'إخفاء وحدة الفوترة مؤقتاً للمراجعة',
        },
      });
      assert.equal(hideBilling.status, 200);

      // Immediately enforced across API, Export, and Print on cashier's existing cookie!
      const deniedStm = await cashier.request('GET', `/api/v1/patients/${mainPatientId}/statement`);
      assert.equal(deniedStm.status, 403);
      assert.equal(deniedStm.body.code, 'MODULE_HIDDEN');
      assert.equal(
        (await cashier.request('GET', `/api/v1/patients/${mainPatientId}/statement/export`)).status,
        403,
      );
      assert.equal((await cashier.request('GET', `/print/invoice/${mainInvoiceId}`)).status, 403);
      assert.equal((await cashier.request('GET', `/print/receipt/${mainReceiptId}`)).status, 403);

      // Restore cashier's billing visibility for subsequent journeys
      const unhideBilling = await owner.request('PATCH', `/api/v1/admin/staff/${cashierId}`, {
        body: {
          expectedVersion: cashierRow.version + 1,
          hiddenModules: [],
          reason: 'إعادة تفعيل وحدة الفوترة للمحاسب',
        },
      });
      assert.equal(unhideBilling.status, 200);
      assert.equal(
        (await cashier.request('GET', `/api/v1/patients/${mainPatientId}/statement`)).status,
        200,
      );
    });

    await t.test('T-05: Full End-to-End Journeys After Modifying Each Impactful Operational Setting', async () => {
      const getSettingsWrap = async () => {
        const ov = await owner.request('GET', '/api/v1/admin/overview');
        return ov.body.settings as { version: number; settings: Record<string, any> };
      };

      // 1) Schedule, Closed Friday, Chair Capacity (1 chair), and Doctor Leave
      let sw = await getSettingsWrap();
      const s1 = structuredClone(sw.settings);
      s1.schedule.dayStart = '09:00';
      s1.schedule.dayEnd = '17:00';
      s1.schedule.closedWeekdays = [5]; // Friday
      s1.schedule.chairsCount = 1;
      const up1 = await owner.request('PATCH', '/api/v1/admin/settings', {
        body: { expectedVersion: sw.version, settings: s1, reason: 'تحديث الدوام وعدد الكراسي إلى 1' },
      });
      assert.equal(up1.status, 200);

      // Friday 2026-10-30 -> CLINIC_CLOSED_DAY
      const friAppt = await reception.request('POST', '/api/v1/appointments', {
        body: {
          patientId: mainPatientId,
          doctorUserId: drAlphaId,
          appointmentDate: '2026-10-30',
          startTime: '10:00',
          chairNo: 1,
          kind: 'FOLLOW_UP',
        },
      });
      assert.equal(friAppt.status, 409);
      assert.equal(friAppt.body.code, 'CLINIC_CLOSED_DAY');

      // Saturday 2026-10-31 at 08:30 (outside 09:00-17:00) -> OUTSIDE_WORKING_HOURS
      const earlyAppt = await reception.request('POST', '/api/v1/appointments', {
        body: {
          patientId: mainPatientId,
          doctorUserId: drAlphaId,
          appointmentDate: '2026-10-31',
          startTime: '08:30',
          chairNo: 1,
          kind: 'FOLLOW_UP',
        },
      });
      assert.equal(earlyAppt.status, 409);
      assert.equal(earlyAppt.body.code, 'OUTSIDE_WORKING_HOURS');

      // Chair 2 when chairsCount=1 -> CHAIR_CAPACITY_FULL
      const chair2Appt = await reception.request('POST', '/api/v1/appointments', {
        body: {
          patientId: mainPatientId,
          doctorUserId: drAlphaId,
          appointmentDate: '2026-10-31',
          startTime: '11:00',
          chairNo: 2,
          kind: 'FOLLOW_UP',
        },
      });
      assert.equal(chair2Appt.status, 409);
      assert.equal(chair2Appt.body.code, 'CHAIR_CAPACITY_FULL');

      // Valid Saturday 11:00 Chair 1 -> 201
      const okSatAppt = await reception.request('POST', '/api/v1/appointments', {
        body: {
          patientId: mainPatientId,
          doctorUserId: drAlphaId,
          appointmentDate: '2026-10-31',
          startTime: '11:00',
          chairNo: 1,
          kind: 'FOLLOW_UP',
        },
      });
      assert.equal(okSatAppt.status, 201);

      // Doctor Leave on 2026-11-02 -> DOCTOR_ON_LEAVE
      const lvRes = await owner.request('POST', '/api/v1/doctor-leaves', {
        body: {
          doctorUserId: drAlphaId,
          startDate: '2026-11-02',
          endDate: '2026-11-02',
          reason: 'إجازة مؤتمر علمي',
        },
      });
      assert.equal(lvRes.status, 201);
      const leaveBlocked = await reception.request('POST', '/api/v1/appointments', {
        body: {
          patientId: mainPatientId,
          doctorUserId: drAlphaId,
          appointmentDate: '2026-11-02',
          startTime: '11:00',
          chairNo: 1,
          kind: 'FOLLOW_UP',
        },
      });
      assert.equal(leaveBlocked.status, 409);
      assert.equal(leaveBlocked.body.code, 'DOCTOR_ON_LEAVE');

      // 2) Governed FX Rate Journey (historical immutability + live rate on new receipts)
      sw = await getSettingsWrap();
      const s2 = structuredClone(sw.settings);
      s2.finance.fxRates.USD_TO_YER = { numerator: '550', denominator: '1' };
      await owner.request('PATCH', '/api/v1/admin/settings', {
        body: { expectedVersion: sw.version, settings: s2, reason: 'تحديث سعر صرف الدولار إلى 550' },
      });

      const fxInvRes = await cashier.request('POST', '/api/v1/invoices', {
        body: {
          patientId: mainPatientId,
          issuedDate: '2026-10-29',
          currency: 'YER',
          manualLines: [
            { descriptionAr: 'تنظيف وتلميع', descriptionEn: 'Scaling & Polishing', unitPriceDecimal: '1150.00' },
          ],
        },
      });
      assert.equal(fxInvRes.status, 201);
      const fxInvId = (fxInvRes.body.invoice as { invoiceId: string }).invoiceId;

      const fxRcp1 = await cashier.request('POST', '/api/v1/receipts', {
        body: {
          invoiceId: fxInvId,
          receiptDate: '2026-10-29',
          paymentMethod: 'CASH',
          paymentCurrency: 'USD',
          amountDecimal: '1.00',
          reason: 'سداد 1 دولار بسعر 550',
        },
      });
      assert.equal(fxRcp1.status, 201);
      const rcp1Id = (fxRcp1.body.receipt as { receiptId: string; allocatedInvoiceMinor: string }).receiptId;
      assert.equal((fxRcp1.body.receipt as { allocatedInvoiceMinor: string }).allocatedInvoiceMinor, '55000');

      // Change USD_TO_YER to 600 -> historical rcp1 MUST stay 55000, while new 1.00 USD = 60000!
      sw = await getSettingsWrap();
      const s3 = structuredClone(sw.settings);
      s3.finance.fxRates.USD_TO_YER = { numerator: '600', denominator: '1' };
      await owner.request('PATCH', '/api/v1/admin/settings', {
        body: { expectedVersion: sw.version, settings: s3, reason: 'تحديث سعر صرف الدولار إلى 600' },
      });

      const fxRcp2 = await cashier.request('POST', '/api/v1/receipts', {
        body: {
          invoiceId: fxInvId,
          receiptDate: '2026-10-29',
          paymentMethod: 'CASH',
          paymentCurrency: 'USD',
          amountDecimal: '1.00',
          reason: 'سداد 1 دولار بسعر 600 لإغلاق المتبقي 600',
        },
      });
      assert.equal(fxRcp2.status, 201);
      assert.equal((fxRcp2.body.receipt as { allocatedInvoiceMinor: string }).allocatedInvoiceMinor, '60000');

      const stmAfterFx = await cashier.request('GET', `/api/v1/patients/${mainPatientId}/statement`);
      const oldReceipt = (stmAfterFx.body.statement as { receipts: { receiptId: string; allocatedInvoiceMinor: string }[] })
        .receipts.find(r => r.receiptId === rcp1Id)!;
      assert.equal(oldReceipt.allocatedInvoiceMinor, '55000');

      // 3) External Lab Privacy (`CODE_ONLY` vs `FULL_NAME`) + Turnaround Days + Cost Redaction
      sw = await getSettingsWrap();
      const s4 = structuredClone(sw.settings);
      s4.lab.defaultTurnaroundDays = 7;
      s4.lab.externalPrivacyMode = 'CODE_ONLY';
      await owner.request('PATCH', '/api/v1/admin/settings', {
        body: { expectedVersion: sw.version, settings: s4, reason: 'ضبط خصوصية المعمل CODE_ONLY و7 أيام' },
      });

      const labRes = await drAlpha.request('POST', '/api/v1/lab-orders', {
        body: {
          patientId: mainPatientId,
          visitId: mainVisitId,
          labName: 'معمل الدقة الرقمية',
          workDescription: 'تاج زيركون #16',
          shade: 'A2',
          orderedDate: '2026-10-29',
          labCostDecimal: '150.00',
        },
      });
      assert.equal(labRes.status, 201);
      const labOrder = labRes.body.labOrder as { labOrderId: string; dueDate: string };
      assert.equal(labOrder.dueDate, '2026-11-05'); // 2026-10-29 + 7 days!

      const slipCodeOnly = await drAlpha.request('GET', `/print/lab/${labOrder.labOrderId}?lang=ar`);
      assert.equal(slipCodeOnly.status, 200);
      assert.ok(slipCodeOnly.text.includes('P-7006'));
      assert.ok(!slipCodeOnly.text.includes('عبدالله صالح التجريبي'));

      // Assistant (no billing.view) sees labCostMinor = null in patient workspace
      const asstWs = await assistant.request('GET', `/api/v1/patients/${mainPatientId}/workspace`);
      assert.equal(asstWs.status, 200);
      assert.equal((asstWs.body.labOrders as { labCostMinor: string | null }[])[0]?.labCostMinor, null);

      // Switch Lab Privacy to FULL_NAME -> print slip now shows full name!
      sw = await getSettingsWrap();
      const s5 = structuredClone(sw.settings);
      s5.lab.externalPrivacyMode = 'FULL_NAME';
      await owner.request('PATCH', '/api/v1/admin/settings', {
        body: { expectedVersion: sw.version, settings: s5, reason: 'تفعيل الاسم الكامل لأمر المعمل' },
      });
      const slipFullName = await drAlpha.request('GET', `/print/lab/${labOrder.labOrderId}?lang=ar`);
      assert.ok(slipFullName.text.includes('عبدالله صالح التجريبي'));

      // 4) Inventory Settings (`lowStockDefaultThreshold`, `requireVisitOnDispense`), UoM Lock & Non-Negative Floor
      sw = await getSettingsWrap();
      const s6 = structuredClone(sw.settings);
      s6.inventory.lowStockDefaultThreshold = 8;
      s6.inventory.requireVisitOnDispense = true;
      await owner.request('PATCH', '/api/v1/admin/settings', {
        body: { expectedVersion: sw.version, settings: s6, reason: 'ضبط حد تنبيه المخزون 8 وإلزام الزيارة' },
      });

      const itemRes = await owner.request('POST', '/api/v1/inventory/items', {
        body: { sku: 'ENDO-FILES-25', nameAr: 'مبارد عصب روتاري', nameEn: 'Rotary Endo Files', unitOfMeasure: 'PACK' },
      });
      assert.equal(itemRes.status, 201);
      const itemId = (itemRes.body.item as { itemId: string; lowStockThreshold: number }).itemId;
      assert.equal((itemRes.body.item as { lowStockThreshold: number }).lowStockThreshold, 8);

      // Dispense without visitId when requireVisitOnDispense=true -> 400
      assert.equal(
        (
          await drAlpha.request('POST', '/api/v1/inventory/movements', {
            body: { itemId, kind: 'VISIT_DISPENSE', quantity: 1, reason: 'بدون زيارة' },
          })
        ).status,
        400,
      );

      // Stock in 10 -> dispense 4 linked to mainVisitId -> resultingQty = 6 (lowStock = true <= 8)
      assert.equal(
        (
          await owner.request('POST', '/api/v1/inventory/movements', {
            body: { itemId, kind: 'STOCK_IN', quantity: 10, reason: 'توريد افتتاحي' },
          })
        ).status,
        201,
      );
      const dispOk = await drAlpha.request('POST', '/api/v1/inventory/movements', {
        body: { itemId, kind: 'VISIT_DISPENSE', quantity: 4, visitId: mainVisitId, reason: 'صرف جلسة عصب' },
      });
      assert.equal(dispOk.status, 201);
      assert.equal((dispOk.body.movement as { resultingQty: number; isLowStock: boolean }).resultingQty, 6);
      assert.equal((dispOk.body.movement as { isLowStock: boolean }).isLowStock, true);

      // UoM lock after first movement -> 409 UOM_LOCKED_AFTER_MOVEMENT
      const uomAttempt = await owner.request('PATCH', `/api/v1/inventory/items/${itemId}`, {
        body: { expectedVersion: 3, unitOfMeasure: 'BOX', reason: 'محاولة تغيير الوحدة بعد حركة' },
      });
      assert.equal(uomAttempt.status, 409);
      assert.equal(uomAttempt.body.code, 'UOM_LOCKED_AFTER_MOVEMENT');

      // Negative stock strictly forbidden -> 409 NEGATIVE_STOCK_FORBIDDEN
      const negAttempt = await drAlpha.request('POST', '/api/v1/inventory/movements', {
        body: { itemId, kind: 'VISIT_DISPENSE', quantity: 20, visitId: mainVisitId, reason: 'سحب فوق الرصيد' },
      });
      assert.equal(negAttempt.status, 409);
      assert.equal(negAttempt.body.code, 'NEGATIVE_STOCK_FORBIDDEN');

      // 5) Print Watermark Opacity & Header Phone + Comms Outbox Suppression
      sw = await getSettingsWrap();
      const s7 = structuredClone(sw.settings);
      s7.print.watermarkOpacity = 0.36;
      s7.print.clinicPhone = '+967-1-777111';
      s7.comms.outboxEnabled = false;
      await owner.request('PATCH', '/api/v1/admin/settings', {
        body: { expectedVersion: sw.version, settings: s7, reason: 'تحديث شفافية الشعار وإيقاف الإشعارات' },
      });

      const updatedPrint = await cashier.request('GET', `/print/invoice/${mainInvoiceId}?lang=ar`);
      assert.ok(updatedPrint.text.includes('--wm-opacity: 0.36'));
      assert.ok(updatedPrint.text.includes('+967-1-777111'));

      const suppressedAppt = await reception.request('POST', '/api/v1/appointments', {
        body: {
          patientId: mainPatientId,
          doctorUserId: drAlphaId,
          appointmentDate: '2026-10-31',
          startTime: '13:00',
          chairNo: 1,
          kind: 'FOLLOW_UP',
        },
      });
      assert.equal(suppressedAppt.status, 201);
      const ovAfter = await owner.request('GET', '/api/v1/admin/overview');
      const latestOutbox = (ovAfter.body.outbox as { status: string }[])[0];
      assert.equal(latestOutbox?.status, 'SUPPRESSED');
    });

    await t.test('T-06: Mid-tx rollback, lost COMMIT response idempotent replay, receipt reversal & invoice void', async () => {
      // 1) Mid-transaction failure before COMMIT rolls back completely without poisoning Idempotency-Key
      nextTxHook = {
        async onBeforeCommit() {
          throw new Error('SIMULATED_MID_TX_CRASH');
        },
      };
      const crashKey = 'idem-crash-then-retry-1';
      const failedReq = await cashier.request('POST', '/api/v1/invoices', {
        idemKey: crashKey,
        body: {
          patientId: mainPatientId,
          issuedDate: '2026-10-29',
          currency: 'YER',
          manualLines: [{ descriptionAr: 'فحص أشعة', descriptionEn: 'X-Ray Exam', unitPriceDecimal: '300.00' }],
        },
      });
      assert.equal(failedReq.status, 500);

      // Retry with the exact same key now succeeds cleanly (replayed: false because prior tx rolled back!)
      const retriedAfterRollback = await cashier.request('POST', '/api/v1/invoices', {
        idemKey: crashKey,
        body: {
          patientId: mainPatientId,
          issuedDate: '2026-10-29',
          currency: 'YER',
          manualLines: [{ descriptionAr: 'فحص أشعة', descriptionEn: 'X-Ray Exam', unitPriceDecimal: '300.00' }],
        },
      });
      assert.equal(retriedAfterRollback.status, 201);
      assert.equal(retriedAfterRollback.body.replayed, false);
      const tempInvId = (retriedAfterRollback.body.invoice as { invoiceId: string }).invoiceId;

      // 2) Lost COMMIT response (`onAfterCommit` throws after PostgreSQL committed!)
      nextTxHook = {
        async onAfterCommit() {
          throw new Error('SIMULATED_NETWORK_DROP_AFTER_COMMIT');
        },
      };
      const lostCommitKey = 'idem-lost-commit-rcp-1';
      const uncertainRes = await cashier.request('POST', '/api/v1/receipts', {
        idemKey: lostCommitKey,
        body: {
          invoiceId: tempInvId,
          receiptDate: '2026-10-29',
          paymentMethod: 'CASH',
          paymentCurrency: 'YER',
          amountDecimal: '100.00',
          reason: 'دفعة اختبار انقطاع الشبكة',
        },
      });
      assert.equal(uncertainRes.status, 503);
      assert.equal(uncertainRes.body.code, 'COMMIT_OUTCOME_UNKNOWN');

      // Client retries with the exact same Idempotency-Key -> replays committed receipt WITHOUT double-charging!
      const replayRes = await cashier.request('POST', '/api/v1/receipts', {
        idemKey: lostCommitKey,
        body: {
          invoiceId: tempInvId,
          receiptDate: '2026-10-29',
          paymentMethod: 'CASH',
          paymentCurrency: 'YER',
          amountDecimal: '100.00',
          reason: 'دفعة اختبار انقطاع الشبكة',
        },
      });
      assert.equal(replayRes.status, 201);
      assert.equal(replayRes.body.replayed, true);
      const tempRcpId = (replayRes.body.receipt as { receiptId: string }).receiptId;

      // Reusing same Idempotency-Key with different payload -> 409 IDEMPOTENCY_CONFLICT
      const conflictRes = await cashier.request('POST', '/api/v1/receipts', {
        idemKey: lostCommitKey,
        body: {
          invoiceId: tempInvId,
          receiptDate: '2026-10-29',
          paymentMethod: 'CASH',
          paymentCurrency: 'YER',
          amountDecimal: '150.00',
          reason: 'دفعة اختبار انقطاع الشبكة',
        },
      });
      assert.equal(conflictRes.status, 409);
      assert.equal(conflictRes.body.code, 'IDEMPOTENCY_CONFLICT');

      // 3) Create schedule on tempInvId, then Reverse receipt & Void invoice -> schedule cancelled cleanly!
      const tempSch = await cashier.request('POST', '/api/v1/installments', {
        body: { invoiceId: tempInvId, monthsCount: 2, startDueDate: '2026-11-30' },
      });
      assert.equal(tempSch.status, 201);

      // Cannot void invoice while paid_minor > 0
      assert.equal(
        (
          await owner.request('POST', `/api/v1/invoices/${tempInvId}/void`, {
            body: { expectedVersion: 2, reason: 'محاولة إلغاء قبل عكس السند' },
          })
        ).status,
        409,
      );

      // Reverse receipt (append-only REVERSAL)
      const revRes = await owner.request('POST', `/api/v1/receipts/${tempRcpId}/reverse`, {
        body: { reversalDate: '2026-10-29', reason: 'عكس السند لإلغاء الفاتورة التجريبية' },
      });
      assert.equal(revRes.status, 201);

      // Now Void invoice -> succeeds and cancels any active schedule
      const voidRes = await owner.request('POST', `/api/v1/invoices/${tempInvId}/void`, {
        body: { expectedVersion: 3, reason: 'إلغاء الفاتورة التجريبية بالكامل' },
      });
      assert.equal(voidRes.status, 200);
      assert.equal((voidRes.body.invoice as { status: string }).status, 'VOIDED');
    });

    await t.test('T-07: Consistent Backup & Isolated Restore to a New Database + Post-Restore Patient/Invoice/Receipt Creation', async () => {
      const backupRes = await owner.request('GET', '/api/v1/admin/backup');
      assert.equal(backupRes.status, 200);
      const bundle = backupRes.body as unknown as ClinicBackupBundle;
      assert.equal(bundle.formatVersion, 'aqlan-backup-v1');
      assert.equal(bundle.sequences.length, 4);
      assert.equal(bundle.attachments.length, 1);

      // Refuses to silently overwrite a non-empty database!
      await assert.rejects(
        restoreBackupToIsolatedDatabase(pool, bundle, attDirRestore),
        /non-empty database/i,
      );

      // Restore into brand-new isolated database `aqlan_restore_verify_test`
      const restorePool = new pg.Pool({ ...adminCfg, database: restoreDbName, max: 2 });
      const restoreServer = createClinicHttpServer({
        pool: restorePool,
        clinicId,
        attachmentsRootDir: attDirRestore,
        now: () => currentNow,
      });
      await new Promise<void>(resolve => restoreServer.listen(0, '127.0.0.1', resolve));
      const restorePort = (restoreServer.address() as AddressInfo).port;
      const restoreUrl = `http://127.0.0.1:${restorePort}`;

      try {
        const summary = await restoreBackupToIsolatedDatabase(restorePool, bundle, attDirRestore);
        assert.equal(summary.restoredAttachments, 1);

        // Sign in on the restored database using restored governance credentials
        const restoredOwner = makeClient(restoreUrl);
        assert.equal((await restoredOwner.login('owner', 'Owner-Synthetic-Pass-2026!')).status, 200);

        // Verify restored patient #7006 balance, 24 installments, and binary attachment integrity!
        const stmRestored = await restoredOwner.request('GET', `/api/v1/patients/${mainPatientId}/statement`);
        assert.equal(stmRestored.status, 200);
        const yerBucket = (
          stmRestored.body.statement as { currencyBuckets: { currency: string; outstandingMinor: string }[] }
        ).currencyBuckets.find(b => b.currency === 'YER')!;
        assert.equal(yerBucket.outstandingMinor, '180000');

        const attDl = await restoredOwner.request('GET', `/api/v1/attachments/${mainAttachmentId}`);
        assert.equal(attDl.status, 200);
        assert.equal(attDl.contentType, 'image/png');

        // Create a NEW patient, NEW invoice, and NEW receipt on the restored database to verify sequence continuity!
        const postRestorePat = await restoredOwner.request('POST', '/api/v1/patients', {
          body: {
            fullName: 'مريض جديد بعد الاسترجاع',
            phone: '777555111',
            sex: 'FEMALE',
            primaryDoctorUserId: drAlphaId,
          },
        });
        assert.equal(postRestorePat.status, 201);
        const newPat = postRestorePat.body.patient as { patientId: string; fileNumber: number };
        assert.ok(newPat.fileNumber >= 7051, `Expected sequence floor > 7050, got ${newPat.fileNumber}`);

        const postRestoreInv = await restoredOwner.request('POST', '/api/v1/invoices', {
          body: {
            patientId: newPat.patientId,
            issuedDate: '2026-10-29',
            currency: 'SAR',
            manualLines: [
              { descriptionAr: 'استشارة تقويم بعد الاسترجاع', descriptionEn: 'Post-Restore Consult', unitPriceDecimal: '250.00' },
            ],
          },
        });
        assert.equal(postRestoreInv.status, 201);
        const newInv = postRestoreInv.body.invoice as { invoiceId: string; invoiceNumber: number };
        assert.ok(newInv.invoiceNumber >= 1004);

        const postRestoreRcp = await restoredOwner.request('POST', '/api/v1/receipts', {
          body: {
            invoiceId: newInv.invoiceId,
            receiptDate: '2026-10-29',
            paymentMethod: 'CARD',
            paymentCurrency: 'SAR',
            amountDecimal: '250.00',
            reason: 'سداد كامل بعد الاسترجاع',
          },
        });
        assert.equal(postRestoreRcp.status, 201);
        assert.equal(
          (postRestoreRcp.body.receipt as { allocatedInvoiceMinor: string }).allocatedInvoiceMinor,
          '25000',
        );
      } finally {
        restoreServer.close();
        await restorePool.end();
      }
    });
  } finally {
    server.close();
    await pool.end();
    await adminPool.query(`DROP DATABASE IF EXISTS ${restoreDbName}`);
    await adminPool.end();
    await rm(attDirMain, { recursive: true, force: true });
    await rm(attDirRestore, { recursive: true, force: true });
  }
});
