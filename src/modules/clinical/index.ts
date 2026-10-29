import type { DbExecutor } from '../../platform/db.ts';
import { assertIsoDate } from '../../platform/clock.ts';
import { newEntityId } from '../../platform/crypto.ts';
import { failApp } from '../../platform/errors.ts';
import { parseMoney } from '../../finance/money.ts';
import type { Currency } from '../../finance/types.ts';
import { isFdiTooth, validateServiceTarget } from '../../clinical/index.ts';
import type { Service, Target } from '../../clinical/types.ts';
import {
  assertModulePermission,
  getClinicSettings,
  recordAuditEvent,
  type AuthenticatedActor,
} from '../governance/index.ts';
import { assertPatientAccess, getPatientById } from '../patients/index.ts';

export type ToothSurface = 'M' | 'D' | 'O' | 'I' | 'B' | 'L' | 'P';

export const FDI_UPPER_RIGHT = Object.freeze(['18', '17', '16', '15', '14', '13', '12', '11'] as const);
export const FDI_UPPER_LEFT = Object.freeze(['21', '22', '23', '24', '25', '26', '27', '28'] as const);
export const FDI_LOWER_RIGHT = Object.freeze(['48', '47', '46', '45', '44', '43', '42', '41'] as const);
export const FDI_LOWER_LEFT = Object.freeze(['31', '32', '33', '34', '35', '36', '37', '38'] as const);
export const FDI_PRIMARY_UPPER_RIGHT = Object.freeze(['55', '54', '53', '52', '51'] as const);
export const FDI_PRIMARY_UPPER_LEFT = Object.freeze(['61', '62', '63', '64', '65'] as const);
export const FDI_PRIMARY_LOWER_RIGHT = Object.freeze(['85', '84', '83', '82', '81'] as const);
export const FDI_PRIMARY_LOWER_LEFT = Object.freeze(['71', '72', '73', '74', '75'] as const);

export interface VisitProcedureRecord {
  readonly procedureId: string;
  readonly visitId: string;
  readonly patientId: string;
  readonly doctorUserId: string;
  readonly serviceCode: Service;
  readonly procedureNameAr: string;
  readonly procedureNameEn: string;
  readonly fdiTooth: string | null;
  readonly surfaces: readonly ToothSurface[];
  readonly arch: 'UPPER' | 'LOWER' | 'BOTH' | null;
  readonly plannedSessions: number;
  readonly completedSessions: number;
  readonly currency: Currency;
  readonly feeMinor: string;
  readonly clinicalNote: string;
  readonly status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  readonly isBilled: boolean;
  readonly version: number;
}

export interface VisitRecord {
  readonly visitId: string;
  readonly patientId: string;
  readonly appointmentId: string | null;
  readonly doctorUserId: string;
  readonly doctorName: string;
  readonly visitDate: string;
  readonly kind: 'INITIAL' | 'FOLLOW_UP' | 'ADJUSTMENT';
  readonly chiefComplaint: string;
  readonly clinicalNotes: string;
  readonly medicalAlertAcknowledged: boolean;
  readonly status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
  readonly procedures: readonly VisitProcedureRecord[];
  readonly version: number;
}

export interface ToothChartStatus {
  readonly tooth: string;
  readonly jaw: 'UPPER' | 'LOWER';
  readonly dentition: 'PERMANENT' | 'PRIMARY';
  readonly hasEndo: boolean;
  readonly restoredSurfaces: readonly ToothSurface[];
  readonly latestStatus: 'HEALTHY' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  readonly proceduresCount: number;
}

export interface UnifiedDentalChart {
  readonly patientId: string;
  readonly perspective: 'VIEWER_CANONICAL_NON_MIRRORED';
  readonly orthoArchStatus: 'NONE' | 'UPPER' | 'LOWER' | 'BOTH';
  readonly teeth: Readonly<Record<string, ToothChartStatus>>;
}

async function appendClinicalRevision(
  tx: DbExecutor,
  input: {
    clinicId: string;
    patientId: string;
    entityType: string;
    entityId: string;
    version: number;
    snapshot: unknown;
    actorUserId: string;
    reason: string;
  },
): Promise<void> {
  await tx.query(
    `INSERT INTO app_clinical_revisions
       (revision_id, clinic_id, patient_id, entity_type, entity_id, version, snapshot, actor_user_id, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)`,
    [
      newEntityId('crv'),
      input.clinicId,
      input.patientId,
      input.entityType,
      input.entityId,
      input.version,
      JSON.stringify(input.snapshot),
      input.actorUserId,
      input.reason,
    ],
  );
}

export async function openClinicalVisit(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    patientId: string;
    appointmentId?: string | null;
    doctorUserId?: string;
    visitDate: string;
    kind: 'INITIAL' | 'FOLLOW_UP' | 'ADJUSTMENT';
    chiefComplaint: string;
    clinicalNotes?: string;
    acknowledgeMedicalAlerts?: boolean;
  },
  clinicToday: string,
): Promise<VisitRecord> {
  assertModulePermission(actor, 'clinical', 'create');
  await assertPatientAccess(tx, actor, input.patientId, clinicToday);

  const patient = await getPatientById(tx, actor, input.patientId, clinicToday);
  if (patient.medicalHistory.hasCriticalAlert && !input.acknowledgeMedicalAlerts) {
    failApp('MEDICAL_ALERT_UNACKNOWLEDGED', 409, 'Patient has critical medical alerts requiring acknowledgment');
  }

  const visitDate = assertIsoDate(input.visitDate);
  if (!['INITIAL', 'FOLLOW_UP', 'ADJUSTMENT'].includes(input.kind)) {
    failApp('INVALID_INPUT', 400, 'Invalid visit kind');
  }
  const chiefComplaint = typeof input.chiefComplaint === 'string' ? input.chiefComplaint.trim() : '';
  if (!chiefComplaint || chiefComplaint.length > 500) {
    failApp('INVALID_INPUT', 400, 'chiefComplaint is required (1..500 chars)');
  }
  const clinicalNotes =
    typeof input.clinicalNotes === 'string' ? input.clinicalNotes.trim().slice(0, 2000) : '';

  const doctorUserId = input.doctorUserId ?? actor.userId;
  if (actor.role === 'DOCTOR' && doctorUserId !== actor.userId) {
    failApp('ACCESS_DENIED', 403, 'Doctor can only open visits under their own clinician ID');
  }
  const docExists = await tx.query(
    `SELECT 1 FROM app_staff_users
      WHERE clinic_id = $1 AND user_id = $2 AND is_active = TRUE AND role IN ('DOCTOR', 'OWNER')`,
    [actor.clinicId, doctorUserId],
  );
  if (docExists.rows[0] === undefined) {
    failApp('INVALID_INPUT', 400, 'Selected doctor is invalid');
  }

  const appointmentId = input.appointmentId ?? null;
  if (appointmentId !== null) {
    const apptRes = await tx.query<{ patient_id: string; status: string }>(
      `SELECT patient_id, status
         FROM app_appointments
        WHERE clinic_id = $1 AND appointment_id = $2
        FOR UPDATE`,
      [actor.clinicId, appointmentId],
    );
    const appt = apptRes.rows[0];
    if (!appt || appt.patient_id !== input.patientId) {
      failApp('INVALID_INPUT', 400, 'Appointment does not belong to patient');
    }
    if (appt.status === 'BOOKED' || appt.status === 'ARRIVED') {
      await tx.query(
        `UPDATE app_appointments SET status = 'IN_CHAIR', version = version + 1, updated_at = now()
          WHERE clinic_id = $1 AND appointment_id = $2`,
        [actor.clinicId, appointmentId],
      );
    }
  }

  const visitId = newEntityId('vis');
  const acked = Boolean(input.acknowledgeMedicalAlerts);

  await tx.query(
    `INSERT INTO app_visits
       (visit_id, clinic_id, patient_id, appointment_id, doctor_user_id, visit_date,
        kind, chief_complaint, clinical_notes, medical_alert_acknowledged,
        medical_alert_ack_by, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, $10, $11, 'OPEN', $12)`,
    [
      visitId,
      actor.clinicId,
      input.patientId,
      appointmentId,
      doctorUserId,
      visitDate,
      input.kind,
      chiefComplaint,
      clinicalNotes,
      acked,
      acked ? actor.userId : null,
      actor.userId,
    ],
  );

  await appendClinicalRevision(tx, {
    clinicId: actor.clinicId,
    patientId: input.patientId,
    entityType: 'visit',
    entityId: visitId,
    version: 1,
    snapshot: { visitId, visitDate, kind: input.kind, chiefComplaint, status: 'OPEN', acked },
    actorUserId: actor.userId,
    reason: 'Open clinical visit',
  });

  return getVisitById(tx, actor, visitId, clinicToday);
}

export async function addVisitProcedure(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    visitId: string;
    serviceCode: Service;
    procedureNameAr: string;
    procedureNameEn: string;
    fdiTooth?: string;
    surfaces?: readonly ToothSurface[];
    arch?: 'UPPER' | 'LOWER' | 'BOTH';
    plannedSessions?: number;
    completedSessions?: number;
    feeDecimal: string;
    currency?: Currency;
    clinicalNote: string;
  },
  clinicToday: string,
): Promise<VisitProcedureRecord> {
  assertModulePermission(actor, 'clinical', 'create');

  const visitRes = await tx.query<{
    patient_id: string;
    doctor_user_id: string;
    status: string;
    medical_alert_acknowledged: boolean;
  }>(
    `SELECT patient_id, doctor_user_id, status, medical_alert_acknowledged
       FROM app_visits
      WHERE clinic_id = $1 AND visit_id = $2
      FOR UPDATE`,
    [actor.clinicId, input.visitId],
  );
  const visit = visitRes.rows[0];
  if (!visit) failApp('NOT_FOUND', 404, 'Visit not found');
  if (visit.status !== 'OPEN') {
    failApp('INVALID_TRANSITION', 409, 'Procedures can only be added to an OPEN visit');
  }
  await assertPatientAccess(tx, actor, visit.patient_id, clinicToday);

  const patient = await getPatientById(tx, actor, visit.patient_id, clinicToday);
  if (patient.medicalHistory.hasCriticalAlert && !visit.medical_alert_acknowledged) {
    failApp('MEDICAL_ALERT_UNACKNOWLEDGED', 409, 'Acknowledge critical medical alerts before clinical procedures');
  }

  // Validate anatomical FDI target using core domain rules from `src/clinical/index.ts`
  const target: Target = {};
  if (input.fdiTooth !== undefined && input.fdiTooth !== '') {
    target.tooth = input.fdiTooth;
  }
  if (input.surfaces !== undefined && input.surfaces.length > 0) {
    target.surfaces = [...input.surfaces];
  }
  if (input.arch !== undefined) {
    target.arch = input.arch;
  }
  try {
    validateServiceTarget(input.serviceCode, target);
  } catch (err) {
    failApp('INVALID_INPUT', 400, err instanceof Error ? err.message : 'Invalid clinical target');
  }

  const nameAr = typeof input.procedureNameAr === 'string' ? input.procedureNameAr.trim() : '';
  const nameEn = typeof input.procedureNameEn === 'string' ? input.procedureNameEn.trim() : '';
  const note = typeof input.clinicalNote === 'string' ? input.clinicalNote.trim() : '';
  if (!nameAr || !nameEn || !note) {
    failApp('INVALID_INPUT', 400, 'procedureNameAr, procedureNameEn, and clinicalNote are required');
  }

  const plannedSessions = input.plannedSessions ?? 1;
  if (!Number.isInteger(plannedSessions) || plannedSessions < 1 || plannedSessions > 36) {
    failApp('INVALID_INPUT', 400, 'plannedSessions must be 1..36');
  }
  const completedSessions = input.completedSessions ?? 1;
  if (
    !Number.isInteger(completedSessions) ||
    completedSessions < 0 ||
    completedSessions > plannedSessions
  ) {
    failApp('INVALID_INPUT', 400, 'completedSessions must be between 0 and plannedSessions');
  }

  const { settings } = await getClinicSettings(tx, actor.clinicId);
  const curr: Currency = input.currency ?? settings.finance.defaultCurrency;
  let feeMinor: string;
  try {
    feeMinor = parseMoney(input.feeDecimal, curr).minor;
  } catch {
    failApp('INVALID_INPUT', 400, 'Invalid procedure fee');
  }

  const status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' =
    completedSessions === 0
      ? 'PLANNED'
      : completedSessions >= plannedSessions
        ? 'COMPLETED'
        : 'IN_PROGRESS';

  const procedureId = newEntityId('prc');
  await tx.query(
    `INSERT INTO app_visit_procedures
       (procedure_id, clinic_id, visit_id, patient_id, doctor_user_id, service_code,
        procedure_name_ar, procedure_name_en, fdi_tooth, surfaces, arch,
        planned_sessions, completed_sessions, currency, fee_minor, clinical_note, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15::bigint, $16, $17)`,
    [
      procedureId,
      actor.clinicId,
      input.visitId,
      visit.patient_id,
      visit.doctor_user_id,
      input.serviceCode,
      nameAr,
      nameEn,
      target.tooth ?? null,
      target.surfaces ? JSON.stringify(target.surfaces) : null,
      target.arch ?? null,
      plannedSessions,
      completedSessions,
      curr,
      feeMinor,
      note,
      status,
    ],
  );

  const created: VisitProcedureRecord = {
    procedureId,
    visitId: input.visitId,
    patientId: visit.patient_id,
    doctorUserId: visit.doctor_user_id,
    serviceCode: input.serviceCode,
    procedureNameAr: nameAr,
    procedureNameEn: nameEn,
    fdiTooth: target.tooth ?? null,
    surfaces: (target.surfaces as ToothSurface[] | undefined) ?? [],
    arch: (target.arch as 'UPPER' | 'LOWER' | 'BOTH' | undefined) ?? null,
    plannedSessions,
    completedSessions,
    currency: curr,
    feeMinor,
    clinicalNote: note,
    status,
    isBilled: false,
    version: 1,
  };

  await appendClinicalRevision(tx, {
    clinicId: actor.clinicId,
    patientId: visit.patient_id,
    entityType: 'visit_procedure',
    entityId: procedureId,
    version: 1,
    snapshot: created,
    actorUserId: actor.userId,
    reason: 'Record clinical procedure',
  });

  return created;
}

export async function completeClinicalVisit(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: { visitId: string; expectedVersion: number; closingNote?: string },
  clinicToday: string,
): Promise<VisitRecord> {
  assertModulePermission(actor, 'clinical', 'approve');

  const locked = await tx.query<{
    patient_id: string;
    appointment_id: string | null;
    status: string;
    clinical_notes: string;
    version: number;
  }>(
    `SELECT patient_id, appointment_id, status, clinical_notes, version
       FROM app_visits
      WHERE clinic_id = $1 AND visit_id = $2
      FOR UPDATE`,
    [actor.clinicId, input.visitId],
  );
  const visit = locked.rows[0];
  if (!visit) failApp('NOT_FOUND', 404);
  await assertPatientAccess(tx, actor, visit.patient_id, clinicToday);
  if (visit.version !== input.expectedVersion) {
    failApp('STALE_VERSION', 409, 'Visit version conflict');
  }
  if (visit.status !== 'OPEN') {
    failApp('INVALID_TRANSITION', 409, 'Visit is not OPEN');
  }

  const procs = await tx.query<{ status: string }>(
    `SELECT status FROM app_visit_procedures WHERE clinic_id = $1 AND visit_id = $2`,
    [actor.clinicId, input.visitId],
  );
  if (
    procs.rows.length === 0 ||
    procs.rows.some(p => p.status === 'PLANNED')
  ) {
    failApp('INCOMPLETE_PROCEDURES', 409, 'At least one active/completed procedure is required to close visit');
  }

  const nextNotes = input.closingNote?.trim()
    ? `${visit.clinical_notes}\n${input.closingNote.trim()}`.trim()
    : visit.clinical_notes;
  const nextVersion = visit.version + 1;

  await tx.query(
    `UPDATE app_visits
        SET status = 'COMPLETED', clinical_notes = $3, version = $4, updated_at = now()
      WHERE clinic_id = $1 AND visit_id = $2`,
    [actor.clinicId, input.visitId, nextNotes, nextVersion],
  );

  if (visit.appointment_id !== null) {
    await tx.query(
      `UPDATE app_appointments
          SET status = 'COMPLETED', version = version + 1, updated_at = now()
        WHERE clinic_id = $1 AND appointment_id = $2 AND status IN ('BOOKED', 'ARRIVED', 'IN_CHAIR')`,
      [actor.clinicId, visit.appointment_id],
    );
  }

  await appendClinicalRevision(tx, {
    clinicId: actor.clinicId,
    patientId: visit.patient_id,
    entityType: 'visit',
    entityId: input.visitId,
    version: nextVersion,
    snapshot: { status: 'COMPLETED', clinicalNotes: nextNotes },
    actorUserId: actor.userId,
    reason: 'Complete clinical visit',
  });

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'CLINICAL',
    action: 'COMPLETE_VISIT',
    entityType: 'visit',
    entityId: input.visitId,
    reason: 'Clinical visit completed',
  });

  return getVisitById(tx, actor, input.visitId, clinicToday);
}

export async function getVisitById(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  visitId: string,
  clinicToday: string,
): Promise<VisitRecord> {
  assertModulePermission(actor, 'clinical', 'view');
  const res = await tx.query<{
    visit_id: string;
    patient_id: string;
    appointment_id: string | null;
    doctor_user_id: string;
    doctor_name: string;
    visit_date: string;
    kind: 'INITIAL' | 'FOLLOW_UP' | 'ADJUSTMENT';
    chief_complaint: string;
    clinical_notes: string;
    medical_alert_acknowledged: boolean;
    status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
    version: number;
  }>(
    `SELECT v.visit_id, v.patient_id, v.appointment_id, v.doctor_user_id,
            d.display_name AS doctor_name, v.visit_date::text AS visit_date,
            v.kind, v.chief_complaint, v.clinical_notes,
            v.medical_alert_acknowledged, v.status, v.version
       FROM app_visits v
       JOIN app_staff_users d ON d.user_id = v.doctor_user_id
      WHERE v.clinic_id = $1 AND v.visit_id = $2`,
    [actor.clinicId, visitId],
  );
  const v = res.rows[0];
  if (!v) failApp('NOT_FOUND', 404);
  await assertPatientAccess(tx, actor, v.patient_id, clinicToday);

  const procs = await listProceduresForVisit(tx, actor.clinicId, visitId);
  return {
    visitId: v.visit_id,
    patientId: v.patient_id,
    appointmentId: v.appointment_id,
    doctorUserId: v.doctor_user_id,
    doctorName: v.doctor_name,
    visitDate: v.visit_date.slice(0, 10),
    kind: v.kind,
    chiefComplaint: v.chief_complaint,
    clinicalNotes: v.clinical_notes,
    medicalAlertAcknowledged: v.medical_alert_acknowledged,
    status: v.status,
    procedures: procs,
    version: v.version,
  };
}

async function listProceduresForVisit(
  tx: DbExecutor,
  clinicId: string,
  visitId: string,
): Promise<readonly VisitProcedureRecord[]> {
  const res = await tx.query<{
    procedure_id: string;
    visit_id: string;
    patient_id: string;
    doctor_user_id: string;
    service_code: Service;
    procedure_name_ar: string;
    procedure_name_en: string;
    fdi_tooth: string | null;
    surfaces: ToothSurface[] | null;
    arch: 'UPPER' | 'LOWER' | 'BOTH' | null;
    planned_sessions: number;
    completed_sessions: number;
    currency: Currency;
    fee_minor: string;
    clinical_note: string;
    status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    is_billed: boolean;
    version: number;
  }>(
    `SELECT p.procedure_id, p.visit_id, p.patient_id, p.doctor_user_id, p.service_code,
            p.procedure_name_ar, p.procedure_name_en, p.fdi_tooth, p.surfaces, p.arch,
            p.planned_sessions, p.completed_sessions, p.currency, p.fee_minor::text,
            p.clinical_note, p.status, p.version,
            EXISTS (
              SELECT 1 FROM app_invoice_lines il
               WHERE il.clinic_id = p.clinic_id
                 AND il.visit_procedure_id = p.procedure_id
                 AND il.is_active_billing = TRUE
            ) AS is_billed
       FROM app_visit_procedures p
      WHERE p.clinic_id = $1 AND p.visit_id = $2
      ORDER BY p.created_at ASC`,
    [clinicId, visitId],
  );
  return res.rows.map(r => ({
    procedureId: r.procedure_id,
    visitId: r.visit_id,
    patientId: r.patient_id,
    doctorUserId: r.doctor_user_id,
    serviceCode: r.service_code,
    procedureNameAr: r.procedure_name_ar,
    procedureNameEn: r.procedure_name_en,
    fdiTooth: r.fdi_tooth,
    surfaces: r.surfaces ?? [],
    arch: r.arch,
    plannedSessions: r.planned_sessions,
    completedSessions: r.completed_sessions,
    currency: r.currency,
    feeMinor: r.fee_minor,
    clinicalNote: r.clinical_note,
    status: r.status,
    isBilled: r.is_billed,
    version: r.version,
  }));
}

export async function listPatientVisits(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  patientId: string,
  clinicToday: string,
): Promise<readonly VisitRecord[]> {
  assertModulePermission(actor, 'clinical', 'view');
  await assertPatientAccess(tx, actor, patientId, clinicToday);

  const res = await tx.query<{ visit_id: string }>(
    `SELECT visit_id FROM app_visits
      WHERE clinic_id = $1 AND patient_id = $2
      ORDER BY visit_date DESC, created_at DESC`,
    [actor.clinicId, patientId],
  );
  const visits: VisitRecord[] = [];
  for (const row of res.rows) {
    visits.push(await getVisitById(tx, actor, row.visit_id, clinicToday));
  }
  return visits;
}

export async function buildUnifiedDentalChart(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  patientId: string,
  clinicToday: string,
): Promise<UnifiedDentalChart> {
  assertModulePermission(actor, 'clinical', 'view');
  await assertPatientAccess(tx, actor, patientId, clinicToday);

  const allTeeth = [
    ...FDI_UPPER_RIGHT,
    ...FDI_UPPER_LEFT,
    ...FDI_PRIMARY_UPPER_RIGHT,
    ...FDI_PRIMARY_UPPER_LEFT,
    ...FDI_PRIMARY_LOWER_RIGHT,
    ...FDI_PRIMARY_LOWER_LEFT,
    ...FDI_LOWER_RIGHT,
    ...FDI_LOWER_LEFT,
  ];

  const teethMap: Record<
    string,
    {
      tooth: string;
      jaw: 'UPPER' | 'LOWER';
      dentition: 'PERMANENT' | 'PRIMARY';
      hasEndo: boolean;
      restoredSurfaces: Set<ToothSurface>;
      latestStatus: 'HEALTHY' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
      proceduresCount: number;
    }
  > = {};

  for (const t of allTeeth) {
    const q = Number(t[0]);
    const isUpper = q === 1 || q === 2 || q === 5 || q === 6;
    const isPerm = q >= 1 && q <= 4;
    teethMap[t] = {
      tooth: t,
      jaw: isUpper ? 'UPPER' : 'LOWER',
      dentition: isPerm ? 'PERMANENT' : 'PRIMARY',
      hasEndo: false,
      restoredSurfaces: new Set<ToothSurface>(),
      latestStatus: 'HEALTHY',
      proceduresCount: 0,
    };
  }

  const procs = await tx.query<{
    service_code: Service;
    fdi_tooth: string | null;
    surfaces: ToothSurface[] | null;
    arch: 'UPPER' | 'LOWER' | 'BOTH' | null;
    status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  }>(
    `SELECT service_code, fdi_tooth, surfaces, arch, status
       FROM app_visit_procedures
      WHERE clinic_id = $1 AND patient_id = $2 AND status <> 'CANCELLED'
      ORDER BY created_at ASC`,
    [actor.clinicId, patientId],
  );

  let orthoArchStatus: 'NONE' | 'UPPER' | 'LOWER' | 'BOTH' = 'NONE';
  for (const p of procs.rows) {
    if (p.service_code === 'ORTHO' && p.arch) {
      if (orthoArchStatus === 'NONE' || orthoArchStatus === p.arch) {
        orthoArchStatus = p.arch;
      } else {
        orthoArchStatus = 'BOTH';
      }
    }
    if (p.fdi_tooth && isFdiTooth(p.fdi_tooth)) {
      const entry = teethMap[p.fdi_tooth];
      if (entry && p.status !== 'CANCELLED') {
        entry.proceduresCount += 1;
        if (p.service_code === 'ENDO') {
          entry.hasEndo = true;
        }
        if (p.surfaces) {
          for (const s of p.surfaces) entry.restoredSurfaces.add(s);
        }
        entry.latestStatus = p.status;
      }
    }
  }

  const frozenTeeth: Record<string, ToothChartStatus> = {};
  for (const [k, v] of Object.entries(teethMap)) {
    frozenTeeth[k] = Object.freeze({
      tooth: v.tooth,
      jaw: v.jaw,
      dentition: v.dentition,
      hasEndo: v.hasEndo,
      restoredSurfaces: Object.freeze([...v.restoredSurfaces]),
      latestStatus: v.latestStatus,
      proceduresCount: v.proceduresCount,
    });
  }

  return Object.freeze({
    patientId,
    perspective: 'VIEWER_CANONICAL_NON_MIRRORED',
    orthoArchStatus,
    teeth: Object.freeze(frozenTeeth),
  });
}
