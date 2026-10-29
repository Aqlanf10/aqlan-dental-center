import type { DbExecutor } from '../../platform/db.ts';
import {
  constantTimeStringEqual,
  generateOpaqueToken,
  hashPassword,
  newEntityId,
  sha256Hex,
  verifyPassword,
} from '../../platform/crypto.ts';
import { assertValidTimeZone } from '../../platform/clock.ts';
import { failApp } from '../../platform/errors.ts';
import { currency, units } from '../../finance/money.ts';
import type { Currency } from '../../finance/types.ts';

export const APP_MODULES = Object.freeze([
  'patients',
  'appointments',
  'clinical',
  'billing',
  'lab',
  'inventory',
  'reports',
  'governance',
] as const);

export type AppModule = (typeof APP_MODULES)[number];

export const PERMISSION_ACTIONS = Object.freeze([
  'view',
  'create',
  'edit',
  'approve',
  'cancel',
  'export',
] as const);

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const STAFF_ROLES = Object.freeze([
  'OWNER',
  'MANAGER',
  'DOCTOR',
  'RECEPTION',
  'CASHIER',
  'ASSISTANT',
] as const);

export type StaffRole = (typeof STAFF_ROLES)[number];
export type DoctorPatientScope = 'own' | 'authorized';

export type ModulePermissionFlags = Readonly<Record<PermissionAction, boolean>>;
export type PermissionMatrix = Readonly<Record<AppModule, ModulePermissionFlags>>;

export interface AuthenticatedActor {
  readonly sessionId: string;
  readonly csrfToken: string;
  readonly clinicId: string;
  readonly userId: string;
  readonly personId: string;
  readonly username: string;
  readonly displayName: string;
  readonly role: StaffRole;
  readonly isPrimaryOwner: boolean;
  readonly isActive: boolean;
  readonly doctorPatientScope: DoctorPatientScope;
  readonly hiddenModules: readonly AppModule[];
  readonly permissions: PermissionMatrix;
  readonly preferredLanguage: 'ar' | 'en' | null;
  readonly authorityVersion: number;
}

export interface FxRatePair {
  readonly numerator: string;
  readonly denominator: string;
}

export interface ClinicOperationalSettings {
  readonly schedule: {
    readonly timezone: string;
    readonly dayStart: string;
    readonly dayEnd: string;
    readonly closedWeekdays: readonly number[];
    readonly chairsCount: number;
    readonly defaultSlotMinutes: number;
  };
  readonly finance: {
    readonly defaultCurrency: Currency;
    readonly fxRates: {
      readonly SAR_TO_YER: FxRatePair;
      readonly USD_TO_YER: FxRatePair;
      readonly USD_TO_SAR: FxRatePair;
    };
  };
  readonly lab: {
    readonly defaultTurnaroundDays: number;
    readonly externalPrivacyMode: 'CODE_ONLY' | 'FULL_NAME';
  };
  readonly inventory: {
    readonly lowStockDefaultThreshold: number;
    readonly requireVisitOnDispense: boolean;
  };
  readonly print: {
    readonly defaultLanguage: 'ar' | 'en';
    readonly clinicTitleAr: string;
    readonly clinicTitleEn: string;
    readonly clinicPhone: string;
    readonly clinicAddressAr: string;
    readonly clinicAddressEn: string;
    readonly watermarkOpacity: number;
  };
  readonly comms: {
    readonly outboxEnabled: boolean;
    readonly defaultChannel: 'WHATSAPP_SIMULATED' | 'SMS_SIMULATED' | 'INTERNAL_LOG';
  };
}

export const NON_BYPASSABLE_INVARIANTS = Object.freeze({
  appendOnlyApprovedLedger: true,
  forbidNegativeInventoryBalance: true,
  enforceServerSideModuleVisibility: true,
  patientPortalDisabledInSlice1: true,
});

function flags(
  view = false,
  create = false,
  edit = false,
  approve = false,
  cancel = false,
  exportData = false,
): ModulePermissionFlags {
  return Object.freeze({ view, create, edit, approve, cancel, export: exportData });
}

export function defaultRolePermissions(role: StaffRole): PermissionMatrix {
  switch (role) {
    case 'OWNER':
      return Object.freeze({
        patients: flags(true, true, true, true, true, true),
        appointments: flags(true, true, true, true, true, true),
        clinical: flags(true, true, true, true, true, true),
        billing: flags(true, true, true, true, true, true),
        lab: flags(true, true, true, true, true, true),
        inventory: flags(true, true, true, true, true, true),
        reports: flags(true, true, true, true, true, true),
        governance: flags(true, true, true, true, true, true),
      });
    case 'MANAGER':
      return Object.freeze({
        patients: flags(true, true, true, true, true, true),
        appointments: flags(true, true, true, true, true, true),
        clinical: flags(true, false, false, false, false, false),
        billing: flags(true, true, true, true, true, true),
        lab: flags(true, true, true, true, true, false),
        inventory: flags(true, true, true, true, true, true),
        reports: flags(true, false, false, false, false, true),
        governance: flags(true, false, false, false, false, false),
      });
    case 'DOCTOR':
      return Object.freeze({
        patients: flags(true, false, true, false, false, false),
        appointments: flags(true, true, true, false, true, false),
        clinical: flags(true, true, true, true, false, false),
        billing: flags(true, false, false, false, false, false),
        lab: flags(true, true, true, false, false, false),
        inventory: flags(true, true, false, false, false, false),
        reports: flags(false, false, false, false, false, false),
        governance: flags(false, false, false, false, false, false),
      });
    case 'RECEPTION':
      return Object.freeze({
        patients: flags(true, true, true, false, false, false),
        appointments: flags(true, true, true, false, true, false),
        clinical: flags(false, false, false, false, false, false),
        billing: flags(true, true, false, false, false, false),
        lab: flags(true, false, false, false, false, false),
        inventory: flags(false, false, false, false, false, false),
        reports: flags(false, false, false, false, false, false),
        governance: flags(false, false, false, false, false, false),
      });
    case 'CASHIER':
      return Object.freeze({
        patients: flags(true, false, false, false, false, false),
        appointments: flags(true, false, false, false, false, false),
        clinical: flags(false, false, false, false, false, false),
        billing: flags(true, true, true, true, false, true),
        lab: flags(false, false, false, false, false, false),
        inventory: flags(false, false, false, false, false, false),
        reports: flags(true, false, false, false, false, true),
        governance: flags(false, false, false, false, false, false),
      });
    case 'ASSISTANT':
      return Object.freeze({
        patients: flags(true, false, false, false, false, false),
        appointments: flags(true, false, true, false, false, false),
        clinical: flags(true, false, false, false, false, false),
        billing: flags(false, false, false, false, false, false),
        lab: flags(true, true, false, false, false, false),
        inventory: flags(true, true, false, false, false, false),
        reports: flags(false, false, false, false, false, false),
        governance: flags(false, false, false, false, false, false),
      });
  }
}

export function defaultClinicOperationalSettings(): ClinicOperationalSettings {
  return Object.freeze({
    schedule: {
      timezone: 'Asia/Aden',
      dayStart: '08:30',
      dayEnd: '20:30',
      closedWeekdays: [5],
      chairsCount: 4,
      defaultSlotMinutes: 30,
    },
    finance: {
      defaultCurrency: 'YER' as const,
      fxRates: {
        SAR_TO_YER: { numerator: '140', denominator: '1' },
        USD_TO_YER: { numerator: '530', denominator: '1' },
        USD_TO_SAR: { numerator: '375', denominator: '100' },
      },
    },
    lab: {
      defaultTurnaroundDays: 5,
      externalPrivacyMode: 'CODE_ONLY' as const,
    },
    inventory: {
      lowStockDefaultThreshold: 5,
      requireVisitOnDispense: true,
    },
    print: {
      defaultLanguage: 'ar' as const,
      clinicTitleAr: 'مركز الدكتور عقلان الكامل لطب وتقويم الأسنان',
      clinicTitleEn: 'Dr. Aqlan Al-Kamel Dental & Orthodontic Center',
      clinicPhone: '+967-1-000000',
      clinicAddressAr: 'صنعاء - الجمهورية اليمنية',
      clinicAddressEn: 'Sanaa - Republic of Yemen',
      watermarkOpacity: 0.22,
    },
    comms: {
      outboxEnabled: true,
      defaultChannel: 'WHATSAPP_SIMULATED' as const,
    },
  });
}

export function validatePermissionMatrix(raw: unknown): PermissionMatrix {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    failApp('INVALID_INPUT', 400, 'Invalid permissions matrix');
  }
  const src = raw as Record<string, unknown>;
  const result: Record<string, ModulePermissionFlags> = {};
  for (const mod of APP_MODULES) {
    const modRaw = src[mod];
    if (!modRaw || typeof modRaw !== 'object' || Array.isArray(modRaw)) {
      failApp('INVALID_INPUT', 400, `Missing permissions for module ${mod}`);
    }
    const modRec = modRaw as Record<string, unknown>;
    const built: Record<string, boolean> = {};
    for (const act of PERMISSION_ACTIONS) {
      if (typeof modRec[act] !== 'boolean') {
        failApp('INVALID_INPUT', 400, `Permission ${mod}.${act} must be boolean`);
      }
      built[act] = modRec[act];
    }
    result[mod] = Object.freeze(built as unknown as ModulePermissionFlags);
  }
  return Object.freeze(result as unknown as PermissionMatrix);
}

export function validateHiddenModules(raw: unknown): readonly AppModule[] {
  if (!Array.isArray(raw)) {
    failApp('INVALID_INPUT', 400, 'hiddenModules must be an array');
  }
  const unique = new Set<AppModule>();
  for (const item of raw) {
    if (typeof item !== 'string' || !(APP_MODULES as readonly string[]).includes(item)) {
      failApp('INVALID_INPUT', 400, 'Invalid module name in hiddenModules');
    }
    unique.add(item as AppModule);
  }
  return Object.freeze([...unique]);
}

function validateFxPair(raw: unknown, label: string): FxRatePair {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    failApp('INVALID_INPUT', 400, `Invalid FX rate pair: ${label}`);
  }
  const rec = raw as Record<string, unknown>;
  try {
    const num = units(rec.numerator, { positive: true });
    const den = units(rec.denominator, { positive: true });
    return Object.freeze({ numerator: num.toString(), denominator: den.toString() });
  } catch {
    failApp('INVALID_INPUT', 400, `FX rate ${label} requires positive integer strings`);
  }
}

export function validateOperationalSettings(raw: unknown): ClinicOperationalSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    failApp('INVALID_INPUT', 400, 'Settings object required');
  }
  const r = raw as Record<string, unknown>;
  // Reject any attempt to sneak invariant-bypass keys into settings
  const allowedTop = new Set(['schedule', 'finance', 'lab', 'inventory', 'print', 'comms']);
  for (const k of Object.keys(r)) {
    if (!allowedTop.has(k)) {
      failApp('INVALID_INPUT', 400, `Unsupported or forbidden setting group: ${k}`);
    }
  }

  const sched = r.schedule as Record<string, unknown> | undefined;
  const fin = r.finance as Record<string, unknown> | undefined;
  const lab = r.lab as Record<string, unknown> | undefined;
  const inv = r.inventory as Record<string, unknown> | undefined;
  const prt = r.print as Record<string, unknown> | undefined;
  const cms = r.comms as Record<string, unknown> | undefined;
  if (!sched || !fin || !lab || !inv || !prt || !cms) {
    failApp('INVALID_INPUT', 400, 'All 6 operational setting groups are required');
  }

  const timezone = assertValidTimeZone(String(sched.timezone ?? ''));
  const dayStart = String(sched.dayStart ?? '');
  const dayEnd = String(sched.dayEnd ?? '');
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(dayStart) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(dayEnd)) {
    failApp('INVALID_INPUT', 400, 'Invalid HH:MM working hours');
  }
  const startMin = Number(dayStart.slice(0, 2)) * 60 + Number(dayStart.slice(3, 5));
  const endMin = Number(dayEnd.slice(0, 2)) * 60 + Number(dayEnd.slice(3, 5));
  if (endMin <= startMin + 30) {
    failApp('INVALID_INPUT', 400, 'dayEnd must be at least 30 minutes after dayStart');
  }
  if (!Array.isArray(sched.closedWeekdays) || sched.closedWeekdays.length > 6) {
    failApp('INVALID_INPUT', 400, 'Invalid closedWeekdays');
  }
  const closedSet = new Set<number>();
  for (const d of sched.closedWeekdays) {
    if (typeof d !== 'number' || !Number.isInteger(d) || d < 0 || d > 6) {
      failApp('INVALID_INPUT', 400, 'Weekday index must be 0..6');
    }
    closedSet.add(d);
  }
  const chairsCount = Number(sched.chairsCount);
  if (!Number.isInteger(chairsCount) || chairsCount < 1 || chairsCount > 20) {
    failApp('INVALID_INPUT', 400, 'chairsCount must be 1..20');
  }
  const defaultSlotMinutes = Number(sched.defaultSlotMinutes);
  if (!Number.isInteger(defaultSlotMinutes) || defaultSlotMinutes < 10 || defaultSlotMinutes > 180) {
    failApp('INVALID_INPUT', 400, 'defaultSlotMinutes must be 10..180');
  }

  let defaultCurrency: Currency;
  try {
    defaultCurrency = currency(fin.defaultCurrency);
  } catch {
    failApp('INVALID_INPUT', 400, 'Unsupported defaultCurrency');
  }
  const fxObj = fin.fxRates as Record<string, unknown> | undefined;
  if (!fxObj || typeof fxObj !== 'object') {
    failApp('INVALID_INPUT', 400, 'fxRates object required');
  }
  const fxRates = {
    SAR_TO_YER: validateFxPair(fxObj.SAR_TO_YER, 'SAR_TO_YER'),
    USD_TO_YER: validateFxPair(fxObj.USD_TO_YER, 'USD_TO_YER'),
    USD_TO_SAR: validateFxPair(fxObj.USD_TO_SAR, 'USD_TO_SAR'),
  };

  const defaultTurnaroundDays = Number(lab.defaultTurnaroundDays);
  if (!Number.isInteger(defaultTurnaroundDays) || defaultTurnaroundDays < 1 || defaultTurnaroundDays > 60) {
    failApp('INVALID_INPUT', 400, 'lab.defaultTurnaroundDays must be 1..60');
  }
  if (lab.externalPrivacyMode !== 'CODE_ONLY' && lab.externalPrivacyMode !== 'FULL_NAME') {
    failApp('INVALID_INPUT', 400, 'lab.externalPrivacyMode must be CODE_ONLY or FULL_NAME');
  }

  // Strictly forbid any setting attempting to allow negative stock
  if ('allowNegativeStock' in inv || 'preventNegativeStock' in inv && inv.preventNegativeStock === false) {
    failApp('INVALID_INPUT', 400, 'Inventory accounting integrity cannot be disabled via settings');
  }
  const lowStockDefaultThreshold = Number(inv.lowStockDefaultThreshold);
  if (!Number.isInteger(lowStockDefaultThreshold) || lowStockDefaultThreshold < 0 || lowStockDefaultThreshold > 1000) {
    failApp('INVALID_INPUT', 400, 'inventory.lowStockDefaultThreshold must be 0..1000');
  }
  if (typeof inv.requireVisitOnDispense !== 'boolean') {
    failApp('INVALID_INPUT', 400, 'inventory.requireVisitOnDispense must be boolean');
  }

  if (prt.defaultLanguage !== 'ar' && prt.defaultLanguage !== 'en') {
    failApp('INVALID_INPUT', 400, 'print.defaultLanguage must be ar or en');
  }
  const nonEmptyText = (v: unknown, name: string): string => {
    if (typeof v !== 'string' || !v.trim() || v.length > 160) {
      failApp('INVALID_INPUT', 400, `Invalid ${name}`);
    }
    return v.trim();
  };
  const watermarkOpacity = Number(prt.watermarkOpacity);
  if (!Number.isFinite(watermarkOpacity) || watermarkOpacity < 0.05 || watermarkOpacity > 0.45) {
    failApp('INVALID_INPUT', 400, 'print.watermarkOpacity must be between 0.05 and 0.45');
  }

  if (typeof cms.outboxEnabled !== 'boolean') {
    failApp('INVALID_INPUT', 400, 'comms.outboxEnabled must be boolean');
  }
  if (
    cms.defaultChannel !== 'WHATSAPP_SIMULATED' &&
    cms.defaultChannel !== 'SMS_SIMULATED' &&
    cms.defaultChannel !== 'INTERNAL_LOG'
  ) {
    failApp('INVALID_INPUT', 400, 'Invalid comms.defaultChannel');
  }

  return Object.freeze({
    schedule: Object.freeze({
      timezone,
      dayStart,
      dayEnd,
      closedWeekdays: Object.freeze([...closedSet].sort((a, b) => a - b)),
      chairsCount,
      defaultSlotMinutes,
    }),
    finance: Object.freeze({
      defaultCurrency,
      fxRates: Object.freeze(fxRates),
    }),
    lab: Object.freeze({
      defaultTurnaroundDays,
      externalPrivacyMode: lab.externalPrivacyMode,
    }),
    inventory: Object.freeze({
      lowStockDefaultThreshold,
      requireVisitOnDispense: inv.requireVisitOnDispense,
    }),
    print: Object.freeze({
      defaultLanguage: prt.defaultLanguage,
      clinicTitleAr: nonEmptyText(prt.clinicTitleAr, 'clinicTitleAr'),
      clinicTitleEn: nonEmptyText(prt.clinicTitleEn, 'clinicTitleEn'),
      clinicPhone: nonEmptyText(prt.clinicPhone, 'clinicPhone'),
      clinicAddressAr: nonEmptyText(prt.clinicAddressAr, 'clinicAddressAr'),
      clinicAddressEn: nonEmptyText(prt.clinicAddressEn, 'clinicAddressEn'),
      watermarkOpacity: Math.round(watermarkOpacity * 100) / 100,
    }),
    comms: Object.freeze({
      outboxEnabled: cms.outboxEnabled,
      defaultChannel: cms.defaultChannel,
    }),
  });
}

export function assertModulePermission(
  actor: AuthenticatedActor,
  module: AppModule,
  action: PermissionAction,
): void {
  if (!actor.isActive) {
    failApp('UNAUTHENTICATED', 401);
  }
  if (actor.hiddenModules.includes(module)) {
    failApp('MODULE_HIDDEN', 403, `Module ${module} is hidden for user ${actor.userId}`);
  }
  const modFlags = actor.permissions[module];
  if (!modFlags || !modFlags[action]) {
    failApp('ACCESS_DENIED', 403, `Missing permission ${module}.${action} for user ${actor.userId}`);
  }
}

export function assertCsrfToken(actor: AuthenticatedActor, candidate: unknown): void {
  if (typeof candidate !== 'string' || !candidate || !constantTimeStringEqual(actor.csrfToken, candidate)) {
    failApp('ACCESS_DENIED', 403, 'CSRF token mismatch');
  }
}

export interface AuditEventInput {
  readonly clinicId: string;
  readonly actorUserId: string;
  readonly category: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly reason: string;
  readonly beforeSnapshot?: unknown;
  readonly afterSnapshot?: unknown;
}

export async function recordAuditEvent(tx: DbExecutor, input: AuditEventInput): Promise<string> {
  if (typeof input.reason !== 'string' || !input.reason.trim()) {
    failApp('INVALID_INPUT', 400, 'Audit reason is required');
  }
  const auditId = newEntityId('aud');
  await tx.query(
    `INSERT INTO app_audit_events
       (audit_id, clinic_id, actor_user_id, category, action, entity_type, entity_id, reason, before_snapshot, after_snapshot)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)`,
    [
      auditId,
      input.clinicId,
      input.actorUserId,
      input.category,
      input.action,
      input.entityType,
      input.entityId,
      input.reason.trim(),
      input.beforeSnapshot === undefined ? null : JSON.stringify(input.beforeSnapshot),
      input.afterSnapshot === undefined ? null : JSON.stringify(input.afterSnapshot),
    ],
  );
  return auditId;
}

export interface BootstrapSeedInput {
  readonly clinicId: string;
  readonly ownerUsername: string;
  readonly ownerDisplayName: string;
  readonly ownerPassword: string;
}

export async function ensureClinicBootstrap(
  tx: DbExecutor,
  seed: BootstrapSeedInput,
): Promise<{ clinicId: string; ownerUserId: string; created: boolean }> {
  const existing = await tx.query<{ user_id: string }>(
    `SELECT user_id FROM app_staff_users WHERE clinic_id = $1 AND is_primary_owner = TRUE`,
    [seed.clinicId],
  );
  if (existing.rows[0] !== undefined) {
    return { clinicId: seed.clinicId, ownerUserId: existing.rows[0].user_id, created: false };
  }

  const defaults = defaultClinicOperationalSettings();
  await tx.query(
    `INSERT INTO app_clinics (clinic_id, name_ar, name_en)
     VALUES ($1, $2, $3)
     ON CONFLICT (clinic_id) DO NOTHING`,
    [seed.clinicId, defaults.print.clinicTitleAr, defaults.print.clinicTitleEn],
  );

  const personId = newEntityId('per');
  const ownerUserId = newEntityId('usr');
  const passwordHash = await hashPassword(seed.ownerPassword);
  const ownerPerms = defaultRolePermissions('OWNER');

  await tx.query(
    `INSERT INTO app_persons (person_id, clinic_id, full_name) VALUES ($1, $2, $3)`,
    [personId, seed.clinicId, seed.ownerDisplayName],
  );

  await tx.query(
    `INSERT INTO app_staff_users
       (user_id, clinic_id, person_id, username, display_name, role, is_primary_owner, is_active,
        password_hash, doctor_patient_scope, hidden_modules, permissions, preferred_language)
     VALUES ($1, $2, $3, $4, $5, 'OWNER', TRUE, TRUE, $6, 'authorized', '[]'::jsonb, $7::jsonb, 'ar')`,
    [
      ownerUserId,
      seed.clinicId,
      personId,
      seed.ownerUsername.trim().toLowerCase(),
      seed.ownerDisplayName.trim(),
      passwordHash,
      JSON.stringify(ownerPerms),
    ],
  );

  await tx.query(
    `INSERT INTO app_clinic_settings (clinic_id, version, settings, updated_by)
     VALUES ($1, 1, $2::jsonb, $3)
     ON CONFLICT (clinic_id) DO NOTHING`,
    [seed.clinicId, JSON.stringify(defaults), ownerUserId],
  );

  await recordAuditEvent(tx, {
    clinicId: seed.clinicId,
    actorUserId: ownerUserId,
    category: 'GOVERNANCE',
    action: 'CLINIC_BOOTSTRAP',
    entityType: 'clinic',
    entityId: seed.clinicId,
    reason: 'Initial isolated synthetic clinic bootstrap',
    afterSnapshot: { ownerUsername: seed.ownerUsername.trim().toLowerCase() },
  });

  return { clinicId: seed.clinicId, ownerUserId, created: true };
}

export async function getClinicSettings(
  tx: DbExecutor,
  clinicId: string,
): Promise<{ version: number; settings: ClinicOperationalSettings; updatedAt: string; updatedBy: string }> {
  const res = await tx.query<{
    version: number;
    settings: ClinicOperationalSettings;
    updated_at: Date;
    updated_by: string;
  }>(
    `SELECT version, settings, updated_at, updated_by
       FROM app_clinic_settings
      WHERE clinic_id = $1`,
    [clinicId],
  );
  const row = res.rows[0];
  if (!row) {
    failApp('NOT_FOUND', 404, 'Clinic settings not initialized');
  }
  return {
    version: row.version,
    settings: row.settings,
    updatedAt: row.updated_at.toISOString(),
    updatedBy: row.updated_by,
  };
}

export async function updateClinicSettings(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: { expectedVersion: number; settings: unknown; reason: string },
): Promise<{ version: number; settings: ClinicOperationalSettings }> {
  assertModulePermission(actor, 'governance', 'edit');
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) {
    failApp('INVALID_INPUT', 400, 'expectedVersion must be a positive integer');
  }
  const validated = validateOperationalSettings(input.settings);

  const locked = await tx.query<{ version: number; settings: ClinicOperationalSettings }>(
    `SELECT version, settings FROM app_clinic_settings WHERE clinic_id = $1 FOR UPDATE`,
    [actor.clinicId],
  );
  const current = locked.rows[0];
  if (!current) {
    failApp('NOT_FOUND', 404);
  }
  if (current.version !== input.expectedVersion) {
    failApp('STALE_VERSION', 409, 'Settings version conflict');
  }

  const nextVersion = current.version + 1;
  await tx.query(
    `UPDATE app_clinic_settings
        SET version = $2, settings = $3::jsonb, updated_by = $4, updated_at = now()
      WHERE clinic_id = $1`,
    [actor.clinicId, nextVersion, JSON.stringify(validated), actor.userId],
  );

  await tx.query(
    `UPDATE app_clinics SET name_ar = $2, name_en = $3 WHERE clinic_id = $1`,
    [actor.clinicId, validated.print.clinicTitleAr, validated.print.clinicTitleEn],
  );

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'SETTINGS',
    action: 'UPDATE_CLINIC_SETTINGS',
    entityType: 'clinic_settings',
    entityId: actor.clinicId,
    reason: input.reason,
    beforeSnapshot: current.settings,
    afterSnapshot: validated,
  });

  return { version: nextVersion, settings: validated };
}

export async function authenticateStaffLogin(
  tx: DbExecutor,
  input: { clinicId: string; username: string; password: unknown; clientIp: string; now: Date },
): Promise<{ rawSessionToken: string; csrfToken: string; actor: AuthenticatedActor }> {
  const normalizedUsername = typeof input.username === 'string' ? input.username.trim().toLowerCase() : '';
  if (!normalizedUsername || normalizedUsername.length > 64) {
    failApp('INVALID_INPUT', 400, 'Username is required');
  }

  const bucketKey = `${normalizedUsername}|${input.clientIp || 'local'}`;
  const recentFailures = await tx.query<{ cnt: string }>(
    `SELECT count(*)::text AS cnt
       FROM app_login_attempts
      WHERE clinic_id = $1
        AND bucket_key = $2
        AND succeeded = FALSE
        AND attempted_at > ($3::timestamptz - interval '15 minutes')`,
    [input.clinicId, bucketKey, input.now.toISOString()],
  );
  if (Number(recentFailures.rows[0]?.cnt ?? '0') >= 6) {
    failApp('RATE_LIMITED', 429, 'Login rate limit exceeded');
  }

  const userRes = await tx.query<{
    user_id: string;
    clinic_id: string;
    person_id: string;
    username: string;
    display_name: string;
    role: StaffRole;
    is_primary_owner: boolean;
    is_active: boolean;
    password_hash: string;
    doctor_patient_scope: DoctorPatientScope;
    hidden_modules: AppModule[];
    permissions: PermissionMatrix;
    preferred_language: 'ar' | 'en' | null;
    authority_version: number;
  }>(
    `SELECT user_id, clinic_id, person_id, username, display_name, role, is_primary_owner, is_active,
            password_hash, doctor_patient_scope, hidden_modules, permissions, preferred_language, authority_version
       FROM app_staff_users
      WHERE clinic_id = $1 AND username = $2`,
    [input.clinicId, normalizedUsername],
  );

  const row = userRes.rows[0];
  const validPassword = await verifyPassword(input.password, row?.password_hash);
  if (!row || !validPassword || !row.is_active) {
    await tx.query(
      `INSERT INTO app_login_attempts (clinic_id, bucket_key, succeeded, attempted_at)
       VALUES ($1, $2, FALSE, $3::timestamptz)`,
      [input.clinicId, bucketKey, input.now.toISOString()],
    );
    return failApp('UNAUTHENTICATED', 401, 'Invalid credentials or inactive account');
  }

  await tx.query(
    `INSERT INTO app_login_attempts (clinic_id, bucket_key, succeeded, attempted_at)
     VALUES ($1, $2, TRUE, $3::timestamptz)`,
    [input.clinicId, bucketKey, input.now.toISOString()],
  );

  const { rawToken, tokenSha256 } = generateOpaqueToken(32);
  const csrfToken = generateOpaqueToken(24).rawToken;
  const sessionId = newEntityId('ses');
  const expiresAt = new Date(input.now.getTime() + 12 * 60 * 60 * 1000);

  await tx.query(
    `INSERT INTO app_sessions (session_id, clinic_id, user_id, token_sha256, csrf_token, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz)`,
    [sessionId, row.clinic_id, row.user_id, tokenSha256, csrfToken, input.now.toISOString(), expiresAt.toISOString()],
  );

  return {
    rawSessionToken: rawToken,
    csrfToken,
    actor: {
      sessionId,
      csrfToken,
      clinicId: row.clinic_id,
      userId: row.user_id,
      personId: row.person_id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
      isPrimaryOwner: row.is_primary_owner,
      isActive: row.is_active,
      doctorPatientScope: row.doctor_patient_scope,
      hiddenModules: row.hidden_modules,
      permissions: row.permissions,
      preferredLanguage: row.preferred_language,
      authorityVersion: row.authority_version,
    },
  };
}

/**
 * Resolves session & permissions LIVE from PostgreSQL on every request.
 * Never trusts role/scope/permissions cached in a cookie or JWT.
 */
export async function resolveSessionActor(
  tx: DbExecutor,
  rawToken: string | undefined,
  now: Date,
): Promise<AuthenticatedActor | null> {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 16 || rawToken.length > 128) {
    return null;
  }
  const tokenSha256 = sha256Hex(rawToken);
  const res = await tx.query<{
    session_id: string;
    csrf_token: string;
    clinic_id: string;
    user_id: string;
    person_id: string;
    username: string;
    display_name: string;
    role: StaffRole;
    is_primary_owner: boolean;
    is_active: boolean;
    doctor_patient_scope: DoctorPatientScope;
    hidden_modules: AppModule[];
    permissions: PermissionMatrix;
    preferred_language: 'ar' | 'en' | null;
    authority_version: number;
  }>(
    `SELECT s.session_id, s.csrf_token, u.clinic_id, u.user_id, u.person_id, u.username,
            u.display_name, u.role, u.is_primary_owner, u.is_active, u.doctor_patient_scope,
            u.hidden_modules, u.permissions, u.preferred_language, u.authority_version
       FROM app_sessions s
       JOIN app_staff_users u ON u.user_id = s.user_id AND u.clinic_id = s.clinic_id
      WHERE s.token_sha256 = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > $2::timestamptz
        AND u.is_active = TRUE`,
    [tokenSha256, now.toISOString()],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    sessionId: row.session_id,
    csrfToken: row.csrf_token,
    clinicId: row.clinic_id,
    userId: row.user_id,
    personId: row.person_id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    isPrimaryOwner: row.is_primary_owner,
    isActive: row.is_active,
    doctorPatientScope: row.doctor_patient_scope,
    hiddenModules: row.hidden_modules,
    permissions: row.permissions,
    preferredLanguage: row.preferred_language,
    authorityVersion: row.authority_version,
  };
}

export async function revokeSession(tx: DbExecutor, sessionId: string, now: Date): Promise<void> {
  await tx.query(
    `UPDATE app_sessions SET revoked_at = $2::timestamptz WHERE session_id = $1 AND revoked_at IS NULL`,
    [sessionId, now.toISOString()],
  );
}

export interface StaffSummary {
  readonly userId: string;
  readonly username: string;
  readonly displayName: string;
  readonly role: StaffRole;
  readonly isPrimaryOwner: boolean;
  readonly isActive: boolean;
  readonly doctorPatientScope: DoctorPatientScope;
  readonly hiddenModules: readonly AppModule[];
  readonly permissions: PermissionMatrix;
  readonly authorityVersion: number;
  readonly version: number;
}

export async function listStaffUsers(tx: DbExecutor, actor: AuthenticatedActor): Promise<readonly StaffSummary[]> {
  assertModulePermission(actor, 'governance', 'view');
  const res = await tx.query<{
    user_id: string;
    username: string;
    display_name: string;
    role: StaffRole;
    is_primary_owner: boolean;
    is_active: boolean;
    doctor_patient_scope: DoctorPatientScope;
    hidden_modules: AppModule[];
    permissions: PermissionMatrix;
    authority_version: number;
    version: number;
  }>(
    `SELECT user_id, username, display_name, role, is_primary_owner, is_active,
            doctor_patient_scope, hidden_modules, permissions, authority_version, version
       FROM app_staff_users
      WHERE clinic_id = $1
      ORDER BY is_primary_owner DESC, created_at ASC`,
    [actor.clinicId],
  );
  return res.rows.map(r => ({
    userId: r.user_id,
    username: r.username,
    displayName: r.display_name,
    role: r.role,
    isPrimaryOwner: r.is_primary_owner,
    isActive: r.is_active,
    doctorPatientScope: r.doctor_patient_scope,
    hiddenModules: r.hidden_modules,
    permissions: r.permissions,
    authorityVersion: r.authority_version,
    version: r.version,
  }));
}

export async function listActiveDoctorsDirectory(
  tx: DbExecutor,
  clinicId: string,
): Promise<readonly { userId: string; displayName: string; role: StaffRole }[]> {
  const res = await tx.query<{ user_id: string; display_name: string; role: StaffRole }>(
    `SELECT user_id, display_name, role
       FROM app_staff_users
      WHERE clinic_id = $1 AND is_active = TRUE AND role IN ('DOCTOR', 'OWNER')
      ORDER BY display_name ASC`,
    [clinicId],
  );
  return res.rows.map(r => ({ userId: r.user_id, displayName: r.display_name, role: r.role }));
}

export async function createStaffUser(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    username: string;
    displayName: string;
    password: string;
    role: StaffRole;
    doctorPatientScope?: DoctorPatientScope;
    hiddenModules?: readonly AppModule[];
    permissions?: PermissionMatrix;
    reason: string;
  },
): Promise<StaffSummary> {
  assertModulePermission(actor, 'governance', 'create');
  const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : '';
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    failApp('INVALID_INPUT', 400, 'Username must be 3..40 lowercase alphanumeric/._- chars');
  }
  const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : '';
  if (!displayName || displayName.length > 100) {
    failApp('INVALID_INPUT', 400, 'displayName is required');
  }
  if (!(STAFF_ROLES as readonly string[]).includes(input.role)) {
    failApp('INVALID_INPUT', 400, 'Invalid role');
  }
  const scope: DoctorPatientScope = input.doctorPatientScope ?? (input.role === 'OWNER' ? 'authorized' : 'own');
  if (scope !== 'own' && scope !== 'authorized') {
    failApp('INVALID_INPUT', 400, 'Invalid doctorPatientScope');
  }
  const hiddenModules = input.hiddenModules ? validateHiddenModules(input.hiddenModules) : [];
  const permissions = input.permissions ? validatePermissionMatrix(input.permissions) : defaultRolePermissions(input.role);
  const passwordHash = await hashPassword(input.password);

  const dup = await tx.query('SELECT 1 FROM app_staff_users WHERE clinic_id = $1 AND username = $2', [
    actor.clinicId,
    username,
  ]);
  if (dup.rows[0] !== undefined) {
    failApp('INVALID_INPUT', 409, 'Username already exists');
  }

  const personId = newEntityId('per');
  const userId = newEntityId('usr');
  await tx.query('INSERT INTO app_persons (person_id, clinic_id, full_name) VALUES ($1, $2, $3)', [
    personId,
    actor.clinicId,
    displayName,
  ]);

  await tx.query(
    `INSERT INTO app_staff_users
       (user_id, clinic_id, person_id, username, display_name, role, is_primary_owner, is_active,
        password_hash, doctor_patient_scope, hidden_modules, permissions)
     VALUES ($1, $2, $3, $4, $5, $6, FALSE, TRUE, $7, $8, $9::jsonb, $10::jsonb)`,
    [
      userId,
      actor.clinicId,
      personId,
      username,
      displayName,
      input.role,
      passwordHash,
      scope,
      JSON.stringify(hiddenModules),
      JSON.stringify(permissions),
    ],
  );

  const summary: StaffSummary = {
    userId,
    username,
    displayName,
    role: input.role,
    isPrimaryOwner: false,
    isActive: true,
    doctorPatientScope: scope,
    hiddenModules,
    permissions,
    authorityVersion: 1,
    version: 1,
  };

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'GOVERNANCE',
    action: 'CREATE_STAFF_USER',
    entityType: 'staff_user',
    entityId: userId,
    reason: input.reason,
    afterSnapshot: summary,
  });

  return summary;
}

export async function updateStaffGovernance(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    targetUserId: string;
    expectedVersion: number;
    displayName?: string;
    role?: StaffRole;
    isActive?: boolean;
    doctorPatientScope?: DoctorPatientScope;
    hiddenModules?: readonly AppModule[];
    permissions?: PermissionMatrix;
    newPassword?: string;
    reason: string;
  },
): Promise<StaffSummary> {
  assertModulePermission(actor, 'governance', 'edit');
  if (input.permissions !== undefined || input.role !== undefined || input.hiddenModules !== undefined) {
    assertModulePermission(actor, 'governance', 'approve');
  }

  const locked = await tx.query<{
    user_id: string;
    username: string;
    display_name: string;
    role: StaffRole;
    is_primary_owner: boolean;
    is_active: boolean;
    doctor_patient_scope: DoctorPatientScope;
    hidden_modules: AppModule[];
    permissions: PermissionMatrix;
    authority_version: number;
    version: number;
  }>(
    `SELECT user_id, username, display_name, role, is_primary_owner, is_active,
            doctor_patient_scope, hidden_modules, permissions, authority_version, version
       FROM app_staff_users
      WHERE clinic_id = $1 AND user_id = $2
      FOR UPDATE`,
    [actor.clinicId, input.targetUserId],
  );

  const row = locked.rows[0];
  if (!row) {
    failApp('NOT_FOUND', 404, 'Target staff user not found');
  }
  if (row.version !== input.expectedVersion) {
    failApp('STALE_VERSION', 409, 'Staff record modified concurrently');
  }

  const nextRole = input.role ?? row.role;
  if (!(STAFF_ROLES as readonly string[]).includes(nextRole)) {
    failApp('INVALID_INPUT', 400, 'Invalid role');
  }
  const nextActive = input.isActive ?? row.is_active;
  const nextScope = input.doctorPatientScope ?? row.doctor_patient_scope;
  if (nextScope !== 'own' && nextScope !== 'authorized') {
    failApp('INVALID_INPUT', 400, 'Invalid doctorPatientScope');
  }
  const nextHidden = input.hiddenModules !== undefined ? validateHiddenModules(input.hiddenModules) : row.hidden_modules;
  const nextPerms = input.permissions !== undefined ? validatePermissionMatrix(input.permissions) : row.permissions;
  const nextDisplayName = input.displayName !== undefined ? input.displayName.trim() : row.display_name;
  if (!nextDisplayName || nextDisplayName.length > 100) {
    failApp('INVALID_INPUT', 400, 'Invalid displayName');
  }

  // Primary owner lockout protection under `SELECT ... FOR UPDATE`
  if (row.is_primary_owner) {
    if (
      !nextActive ||
      nextRole !== 'OWNER' ||
      nextHidden.includes('governance') ||
      !nextPerms.governance.view ||
      !nextPerms.governance.create ||
      !nextPerms.governance.edit ||
      !nextPerms.governance.approve
    ) {
      failApp('OWNER_LOCKOUT_PROTECTED', 409, 'Cannot lock out or strip governance rights from primary owner');
    }
  }

  const nextVersion = row.version + 1;
  const nextAuthorityVersion = row.authority_version + 1;

  if (input.newPassword !== undefined && input.newPassword !== '') {
    const newHash = await hashPassword(input.newPassword);
    await tx.query(
      `UPDATE app_staff_users
          SET display_name = $3, role = $4, is_active = $5, doctor_patient_scope = $6,
              hidden_modules = $7::jsonb, permissions = $8::jsonb, password_hash = $9,
              authority_version = $10, version = $11, updated_at = now()
        WHERE clinic_id = $1 AND user_id = $2`,
      [
        actor.clinicId,
        row.user_id,
        nextDisplayName,
        nextRole,
        nextActive,
        nextScope,
        JSON.stringify(nextHidden),
        JSON.stringify(nextPerms),
        newHash,
        nextAuthorityVersion,
        nextVersion,
      ],
    );
  } else {
    await tx.query(
      `UPDATE app_staff_users
          SET display_name = $3, role = $4, is_active = $5, doctor_patient_scope = $6,
              hidden_modules = $7::jsonb, permissions = $8::jsonb,
              authority_version = $9, version = $10, updated_at = now()
        WHERE clinic_id = $1 AND user_id = $2`,
      [
        actor.clinicId,
        row.user_id,
        nextDisplayName,
        nextRole,
        nextActive,
        nextScope,
        JSON.stringify(nextHidden),
        JSON.stringify(nextPerms),
        nextAuthorityVersion,
        nextVersion,
      ],
    );
  }

  if (!nextActive || (input.newPassword !== undefined && input.newPassword !== '')) {
    await tx.query(
      `UPDATE app_sessions SET revoked_at = now() WHERE clinic_id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [actor.clinicId, row.user_id],
    );
  }

  const beforeSummary: StaffSummary = {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    isPrimaryOwner: row.is_primary_owner,
    isActive: row.is_active,
    doctorPatientScope: row.doctor_patient_scope,
    hiddenModules: row.hidden_modules,
    permissions: row.permissions,
    authorityVersion: row.authority_version,
    version: row.version,
  };

  const afterSummary: StaffSummary = {
    userId: row.user_id,
    username: row.username,
    displayName: nextDisplayName,
    role: nextRole,
    isPrimaryOwner: row.is_primary_owner,
    isActive: nextActive,
    doctorPatientScope: nextScope,
    hiddenModules: nextHidden,
    permissions: nextPerms,
    authorityVersion: nextAuthorityVersion,
    version: nextVersion,
  };

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'GOVERNANCE',
    action: 'UPDATE_STAFF_GOVERNANCE',
    entityType: 'staff_user',
    entityId: row.user_id,
    reason: input.reason,
    beforeSnapshot: beforeSummary,
    afterSnapshot: { ...afterSummary, passwordRotated: Boolean(input.newPassword) },
  });

  return afterSummary;
}

export interface AuditLogEntry {
  readonly auditId: string;
  readonly actorUserId: string;
  readonly actorDisplayName: string;
  readonly category: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly reason: string;
  readonly beforeSnapshot: unknown;
  readonly afterSnapshot: unknown;
  readonly recordedAt: string;
}

export async function listAuditEvents(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  limit = 60,
): Promise<readonly AuditLogEntry[]> {
  assertModulePermission(actor, 'governance', 'view');
  const bounded = Math.max(1, Math.min(limit, 200));
  const res = await tx.query<{
    audit_id: string;
    actor_user_id: string;
    actor_name: string | null;
    category: string;
    action: string;
    entity_type: string;
    entity_id: string;
    reason: string;
    before_snapshot: unknown;
    after_snapshot: unknown;
    recorded_at: Date;
  }>(
    `SELECT a.audit_id, a.actor_user_id, u.display_name AS actor_name,
            a.category, a.action, a.entity_type, a.entity_id, a.reason,
            a.before_snapshot, a.after_snapshot, a.recorded_at
       FROM app_audit_events a
       LEFT JOIN app_staff_users u ON u.user_id = a.actor_user_id AND u.clinic_id = a.clinic_id
      WHERE a.clinic_id = $1
      ORDER BY a.recorded_at DESC, a.audit_id DESC
      LIMIT $2`,
    [actor.clinicId, bounded],
  );
  return res.rows.map(r => ({
    auditId: r.audit_id,
    actorUserId: r.actor_user_id,
    actorDisplayName: r.actor_name ?? r.actor_user_id,
    category: r.category,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    reason: r.reason,
    beforeSnapshot: r.before_snapshot,
    afterSnapshot: r.after_snapshot,
    recordedAt: r.recorded_at.toISOString(),
  }));
}
