import type { DbExecutor } from '../../platform/db.ts';
import {
  assertIsoDate,
  calendarWeekday,
  formatMinutesAsHHMM,
  parseHHMMToMinutes,
} from '../../platform/clock.ts';
import { newEntityId } from '../../platform/crypto.ts';
import { failApp } from '../../platform/errors.ts';
import {
  assertModulePermission,
  getClinicSettings,
  recordAuditEvent,
  type AuthenticatedActor,
} from '../governance/index.ts';
import { assertPatientAccess } from '../patients/index.ts';

export type AppointmentKind = 'CONSULTATION' | 'TREATMENT' | 'FOLLOW_UP' | 'EMERGENCY';
export type AppointmentStatus = 'BOOKED' | 'ARRIVED' | 'IN_CHAIR' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface AppointmentRecord {
  readonly appointmentId: string;
  readonly patientId: string;
  readonly patientFileNumber: number;
  readonly patientName: string;
  readonly doctorUserId: string;
  readonly doctorName: string;
  readonly appointmentDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly chairNo: number;
  readonly kind: AppointmentKind;
  readonly status: AppointmentStatus;
  readonly reason: string;
  readonly cancelReason: string | null;
  readonly version: number;
}

export async function createDoctorLeave(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    doctorUserId: string;
    startDate: string;
    endDate: string;
    reason: string;
  },
): Promise<{ leaveId: string }> {
  assertModulePermission(actor, 'appointments', 'approve');
  const startDate = assertIsoDate(input.startDate);
  const endDate = assertIsoDate(input.endDate);
  if (endDate < startDate) {
    failApp('INVALID_INPUT', 400, 'endDate must be >= startDate');
  }
  if (typeof input.reason !== 'string' || !input.reason.trim()) {
    failApp('INVALID_INPUT', 400, 'Leave reason is required');
  }
  const docRes = await tx.query(
    `SELECT 1 FROM app_staff_users WHERE clinic_id = $1 AND user_id = $2 AND role IN ('DOCTOR', 'OWNER')`,
    [actor.clinicId, input.doctorUserId],
  );
  if (docRes.rows[0] === undefined) {
    failApp('INVALID_INPUT', 400, 'Doctor not found');
  }

  const leaveId = newEntityId('dlv');
  await tx.query(
    `INSERT INTO app_doctor_leaves
       (leave_id, clinic_id, doctor_user_id, start_date, end_date, reason, status, approved_by)
     VALUES ($1, $2, $3, $4::date, $5::date, $6, 'APPROVED', $7)`,
    [leaveId, actor.clinicId, input.doctorUserId, startDate, endDate, input.reason.trim(), actor.userId],
  );

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'APPOINTMENTS',
    action: 'APPROVE_DOCTOR_LEAVE',
    entityType: 'doctor_leave',
    entityId: leaveId,
    reason: input.reason,
    afterSnapshot: { doctorUserId: input.doctorUserId, startDate, endDate },
  });

  return { leaveId };
}

export async function createAppointment(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    patientId: string;
    doctorUserId: string;
    appointmentDate: string;
    startTime: string;
    endTime?: string;
    chairNo: number;
    kind: AppointmentKind;
    reason?: string;
  },
  clinicToday: string,
): Promise<AppointmentRecord> {
  assertModulePermission(actor, 'appointments', 'create');

  if (actor.role === 'DOCTOR') {
    if (input.doctorUserId !== actor.userId) {
      failApp('ACCESS_DENIED', 403, 'Doctor can only schedule appointments for themselves');
    }
    await assertPatientAccess(tx, actor, input.patientId, clinicToday);
  } else {
    const patExists = await tx.query(
      `SELECT 1 FROM app_patients WHERE clinic_id = $1 AND patient_id = $2`,
      [actor.clinicId, input.patientId],
    );
    if (patExists.rows[0] === undefined) {
      failApp('NOT_FOUND', 404, 'Patient not found');
    }
  }

  const docExists = await tx.query(
    `SELECT 1 FROM app_staff_users
      WHERE clinic_id = $1 AND user_id = $2 AND is_active = TRUE AND role IN ('DOCTOR', 'OWNER')`,
    [actor.clinicId, input.doctorUserId],
  );
  if (docExists.rows[0] === undefined) {
    failApp('INVALID_INPUT', 400, 'Selected doctor is invalid or inactive');
  }

  if (!['CONSULTATION', 'TREATMENT', 'FOLLOW_UP', 'EMERGENCY'].includes(input.kind)) {
    failApp('INVALID_INPUT', 400, 'Invalid appointment kind');
  }

  const { settings } = await getClinicSettings(tx, actor.clinicId);
  const appointmentDate = assertIsoDate(input.appointmentDate);
  const weekday = calendarWeekday(appointmentDate);
  if (settings.schedule.closedWeekdays.includes(weekday)) {
    failApp('CLINIC_CLOSED_DAY', 409, `Clinic is closed on weekday ${weekday}`);
  }

  const startMin = parseHHMMToMinutes(input.startTime);
  const endMin =
    input.endTime !== undefined && input.endTime !== ''
      ? parseHHMMToMinutes(input.endTime)
      : startMin + settings.schedule.defaultSlotMinutes;
  if (endMin <= startMin || endMin - startMin > 360) {
    failApp('INVALID_INPUT', 400, 'Invalid appointment duration');
  }

  const dayStartMin = parseHHMMToMinutes(settings.schedule.dayStart);
  const dayEndMin = parseHHMMToMinutes(settings.schedule.dayEnd);
  if (startMin < dayStartMin || endMin > dayEndMin) {
    failApp('OUTSIDE_WORKING_HOURS', 409, 'Requested slot is outside clinic working hours');
  }

  const chairNo = Number(input.chairNo);
  if (!Number.isInteger(chairNo) || chairNo < 1) {
    failApp('INVALID_INPUT', 400, 'chairNo must be >= 1');
  }
  if (chairNo > settings.schedule.chairsCount) {
    failApp('CHAIR_CAPACITY_FULL', 409, `Requested chair ${chairNo} exceeds configured ${settings.schedule.chairsCount} chairs`);
  }

  // Serialize booking checks per clinic + calendar day inside the transaction
  await tx.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [
    actor.clinicId,
    `appt:${appointmentDate}`,
  ]);

  const leaveRes = await tx.query(
    `SELECT 1 FROM app_doctor_leaves
      WHERE clinic_id = $1
        AND doctor_user_id = $2
        AND status = 'APPROVED'
        AND $3::date BETWEEN start_date AND end_date
      LIMIT 1`,
    [actor.clinicId, input.doctorUserId, appointmentDate],
  );
  if (leaveRes.rows[0] !== undefined) {
    failApp('DOCTOR_ON_LEAVE', 409, 'Doctor is on approved leave');
  }

  const overlaps = await tx.query<{ doctor_user_id: string; chair_no: number }>(
    `SELECT doctor_user_id, chair_no
       FROM app_appointments
      WHERE clinic_id = $1
        AND appointment_date = $2::date
        AND status NOT IN ('CANCELLED', 'NO_SHOW')
        AND start_minute < $4
        AND end_minute > $3`,
    [actor.clinicId, appointmentDate, startMin, endMin],
  );

  if (overlaps.rows.some(r => r.doctor_user_id === input.doctorUserId)) {
    failApp('DOCTOR_TIME_OVERLAP', 409, 'Doctor already has an appointment in this window');
  }
  if (
    overlaps.rows.some(r => r.chair_no === chairNo) ||
    overlaps.rows.length >= settings.schedule.chairsCount
  ) {
    failApp('CHAIR_CAPACITY_FULL', 409, 'Chair or clinic chair capacity is full in this window');
  }

  const appointmentId = newEntityId('apt');
  const reasonText = typeof input.reason === 'string' ? input.reason.trim().slice(0, 300) : '';

  await tx.query(
    `INSERT INTO app_appointments
       (appointment_id, clinic_id, patient_id, doctor_user_id, appointment_date,
        start_minute, end_minute, chair_no, kind, status, reason, created_by)
     VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $9, 'BOOKED', $10, $11)`,
    [
      appointmentId,
      actor.clinicId,
      input.patientId,
      input.doctorUserId,
      appointmentDate,
      startMin,
      endMin,
      chairNo,
      input.kind,
      reasonText,
      actor.userId,
    ],
  );

  // Transactional Outbox (governed live by `comms.outboxEnabled` and `comms.defaultChannel`)
  await tx.query(
    `INSERT INTO app_outbox_messages
       (message_id, clinic_id, channel, template_key, recipient_patient_id, payload, status)
     VALUES ($1, $2, $3, 'APPOINTMENT_CONFIRMATION', $4, $5::jsonb, $6)`,
    [
      newEntityId('obx'),
      actor.clinicId,
      settings.comms.defaultChannel,
      input.patientId,
      JSON.stringify({
        appointmentId,
        appointmentDate,
        startTime: formatMinutesAsHHMM(startMin),
        chairNo,
      }),
      settings.comms.outboxEnabled ? 'QUEUED' : 'SUPPRESSED',
    ],
  );

  return getAppointmentById(tx, actor, appointmentId, clinicToday);
}

export async function getAppointmentById(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  appointmentId: string,
  clinicToday: string,
): Promise<AppointmentRecord> {
  assertModulePermission(actor, 'appointments', 'view');
  const res = await tx.query<{
    appointment_id: string;
    patient_id: string;
    file_number: string;
    patient_name: string;
    doctor_user_id: string;
    doctor_name: string;
    appointment_date: Date | string;
    start_minute: number;
    end_minute: number;
    chair_no: number;
    kind: AppointmentKind;
    status: AppointmentStatus;
    reason: string;
    cancel_reason: string | null;
    version: number;
  }>(
    `SELECT a.appointment_id, a.patient_id, p.file_number::text, p.full_name AS patient_name,
            a.doctor_user_id, d.display_name AS doctor_name,
            a.appointment_date::text AS appointment_date,
            a.start_minute, a.end_minute, a.chair_no, a.kind, a.status,
            a.reason, a.cancel_reason, a.version
       FROM app_appointments a
       JOIN app_patients p ON p.patient_id = a.patient_id
       JOIN app_staff_users d ON d.user_id = a.doctor_user_id
      WHERE a.clinic_id = $1 AND a.appointment_id = $2`,
    [actor.clinicId, appointmentId],
  );
  const row = res.rows[0];
  if (!row) failApp('NOT_FOUND', 404);
  if (actor.role === 'DOCTOR') {
    await assertPatientAccess(tx, actor, row.patient_id, clinicToday);
  }
  return {
    appointmentId: row.appointment_id,
    patientId: row.patient_id,
    patientFileNumber: Number(row.file_number),
    patientName: row.patient_name,
    doctorUserId: row.doctor_user_id,
    doctorName: row.doctor_name,
    appointmentDate: String(row.appointment_date).slice(0, 10),
    startTime: formatMinutesAsHHMM(row.start_minute),
    endTime: formatMinutesAsHHMM(row.end_minute),
    chairNo: row.chair_no,
    kind: row.kind,
    status: row.status,
    reason: row.reason,
    cancelReason: row.cancel_reason,
    version: row.version,
  };
}

export async function updateAppointmentStatus(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    appointmentId: string;
    expectedVersion: number;
    nextStatus: AppointmentStatus;
    reason?: string;
  },
  clinicToday: string,
): Promise<AppointmentRecord> {
  if (input.nextStatus === 'CANCELLED' || input.nextStatus === 'NO_SHOW') {
    assertModulePermission(actor, 'appointments', 'cancel');
  } else {
    assertModulePermission(actor, 'appointments', 'edit');
  }

  const locked = await tx.query<{
    patient_id: string;
    doctor_user_id: string;
    status: AppointmentStatus;
    version: number;
  }>(
    `SELECT patient_id, doctor_user_id, status, version
       FROM app_appointments
      WHERE clinic_id = $1 AND appointment_id = $2
      FOR UPDATE`,
    [actor.clinicId, input.appointmentId],
  );
  const row = locked.rows[0];
  if (!row) failApp('NOT_FOUND', 404);
  if (actor.role === 'DOCTOR') {
    await assertPatientAccess(tx, actor, row.patient_id, clinicToday);
  }
  if (row.version !== input.expectedVersion) {
    failApp('STALE_VERSION', 409, 'Appointment version conflict');
  }

  const allowedTransitions: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
    BOOKED: ['ARRIVED', 'IN_CHAIR', 'CANCELLED', 'NO_SHOW'],
    ARRIVED: ['IN_CHAIR', 'CANCELLED', 'NO_SHOW'],
    IN_CHAIR: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
    NO_SHOW: [],
  };
  if (!allowedTransitions[row.status]?.includes(input.nextStatus)) {
    failApp('INVALID_TRANSITION', 409, `Cannot transition appointment from ${row.status} to ${input.nextStatus}`);
  }

  let cancelReason: string | null = null;
  if (input.nextStatus === 'CANCELLED' || input.nextStatus === 'NO_SHOW') {
    if (typeof input.reason !== 'string' || !input.reason.trim()) {
      failApp('INVALID_INPUT', 400, 'Cancellation or no-show reason is required');
    }
    cancelReason = input.reason.trim();
  }

  await tx.query(
    `UPDATE app_appointments
        SET status = $3,
            cancel_reason = COALESCE($4, cancel_reason),
            version = version + 1,
            updated_at = now()
      WHERE clinic_id = $1 AND appointment_id = $2`,
    [actor.clinicId, input.appointmentId, input.nextStatus, cancelReason],
  );

  if (cancelReason !== null) {
    await recordAuditEvent(tx, {
      clinicId: actor.clinicId,
      actorUserId: actor.userId,
      category: 'APPOINTMENTS',
      action: `APPOINTMENT_${input.nextStatus}`,
      entityType: 'appointment',
      entityId: input.appointmentId,
      reason: cancelReason,
      beforeSnapshot: { status: row.status },
      afterSnapshot: { status: input.nextStatus },
    });
  }

  return getAppointmentById(tx, actor, input.appointmentId, clinicToday);
}

export async function listAppointmentsForDate(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  dateIso: string,
  clinicToday: string,
): Promise<readonly AppointmentRecord[]> {
  assertModulePermission(actor, 'appointments', 'view');
  const checkedDate = assertIsoDate(dateIso);
  const checkedToday = assertIsoDate(clinicToday);

  const params: unknown[] = [actor.clinicId, checkedDate];
  let scopeSql = '';
  if (actor.role === 'DOCTOR') {
    params.push(actor.userId);
    const docIdx = params.length;
    if (actor.doctorPatientScope === 'own') {
      scopeSql = `AND p.primary_doctor_user_id = $${docIdx}`;
    } else {
      params.push(checkedToday);
      const dayIdx = params.length;
      scopeSql = `AND (
        a.doctor_user_id = $${docIdx}
        OR p.primary_doctor_user_id = $${docIdx}
        OR EXISTS (
          SELECT 1 FROM app_doctor_patient_grants g
           WHERE g.clinic_id = a.clinic_id
             AND g.patient_id = a.patient_id
             AND g.doctor_user_id = $${docIdx}
             AND g.revoked_at IS NULL
             AND (g.valid_on_date IS NULL OR g.valid_on_date = $${dayIdx}::date)
        )
      )`;
    }
  }

  const res = await tx.query<{
    appointment_id: string;
    patient_id: string;
    file_number: string;
    patient_name: string;
    doctor_user_id: string;
    doctor_name: string;
    appointment_date: string;
    start_minute: number;
    end_minute: number;
    chair_no: number;
    kind: AppointmentKind;
    status: AppointmentStatus;
    reason: string;
    cancel_reason: string | null;
    version: number;
  }>(
    `SELECT a.appointment_id, a.patient_id, p.file_number::text, p.full_name AS patient_name,
            a.doctor_user_id, d.display_name AS doctor_name,
            a.appointment_date::text AS appointment_date,
            a.start_minute, a.end_minute, a.chair_no, a.kind, a.status,
            a.reason, a.cancel_reason, a.version
       FROM app_appointments a
       JOIN app_patients p ON p.patient_id = a.patient_id
       JOIN app_staff_users d ON d.user_id = a.doctor_user_id
      WHERE a.clinic_id = $1
        AND a.appointment_date = $2::date
        ${scopeSql}
      ORDER BY a.start_minute ASC, a.chair_no ASC`,
    params,
  );

  return res.rows.map(row => ({
    appointmentId: row.appointment_id,
    patientId: row.patient_id,
    patientFileNumber: Number(row.file_number),
    patientName: row.patient_name,
    doctorUserId: row.doctor_user_id,
    doctorName: row.doctor_name,
    appointmentDate: row.appointment_date.slice(0, 10),
    startTime: formatMinutesAsHHMM(row.start_minute),
    endTime: formatMinutesAsHHMM(row.end_minute),
    chairNo: row.chair_no,
    kind: row.kind,
    status: row.status,
    reason: row.reason,
    cancelReason: row.cancel_reason,
    version: row.version,
  }));
}

export async function listOutboxMessages(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  limit = 40,
): Promise<
  readonly {
    messageId: string;
    channel: string;
    templateKey: string;
    recipientPatientId: string | null;
    status: string;
    payload: unknown;
    createdAt: string;
  }[]
> {
  assertModulePermission(actor, 'governance', 'view');
  const res = await tx.query<{
    message_id: string;
    channel: string;
    template_key: string;
    recipient_patient_id: string | null;
    status: string;
    payload: unknown;
    created_at: Date;
  }>(
    `SELECT message_id, channel, template_key, recipient_patient_id, status, payload, created_at
       FROM app_outbox_messages
      WHERE clinic_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [actor.clinicId, Math.max(1, Math.min(limit, 100))],
  );
  return res.rows.map(r => ({
    messageId: r.message_id,
    channel: r.channel,
    templateKey: r.template_key,
    recipientPatientId: r.recipient_patient_id,
    status: r.status,
    payload: r.payload,
    createdAt: r.created_at.toISOString(),
  }));
}
