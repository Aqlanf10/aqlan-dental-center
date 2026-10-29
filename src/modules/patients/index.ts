import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DbExecutor } from '../../platform/db.ts';
import { newEntityId, sha256Hex } from '../../platform/crypto.ts';
import { assertIsoDate } from '../../platform/clock.ts';
import { failApp } from '../../platform/errors.ts';
import { parseMoney } from '../../finance/money.ts';
import type { Currency } from '../../finance/types.ts';
import {
  assertModulePermission,
  recordAuditEvent,
  type AuthenticatedActor,
} from '../governance/index.ts';

export interface PatientMedicalHistory {
  readonly patientId: string;
  readonly allergies: readonly string[];
  readonly chronicConditions: readonly string[];
  readonly currentMedications: readonly string[];
  readonly isPregnant: boolean;
  readonly takesAnticoagulants: boolean;
  readonly criticalNotes: string;
  readonly hasCriticalAlert: boolean;
  readonly version: number;
  readonly updatedAt: string;
}

export interface PatientRecord {
  readonly patientId: string;
  readonly personId: string;
  readonly fileNumber: number;
  readonly isLegacyArchiveNumber: boolean;
  readonly fullName: string;
  readonly phone: string;
  readonly sex: 'MALE' | 'FEMALE';
  readonly birthYear: number | null;
  readonly notes: string;
  readonly primaryDoctorUserId: string | null;
  readonly primaryDoctorName: string | null;
  readonly openingBalanceCurrency: Currency;
  readonly openingBalanceMinor: string;
  readonly portalHandle: string;
  readonly portalStatus: 'DISABLED' | 'INVITED' | 'SUSPENDED';
  readonly medicalHistory: PatientMedicalHistory;
  readonly previousFileNumbers: readonly number[];
  readonly version: number;
  readonly createdAt: string;
}

function computeCriticalAlert(m: {
  allergies: readonly string[];
  isPregnant: boolean;
  takesAnticoagulants: boolean;
  criticalNotes: string;
}): boolean {
  return (
    m.allergies.length > 0 ||
    m.isPregnant ||
    m.takesAnticoagulants ||
    m.criticalNotes.trim().length > 0
  );
}

function cleanStringList(raw: unknown, fieldName: string): readonly string[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > 30) {
    failApp('INVALID_INPUT', 400, `${fieldName} must be an array of up to 30 strings`);
  }
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') {
      failApp('INVALID_INPUT', 400, `${fieldName} entries must be strings`);
    }
    const trimmed = item.trim();
    if (trimmed) {
      if (trimmed.length > 80) failApp('INVALID_INPUT', 400, `${fieldName} entry too long`);
      if (!out.includes(trimmed)) out.push(trimmed);
    }
  }
  return Object.freeze(out);
}

/**
 * Enforces doctor scope (`own` vs `authorized`) live on the server.
 * - Non-doctor roles access clinic patients according to their module permissions.
 * - DOCTOR with `own`: strictly `primary_doctor_user_id = actor.userId`.
 * - DOCTOR with `authorized`: `primary_doctor_user_id = actor.userId` OR an active
 *   unrevoked grant in `app_doctor_patient_grants` (referral, coverage, or emergency day)
 *   OR an active non-cancelled appointment assigned to `actor.userId`.
 */
export async function canActorAccessPatient(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  patientId: string,
  clinicToday: string,
): Promise<boolean> {
  const checkedToday = assertIsoDate(clinicToday);
  const patRes = await tx.query<{ primary_doctor_user_id: string | null }>(
    `SELECT primary_doctor_user_id
       FROM app_patients
      WHERE clinic_id = $1 AND patient_id = $2`,
    [actor.clinicId, patientId],
  );
  const pat = patRes.rows[0];
  if (!pat) {
    failApp('NOT_FOUND', 404, 'Patient not found');
  }
  if (actor.role !== 'DOCTOR') {
    return true;
  }
  if (pat.primary_doctor_user_id === actor.userId) {
    return true;
  }
  if (actor.doctorPatientScope === 'own') {
    return false;
  }

  // `authorized` scope: check explicit unrevoked referral/coverage/emergency-day grant
  // or non-cancelled appointment booked for this doctor.
  const grantRes = await tx.query(
    `SELECT 1
       FROM app_doctor_patient_grants
      WHERE clinic_id = $1
        AND patient_id = $2
        AND doctor_user_id = $3
        AND revoked_at IS NULL
        AND (valid_on_date IS NULL OR valid_on_date = $4::date)
      LIMIT 1`,
    [actor.clinicId, patientId, actor.userId, checkedToday],
  );
  if (grantRes.rows[0] !== undefined) {
    return true;
  }

  const apptRes = await tx.query(
    `SELECT 1
       FROM app_appointments
      WHERE clinic_id = $1
        AND patient_id = $2
        AND doctor_user_id = $3
        AND status NOT IN ('CANCELLED', 'NO_SHOW')
      LIMIT 1`,
    [actor.clinicId, patientId, actor.userId],
  );
  return apptRes.rows[0] !== undefined;
}

export async function assertPatientAccess(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  patientId: string,
  clinicToday: string,
): Promise<void> {
  const allowed = await canActorAccessPatient(tx, actor, patientId, clinicToday);
  if (!allowed) {
    failApp('ACCESS_DENIED', 403, `Doctor ${actor.userId} is not authorized for patient ${patientId}`);
  }
}

async function allocateNextFileNumberAtLeast7000(tx: DbExecutor, clinicId: string): Promise<number> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const seqRes = await tx.query<{ n: string }>(`SELECT nextval('aqlan_app.app_patient_file_seq')::text AS n`);
    const candidate = Number(seqRes.rows[0]?.n ?? '7000');
    if (candidate < 7000) {
      failApp('INTERNAL_ERROR', 500, 'Patient sequence produced < 7000');
    }
    const taken = await tx.query(
      `SELECT 1 FROM app_patients WHERE clinic_id = $1 AND file_number = $2`,
      [clinicId, candidate],
    );
    if (taken.rows[0] === undefined) {
      return candidate;
    }
  }
  failApp('INTERNAL_ERROR', 500, 'Unable to allocate conflict-free patient file number');
}

export async function createPatient(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    fullName: string;
    phone: string;
    sex: 'MALE' | 'FEMALE';
    birthYear?: number | null;
    notes?: string;
    primaryDoctorUserId?: string | null;
    openingBalanceDecimal?: string;
    openingBalanceCurrency?: Currency;
    legacyArchiveFileNumber?: number;
    medicalHistory?: {
      allergies?: readonly string[];
      chronicConditions?: readonly string[];
      currentMedications?: readonly string[];
      isPregnant?: boolean;
      takesAnticoagulants?: boolean;
      criticalNotes?: string;
    };
  },
  defaultCurrency: Currency,
  clinicToday: string,
): Promise<PatientRecord> {
  assertModulePermission(actor, 'patients', 'create');

  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : '';
  if (fullName.length < 2 || fullName.length > 120) {
    failApp('INVALID_INPUT', 400, 'Patient fullName must be 2..120 characters');
  }
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  if (!/^[0-9+() -]{6,24}$/.test(phone)) {
    failApp('INVALID_INPUT', 400, 'Invalid phone number');
  }
  if (input.sex !== 'MALE' && input.sex !== 'FEMALE') {
    failApp('INVALID_INPUT', 400, 'sex must be MALE or FEMALE');
  }
  const birthYear =
    input.birthYear === undefined || input.birthYear === null ? null : Number(input.birthYear);
  if (birthYear !== null && (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > 2100)) {
    failApp('INVALID_INPUT', 400, 'Invalid birthYear');
  }
  const notes = typeof input.notes === 'string' ? input.notes.trim().slice(0, 1000) : '';

  let primaryDoctorUserId: string | null =
    input.primaryDoctorUserId ?? (actor.role === 'DOCTOR' ? actor.userId : null);
  if (primaryDoctorUserId !== null && primaryDoctorUserId !== '') {
    const docCheck = await tx.query(
      `SELECT 1 FROM app_staff_users
        WHERE clinic_id = $1 AND user_id = $2 AND is_active = TRUE AND role IN ('DOCTOR', 'OWNER')`,
      [actor.clinicId, primaryDoctorUserId],
    );
    if (docCheck.rows[0] === undefined) {
      failApp('INVALID_INPUT', 400, 'Selected primary doctor does not exist or is inactive');
    }
  } else {
    primaryDoctorUserId = null;
  }

  const obCurrency: Currency = input.openingBalanceCurrency ?? defaultCurrency;
  let obMinor = '0';
  if (input.openingBalanceDecimal !== undefined && input.openingBalanceDecimal.trim() !== '') {
    try {
      obMinor = parseMoney(input.openingBalanceDecimal.trim(), obCurrency).minor;
    } catch {
      failApp('INVALID_INPUT', 400, 'Invalid opening balance amount');
    }
  }

  let fileNumber: number;
  let isLegacyArchiveNumber = false;
  if (input.legacyArchiveFileNumber !== undefined) {
    assertModulePermission(actor, 'governance', 'approve');
    if (
      !Number.isInteger(input.legacyArchiveFileNumber) ||
      input.legacyArchiveFileNumber < 1 ||
      input.legacyArchiveFileNumber >= 7000
    ) {
      failApp('INVALID_INPUT', 400, 'Legacy archive file number must be an integer between 1 and 6999');
    }
    const existingLegacy = await tx.query(
      `SELECT 1 FROM app_patients WHERE clinic_id = $1 AND file_number = $2`,
      [actor.clinicId, input.legacyArchiveFileNumber],
    );
    if (existingLegacy.rows[0] !== undefined) {
      failApp('INVALID_INPUT', 409, 'Legacy file number already exists');
    }
    fileNumber = input.legacyArchiveFileNumber;
    isLegacyArchiveNumber = true;
  } else {
    fileNumber = await allocateNextFileNumberAtLeast7000(tx, actor.clinicId);
  }

  const personId = newEntityId('per');
  const patientId = newEntityId('pat');
  const portalAccountId = newEntityId('ppa');
  const portalHandle = newEntityId('ptl');

  await tx.query(`INSERT INTO app_persons (person_id, clinic_id, full_name) VALUES ($1, $2, $3)`, [
    personId,
    actor.clinicId,
    fullName,
  ]);

  await tx.query(
    `INSERT INTO app_patients
       (patient_id, clinic_id, person_id, file_number, is_legacy_archive_number, full_name, phone, sex,
        birth_year, notes, primary_doctor_user_id, opening_balance_currency, opening_balance_minor, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::bigint, $14)`,
    [
      patientId,
      actor.clinicId,
      personId,
      fileNumber,
      isLegacyArchiveNumber,
      fullName,
      phone,
      input.sex,
      birthYear,
      notes,
      primaryDoctorUserId,
      obCurrency,
      obMinor,
      actor.userId,
    ],
  );

  const allergies = cleanStringList(input.medicalHistory?.allergies, 'allergies');
  const chronicConditions = cleanStringList(input.medicalHistory?.chronicConditions, 'chronicConditions');
  const currentMedications = cleanStringList(input.medicalHistory?.currentMedications, 'currentMedications');
  const isPregnant = Boolean(input.medicalHistory?.isPregnant);
  const takesAnticoagulants = Boolean(input.medicalHistory?.takesAnticoagulants);
  const criticalNotes =
    typeof input.medicalHistory?.criticalNotes === 'string'
      ? input.medicalHistory.criticalNotes.trim().slice(0, 500)
      : '';

  await tx.query(
    `INSERT INTO app_patient_medical_history
       (patient_id, clinic_id, allergies, chronic_conditions, current_medications,
        is_pregnant, takes_anticoagulants, critical_notes, updated_by)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7, $8, $9)`,
    [
      patientId,
      actor.clinicId,
      JSON.stringify(allergies),
      JSON.stringify(chronicConditions),
      JSON.stringify(currentMedications),
      isPregnant,
      takesAnticoagulants,
      criticalNotes,
      actor.userId,
    ],
  );

  // Decoupled Patient Portal account: independent of file_number and phone; strictly DISABLED
  await tx.query(
    `INSERT INTO app_patient_portal_accounts (portal_account_id, clinic_id, patient_id, portal_handle, status)
     VALUES ($1, $2, $3, $4, 'DISABLED')`,
    [portalAccountId, actor.clinicId, patientId, portalHandle],
  );

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'PATIENTS',
    action: 'CREATE_PATIENT',
    entityType: 'patient',
    entityId: patientId,
    reason: 'New patient registration',
    afterSnapshot: { patientId, fileNumber, isLegacyArchiveNumber, primaryDoctorUserId },
  });

  return getPatientById(tx, actor, patientId, clinicToday);
}

export async function getPatientById(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  patientId: string,
  clinicToday: string,
): Promise<PatientRecord> {
  assertModulePermission(actor, 'patients', 'view');
  await assertPatientAccess(tx, actor, patientId, clinicToday);

  const res = await tx.query<{
    patient_id: string;
    person_id: string;
    file_number: string;
    is_legacy_archive_number: boolean;
    full_name: string;
    phone: string;
    sex: 'MALE' | 'FEMALE';
    birth_year: number | null;
    notes: string;
    primary_doctor_user_id: string | null;
    doctor_name: string | null;
    opening_balance_currency: Currency;
    opening_balance_minor: string;
    portal_handle: string;
    portal_status: 'DISABLED' | 'INVITED' | 'SUSPENDED';
    allergies: string[];
    chronic_conditions: string[];
    current_medications: string[];
    is_pregnant: boolean;
    takes_anticoagulants: boolean;
    critical_notes: string;
    med_version: number;
    med_updated_at: Date;
    version: number;
    created_at: Date;
  }>(
    `SELECT p.patient_id, p.person_id, p.file_number::text, p.is_legacy_archive_number,
            p.full_name, p.phone, p.sex, p.birth_year, p.notes,
            p.primary_doctor_user_id, d.display_name AS doctor_name,
            p.opening_balance_currency, p.opening_balance_minor::text,
            ppa.portal_handle, ppa.status AS portal_status,
            mh.allergies, mh.chronic_conditions, mh.current_medications,
            mh.is_pregnant, mh.takes_anticoagulants, mh.critical_notes,
            mh.version AS med_version, mh.updated_at AS med_updated_at,
            p.version, p.created_at
       FROM app_patients p
       JOIN app_patient_medical_history mh ON mh.patient_id = p.patient_id
       JOIN app_patient_portal_accounts ppa ON ppa.patient_id = p.patient_id
       LEFT JOIN app_staff_users d ON d.user_id = p.primary_doctor_user_id
      WHERE p.clinic_id = $1 AND p.patient_id = $2`,
    [actor.clinicId, patientId],
  );
  const row = res.rows[0];
  if (!row) {
    failApp('NOT_FOUND', 404, 'Patient not found');
  }

  const histRes = await tx.query<{ old_file_number: string }>(
    `SELECT old_file_number::text
       FROM app_patient_file_history
      WHERE clinic_id = $1 AND patient_id = $2
      ORDER BY changed_at DESC`,
    [actor.clinicId, patientId],
  );

  const medicalHistory: PatientMedicalHistory = {
    patientId: row.patient_id,
    allergies: row.allergies,
    chronicConditions: row.chronic_conditions,
    currentMedications: row.current_medications,
    isPregnant: row.is_pregnant,
    takesAnticoagulants: row.takes_anticoagulants,
    criticalNotes: row.critical_notes,
    hasCriticalAlert: computeCriticalAlert({
      allergies: row.allergies,
      isPregnant: row.is_pregnant,
      takesAnticoagulants: row.takes_anticoagulants,
      criticalNotes: row.critical_notes,
    }),
    version: row.med_version,
    updatedAt: row.med_updated_at.toISOString(),
  };

  return {
    patientId: row.patient_id,
    personId: row.person_id,
    fileNumber: Number(row.file_number),
    isLegacyArchiveNumber: row.is_legacy_archive_number,
    fullName: row.full_name,
    phone: row.phone,
    sex: row.sex,
    birthYear: row.birth_year,
    notes: row.notes,
    primaryDoctorUserId: row.primary_doctor_user_id,
    primaryDoctorName: row.doctor_name,
    openingBalanceCurrency: row.opening_balance_currency,
    openingBalanceMinor: row.opening_balance_minor,
    portalHandle: row.portal_handle,
    portalStatus: row.portal_status,
    medicalHistory,
    previousFileNumbers: histRes.rows.map(h => Number(h.old_file_number)),
    version: row.version,
    createdAt: row.created_at.toISOString(),
  };
}

export interface PatientListItem {
  readonly patientId: string;
  readonly fileNumber: number;
  readonly isLegacyArchiveNumber: boolean;
  readonly fullName: string;
  readonly phone: string;
  readonly sex: 'MALE' | 'FEMALE';
  readonly primaryDoctorUserId: string | null;
  readonly primaryDoctorName: string | null;
  readonly hasCriticalAlert: boolean;
}

export async function searchPatients(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  queryText: string | undefined,
  clinicToday: string,
  limit = 50,
): Promise<readonly PatientListItem[]> {
  assertModulePermission(actor, 'patients', 'view');
  const checkedToday = assertIsoDate(clinicToday);
  const q = typeof queryText === 'string' ? queryText.trim() : '';
  const bounded = Math.max(1, Math.min(limit, 100));
  const numericSearch = /^\d+$/.test(q) ? Number(q) : null;

  const params: unknown[] = [actor.clinicId];
  let scopeClause = '';
  if (actor.role === 'DOCTOR') {
    params.push(actor.userId);
    const docIdx = params.length;
    if (actor.doctorPatientScope === 'own') {
      scopeClause = `AND p.primary_doctor_user_id = $${docIdx}`;
    } else {
      params.push(checkedToday);
      const dayIdx = params.length;
      scopeClause = `AND (
        p.primary_doctor_user_id = $${docIdx}
        OR EXISTS (
          SELECT 1 FROM app_doctor_patient_grants g
           WHERE g.clinic_id = p.clinic_id
             AND g.patient_id = p.patient_id
             AND g.doctor_user_id = $${docIdx}
             AND g.revoked_at IS NULL
             AND (g.valid_on_date IS NULL OR g.valid_on_date = $${dayIdx}::date)
        )
        OR EXISTS (
          SELECT 1 FROM app_appointments a
           WHERE a.clinic_id = p.clinic_id
             AND a.patient_id = p.patient_id
             AND a.doctor_user_id = $${docIdx}
             AND a.status NOT IN ('CANCELLED', 'NO_SHOW')
        )
      )`;
    }
  }

  let searchClause = '';
  if (q) {
    params.push(`%${q}%`);
    const likeIdx = params.length;
    if (numericSearch !== null && Number.isSafeInteger(numericSearch)) {
      params.push(numericSearch);
      const numIdx = params.length;
      searchClause = `AND (
        p.full_name ILIKE $${likeIdx}
        OR p.phone ILIKE $${likeIdx}
        OR p.file_number = $${numIdx}
        OR EXISTS (
          SELECT 1 FROM app_patient_file_history fh
           WHERE fh.clinic_id = p.clinic_id
             AND fh.patient_id = p.patient_id
             AND fh.old_file_number = $${numIdx}
        )
      )`;
    } else {
      searchClause = `AND (p.full_name ILIKE $${likeIdx} OR p.phone ILIKE $${likeIdx})`;
    }
  }

  params.push(bounded);
  const limitIdx = params.length;

  const res = await tx.query<{
    patient_id: string;
    file_number: string;
    is_legacy_archive_number: boolean;
    full_name: string;
    phone: string;
    sex: 'MALE' | 'FEMALE';
    primary_doctor_user_id: string | null;
    doctor_name: string | null;
    allergies: string[];
    is_pregnant: boolean;
    takes_anticoagulants: boolean;
    critical_notes: string;
  }>(
    `SELECT p.patient_id, p.file_number::text, p.is_legacy_archive_number, p.full_name,
            p.phone, p.sex, p.primary_doctor_user_id, d.display_name AS doctor_name,
            mh.allergies, mh.is_pregnant, mh.takes_anticoagulants, mh.critical_notes
       FROM app_patients p
       JOIN app_patient_medical_history mh ON mh.patient_id = p.patient_id
       LEFT JOIN app_staff_users d ON d.user_id = p.primary_doctor_user_id
      WHERE p.clinic_id = $1
        ${scopeClause}
        ${searchClause}
      ORDER BY p.file_number DESC
      LIMIT $${limitIdx}`,
    params,
  );

  return res.rows.map(r => ({
    patientId: r.patient_id,
    fileNumber: Number(r.file_number),
    isLegacyArchiveNumber: r.is_legacy_archive_number,
    fullName: r.full_name,
    phone: r.phone,
    sex: r.sex,
    primaryDoctorUserId: r.primary_doctor_user_id,
    primaryDoctorName: r.doctor_name,
    hasCriticalAlert: computeCriticalAlert({
      allergies: r.allergies,
      isPregnant: r.is_pregnant,
      takesAnticoagulants: r.takes_anticoagulants,
      criticalNotes: r.critical_notes,
    }),
  }));
}

export async function updatePatientMedicalHistory(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    patientId: string;
    expectedVersion: number;
    allergies: readonly string[];
    chronicConditions: readonly string[];
    currentMedications: readonly string[];
    isPregnant: boolean;
    takesAnticoagulants: boolean;
    criticalNotes: string;
    reason: string;
  },
  clinicToday: string,
): Promise<PatientMedicalHistory> {
  assertModulePermission(actor, 'patients', 'edit');
  await assertPatientAccess(tx, actor, input.patientId, clinicToday);

  const locked = await tx.query<{
    allergies: string[];
    chronic_conditions: string[];
    current_medications: string[];
    is_pregnant: boolean;
    takes_anticoagulants: boolean;
    critical_notes: string;
    version: number;
  }>(
    `SELECT allergies, chronic_conditions, current_medications, is_pregnant,
            takes_anticoagulants, critical_notes, version
       FROM app_patient_medical_history
      WHERE clinic_id = $1 AND patient_id = $2
      FOR UPDATE`,
    [actor.clinicId, input.patientId],
  );
  const current = locked.rows[0];
  if (!current) failApp('NOT_FOUND', 404);
  if (current.version !== input.expectedVersion) {
    failApp('STALE_VERSION', 409, 'Medical history version conflict');
  }

  const allergies = cleanStringList(input.allergies, 'allergies');
  const chronicConditions = cleanStringList(input.chronicConditions, 'chronicConditions');
  const currentMedications = cleanStringList(input.currentMedications, 'currentMedications');
  const isPregnant = Boolean(input.isPregnant);
  const takesAnticoagulants = Boolean(input.takesAnticoagulants);
  const criticalNotes = typeof input.criticalNotes === 'string' ? input.criticalNotes.trim().slice(0, 500) : '';
  const nextVersion = current.version + 1;

  await tx.query(
    `UPDATE app_patient_medical_history
        SET allergies = $3::jsonb,
            chronic_conditions = $4::jsonb,
            current_medications = $5::jsonb,
            is_pregnant = $6,
            takes_anticoagulants = $7,
            critical_notes = $8,
            version = $9,
            updated_by = $10,
            updated_at = now()
      WHERE clinic_id = $1 AND patient_id = $2`,
    [
      actor.clinicId,
      input.patientId,
      JSON.stringify(allergies),
      JSON.stringify(chronicConditions),
      JSON.stringify(currentMedications),
      isPregnant,
      takesAnticoagulants,
      criticalNotes,
      nextVersion,
      actor.userId,
    ],
  );

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'MEDICAL_HISTORY',
    action: 'UPDATE_MEDICAL_HISTORY',
    entityType: 'patient',
    entityId: input.patientId,
    reason: input.reason,
    beforeSnapshot: current,
    afterSnapshot: { allergies, chronicConditions, currentMedications, isPregnant, takesAnticoagulants, criticalNotes },
  });

  return {
    patientId: input.patientId,
    allergies,
    chronicConditions,
    currentMedications,
    isPregnant,
    takesAnticoagulants,
    criticalNotes,
    hasCriticalAlert: computeCriticalAlert({ allergies, isPregnant, takesAnticoagulants, criticalNotes }),
    version: nextVersion,
    updatedAt: new Date().toISOString(),
  };
}

export async function correctPatientFileNumber(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    patientId: string;
    newFileNumber: number;
    reason: string;
  },
  clinicToday: string,
): Promise<PatientRecord> {
  assertModulePermission(actor, 'patients', 'approve');
  assertModulePermission(actor, 'governance', 'approve');

  if (!Number.isInteger(input.newFileNumber) || input.newFileNumber < 7000) {
    failApp('INVALID_INPUT', 400, 'Corrected file number must be an integer >= 7000');
  }

  const locked = await tx.query<{ file_number: string; version: number }>(
    `SELECT file_number::text, version
       FROM app_patients
      WHERE clinic_id = $1 AND patient_id = $2
      FOR UPDATE`,
    [actor.clinicId, input.patientId],
  );
  const current = locked.rows[0];
  if (!current) failApp('NOT_FOUND', 404);
  const oldNumber = Number(current.file_number);
  if (oldNumber === input.newFileNumber) {
    return getPatientById(tx, actor, input.patientId, clinicToday);
  }

  const taken = await tx.query(
    `SELECT 1 FROM app_patients WHERE clinic_id = $1 AND file_number = $2`,
    [actor.clinicId, input.newFileNumber],
  );
  if (taken.rows[0] !== undefined) {
    failApp('INVALID_INPUT', 409, 'Target file number is already in use');
  }

  await tx.query(
    `UPDATE app_patients
        SET file_number = $3, is_legacy_archive_number = FALSE, version = version + 1, updated_at = now()
      WHERE clinic_id = $1 AND patient_id = $2`,
    [actor.clinicId, input.patientId, input.newFileNumber],
  );

  await tx.query(
    `INSERT INTO app_patient_file_history
       (history_id, clinic_id, patient_id, old_file_number, new_file_number, changed_by, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      newEntityId('pfh'),
      actor.clinicId,
      input.patientId,
      oldNumber,
      input.newFileNumber,
      actor.userId,
      input.reason.trim(),
    ],
  );

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'PATIENTS',
    action: 'CORRECT_FILE_NUMBER',
    entityType: 'patient',
    entityId: input.patientId,
    reason: input.reason,
    beforeSnapshot: { fileNumber: oldNumber },
    afterSnapshot: { fileNumber: input.newFileNumber },
  });

  return getPatientById(tx, actor, input.patientId, clinicToday);
}

export async function grantDoctorPatientAccess(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    patientId: string;
    doctorUserId: string;
    grantKind: 'REFERRAL' | 'COVERAGE' | 'EMERGENCY_DAY';
    validOnDate?: string;
    reason: string;
  },
  clinicToday: string,
): Promise<{ grantId: string }> {
  assertModulePermission(actor, 'patients', 'edit');
  await assertPatientAccess(tx, actor, input.patientId, clinicToday);

  if (!['REFERRAL', 'COVERAGE', 'EMERGENCY_DAY'].includes(input.grantKind)) {
    failApp('INVALID_INPUT', 400, 'Invalid grantKind');
  }
  const validOnDate = input.validOnDate !== undefined ? assertIsoDate(input.validOnDate) : null;
  if (input.grantKind === 'EMERGENCY_DAY' && validOnDate === null) {
    failApp('INVALID_INPUT', 400, 'EMERGENCY_DAY grant requires validOnDate');
  }

  const docCheck = await tx.query(
    `SELECT 1 FROM app_staff_users WHERE clinic_id = $1 AND user_id = $2 AND is_active = TRUE AND role = 'DOCTOR'`,
    [actor.clinicId, input.doctorUserId],
  );
  if (docCheck.rows[0] === undefined) {
    failApp('INVALID_INPUT', 400, 'Target doctor does not exist or is inactive');
  }

  const grantId = newEntityId('dpg');
  await tx.query(
    `INSERT INTO app_doctor_patient_grants
       (grant_id, clinic_id, patient_id, doctor_user_id, grant_kind, valid_on_date, granted_by, reason)
     VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8)`,
    [
      grantId,
      actor.clinicId,
      input.patientId,
      input.doctorUserId,
      input.grantKind,
      validOnDate,
      actor.userId,
      input.reason.trim(),
    ],
  );

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'PATIENTS',
    action: 'GRANT_DOCTOR_PATIENT_ACCESS',
    entityType: 'patient',
    entityId: input.patientId,
    reason: input.reason,
    afterSnapshot: { grantId, doctorUserId: input.doctorUserId, grantKind: input.grantKind, validOnDate },
  });

  return { grantId };
}

function sniffAllowedMime(bytes: Buffer): 'image/png' | 'image/jpeg' | 'application/pdf' {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return 'application/pdf';
  }
  failApp('INVALID_INPUT', 400, 'Unsupported file content; only PNG, JPEG, and PDF magic headers are accepted');
}

export interface AttachmentSummary {
  readonly attachmentId: string;
  readonly patientId: string;
  readonly category: 'XRAY' | 'CONSENT' | 'DOCUMENT' | 'PHOTO';
  readonly originalFilename: string;
  readonly mimeType: 'image/png' | 'image/jpeg' | 'application/pdf';
  readonly byteSize: number;
  readonly sha256Hex: string;
  readonly createdAt: string;
}

export async function uploadPatientAttachment(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  attachmentsRootDir: string,
  input: {
    patientId: string;
    category: 'XRAY' | 'CONSENT' | 'DOCUMENT' | 'PHOTO';
    originalFilename: string;
    base64Data: string;
  },
  clinicToday: string,
): Promise<AttachmentSummary> {
  assertModulePermission(actor, 'patients', 'edit');
  await assertPatientAccess(tx, actor, input.patientId, clinicToday);

  if (!['XRAY', 'CONSENT', 'DOCUMENT', 'PHOTO'].includes(input.category)) {
    failApp('INVALID_INPUT', 400, 'Invalid attachment category');
  }
  const safeName =
    typeof input.originalFilename === 'string'
      ? input.originalFilename.replace(/[^A-Za-z0-9._ -]/g, '_').trim().slice(0, 80)
      : 'attachment.bin';
  if (!safeName) failApp('INVALID_INPUT', 400, 'Invalid filename');
  if (typeof input.base64Data !== 'string' || input.base64Data.length < 8) {
    failApp('INVALID_INPUT', 400, 'base64Data is required');
  }

  const bytes = Buffer.from(input.base64Data, 'base64');
  if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) {
    failApp('INVALID_INPUT', 400, 'Attachment size must be between 1B and 5MB');
  }
  const detectedMime = sniffAllowedMime(bytes);
  const digest = sha256Hex(bytes);
  const attachmentId = newEntityId('att');
  const relDir = actor.clinicId.replace(/[^A-Za-z0-9_-]/g, '_');
  const relPath = `${relDir}/${attachmentId}.bin`;
  const fullDir = join(attachmentsRootDir, relDir);
  await mkdir(fullDir, { recursive: true });
  await writeFile(join(attachmentsRootDir, relPath), bytes);

  await tx.query(
    `INSERT INTO app_attachments
       (attachment_id, clinic_id, patient_id, category, original_filename, mime_type,
        byte_size, sha256_hex, storage_rel_path, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      attachmentId,
      actor.clinicId,
      input.patientId,
      input.category,
      safeName,
      detectedMime,
      bytes.length,
      digest,
      relPath,
      actor.userId,
    ],
  );

  return {
    attachmentId,
    patientId: input.patientId,
    category: input.category,
    originalFilename: safeName,
    mimeType: detectedMime,
    byteSize: bytes.length,
    sha256Hex: digest,
    createdAt: new Date().toISOString(),
  };
}

export async function listPatientAttachments(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  patientId: string,
  clinicToday: string,
): Promise<readonly AttachmentSummary[]> {
  assertModulePermission(actor, 'patients', 'view');
  await assertPatientAccess(tx, actor, patientId, clinicToday);
  const res = await tx.query<{
    attachment_id: string;
    patient_id: string;
    category: 'XRAY' | 'CONSENT' | 'DOCUMENT' | 'PHOTO';
    original_filename: string;
    mime_type: 'image/png' | 'image/jpeg' | 'application/pdf';
    byte_size: number;
    sha256_hex: string;
    created_at: Date;
  }>(
    `SELECT attachment_id, patient_id, category, original_filename, mime_type, byte_size, sha256_hex, created_at
       FROM app_attachments
      WHERE clinic_id = $1 AND patient_id = $2
      ORDER BY created_at DESC`,
    [actor.clinicId, patientId],
  );
  return res.rows.map(r => ({
    attachmentId: r.attachment_id,
    patientId: r.patient_id,
    category: r.category,
    originalFilename: r.original_filename,
    mimeType: r.mime_type,
    byteSize: r.byte_size,
    sha256Hex: r.sha256_hex,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function downloadPatientAttachment(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  attachmentsRootDir: string,
  attachmentId: string,
  clinicToday: string,
): Promise<{ bytes: Buffer; mimeType: string; filename: string; sha256Hex: string }> {
  assertModulePermission(actor, 'patients', 'view');
  const res = await tx.query<{
    patient_id: string;
    original_filename: string;
    mime_type: string;
    sha256_hex: string;
    storage_rel_path: string;
  }>(
    `SELECT patient_id, original_filename, mime_type, sha256_hex, storage_rel_path
       FROM app_attachments
      WHERE clinic_id = $1 AND attachment_id = $2`,
    [actor.clinicId, attachmentId],
  );
  const row = res.rows[0];
  if (!row) failApp('NOT_FOUND', 404);
  await assertPatientAccess(tx, actor, row.patient_id, clinicToday);
  const bytes = await readFile(join(attachmentsRootDir, row.storage_rel_path));
  if (sha256Hex(bytes) !== row.sha256_hex) {
    failApp('INTERNAL_ERROR', 500, 'Attachment integrity hash mismatch');
  }
  return {
    bytes,
    mimeType: row.mime_type,
    filename: row.original_filename,
    sha256Hex: row.sha256_hex,
  };
}
