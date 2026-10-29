-- 0001_slice1_core.sql
-- Single authoritative Slice 1 schema for Aqlan Dental Center (isolated `aqlan_app` namespace).

CREATE SCHEMA IF NOT EXISTS aqlan_app;
SET LOCAL search_path TO aqlan_app, pg_catalog;

CREATE OR REPLACE FUNCTION aqlan_app.forbid_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'APPEND_ONLY_VIOLATION on %.%', TG_TABLE_SCHEMA, TG_TABLE_NAME
    USING ERRCODE = '23514';
END;
$$;

CREATE OR REPLACE FUNCTION aqlan_app.forbid_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'DELETE_FORBIDDEN on %.%', TG_TABLE_SCHEMA, TG_TABLE_NAME
    USING ERRCODE = '23514';
END;
$$;

-- Canonical sequences (Patient file numbers start strictly at 7000 for new patients)
CREATE SEQUENCE IF NOT EXISTS aqlan_app.app_patient_file_seq
  AS BIGINT START WITH 7000 INCREMENT BY 1 MINVALUE 7000 NO MAXVALUE CACHE 1;

CREATE SEQUENCE IF NOT EXISTS aqlan_app.app_invoice_no_seq
  AS BIGINT START WITH 1001 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;

CREATE SEQUENCE IF NOT EXISTS aqlan_app.app_receipt_no_seq
  AS BIGINT START WITH 5001 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;

CREATE SEQUENCE IF NOT EXISTS aqlan_app.app_lab_order_no_seq
  AS BIGINT START WITH 3001 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS aqlan_app.app_clinics (
  clinic_id TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS aqlan_app.app_persons (
  person_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_persons_clinic_idx ON aqlan_app.app_persons(clinic_id);

CREATE TABLE IF NOT EXISTS aqlan_app.app_staff_users (
  user_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  person_id TEXT NOT NULL REFERENCES aqlan_app.app_persons(person_id),
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'DOCTOR', 'RECEPTION', 'CASHIER', 'ASSISTANT')),
  is_primary_owner BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  password_hash TEXT NOT NULL,
  doctor_patient_scope TEXT NOT NULL DEFAULT 'own' CHECK (doctor_patient_scope IN ('own', 'authorized')),
  hidden_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  permissions JSONB NOT NULL,
  preferred_language TEXT CHECK (preferred_language IS NULL OR preferred_language IN ('ar', 'en')),
  authority_version INTEGER NOT NULL DEFAULT 1 CHECK (authority_version >= 1),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, username),
  CHECK (NOT is_primary_owner OR (is_active = TRUE AND role = 'OWNER'))
);

CREATE UNIQUE INDEX IF NOT EXISTS app_staff_primary_owner_uq
  ON aqlan_app.app_staff_users(clinic_id)
  WHERE is_primary_owner = TRUE;

CREATE INDEX IF NOT EXISTS app_staff_clinic_role_idx
  ON aqlan_app.app_staff_users(clinic_id, role, is_active);

CREATE TABLE IF NOT EXISTS aqlan_app.app_sessions (
  session_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  user_id TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  token_sha256 TEXT NOT NULL UNIQUE,
  csrf_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS app_sessions_user_idx ON aqlan_app.app_sessions(user_id);

CREATE TABLE IF NOT EXISTS aqlan_app.app_login_attempts (
  attempt_id BIGSERIAL PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  bucket_key TEXT NOT NULL,
  succeeded BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_login_attempts_lookup_idx
  ON aqlan_app.app_login_attempts(clinic_id, bucket_key, attempted_at DESC);

CREATE TABLE IF NOT EXISTS aqlan_app.app_clinic_settings (
  clinic_id TEXT PRIMARY KEY REFERENCES aqlan_app.app_clinics(clinic_id),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  settings JSONB NOT NULL,
  updated_by TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS aqlan_app.app_audit_events (
  audit_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  actor_user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  before_snapshot JSONB,
  after_snapshot JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_audit_events_clinic_time_idx
  ON aqlan_app.app_audit_events(clinic_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS app_audit_events_entity_idx
  ON aqlan_app.app_audit_events(clinic_id, entity_type, entity_id);

DROP TRIGGER IF EXISTS app_audit_events_immutable ON aqlan_app.app_audit_events;
CREATE TRIGGER app_audit_events_immutable
  BEFORE UPDATE OR DELETE ON aqlan_app.app_audit_events
  FOR EACH ROW EXECUTE FUNCTION aqlan_app.forbid_mutation();

DROP TRIGGER IF EXISTS app_audit_events_no_truncate ON aqlan_app.app_audit_events;
CREATE TRIGGER app_audit_events_no_truncate
  BEFORE TRUNCATE ON aqlan_app.app_audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION aqlan_app.forbid_mutation();

CREATE TABLE IF NOT EXISTS aqlan_app.app_idempotency_keys (
  clinic_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, scope, idempotency_key)
);

-- Patients & Clinical Governance
CREATE TABLE IF NOT EXISTS aqlan_app.app_patients (
  patient_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  person_id TEXT NOT NULL REFERENCES aqlan_app.app_persons(person_id),
  file_number BIGINT NOT NULL CHECK (file_number >= 1),
  is_legacy_archive_number BOOLEAN NOT NULL DEFAULT FALSE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('MALE', 'FEMALE')),
  birth_year INTEGER CHECK (birth_year IS NULL OR (birth_year >= 1900 AND birth_year <= 2100)),
  notes TEXT NOT NULL DEFAULT '',
  primary_doctor_user_id TEXT REFERENCES aqlan_app.app_staff_users(user_id),
  opening_balance_currency TEXT NOT NULL DEFAULT 'YER' CHECK (opening_balance_currency IN ('YER', 'SAR', 'USD')),
  opening_balance_minor BIGINT NOT NULL DEFAULT 0 CHECK (opening_balance_minor >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, file_number),
  CHECK ((is_legacy_archive_number = FALSE AND file_number >= 7000) OR (is_legacy_archive_number = TRUE AND file_number < 7000))
);

CREATE INDEX IF NOT EXISTS app_patients_clinic_name_idx ON aqlan_app.app_patients(clinic_id, full_name);
CREATE INDEX IF NOT EXISTS app_patients_clinic_phone_idx ON aqlan_app.app_patients(clinic_id, phone);
CREATE INDEX IF NOT EXISTS app_patients_primary_doc_idx ON aqlan_app.app_patients(clinic_id, primary_doctor_user_id);

DROP TRIGGER IF EXISTS app_patients_no_delete ON aqlan_app.app_patients;
CREATE TRIGGER app_patients_no_delete
  BEFORE DELETE ON aqlan_app.app_patients
  FOR EACH ROW EXECUTE FUNCTION aqlan_app.forbid_delete();

CREATE TABLE IF NOT EXISTS aqlan_app.app_patient_file_history (
  history_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  patient_id TEXT NOT NULL REFERENCES aqlan_app.app_patients(patient_id),
  old_file_number BIGINT NOT NULL,
  new_file_number BIGINT NOT NULL,
  changed_by TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  reason TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_patient_file_hist_old_idx
  ON aqlan_app.app_patient_file_history(clinic_id, old_file_number);
CREATE INDEX IF NOT EXISTS app_patient_file_hist_patient_idx
  ON aqlan_app.app_patient_file_history(patient_id);

CREATE TABLE IF NOT EXISTS aqlan_app.app_doctor_patient_grants (
  grant_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  patient_id TEXT NOT NULL REFERENCES aqlan_app.app_patients(patient_id),
  doctor_user_id TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  grant_kind TEXT NOT NULL CHECK (grant_kind IN ('REFERRAL', 'COVERAGE', 'EMERGENCY_DAY')),
  valid_on_date DATE,
  revoked_at TIMESTAMPTZ,
  granted_by TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_doc_grants_lookup_idx
  ON aqlan_app.app_doctor_patient_grants(clinic_id, patient_id, doctor_user_id);
CREATE INDEX IF NOT EXISTS app_doc_grants_doc_idx
  ON aqlan_app.app_doctor_patient_grants(clinic_id, doctor_user_id);

CREATE TABLE IF NOT EXISTS aqlan_app.app_patient_medical_history (
  patient_id TEXT PRIMARY KEY REFERENCES aqlan_app.app_patients(patient_id),
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
  chronic_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_pregnant BOOLEAN NOT NULL DEFAULT FALSE,
  takes_anticoagulants BOOLEAN NOT NULL DEFAULT FALSE,
  critical_notes TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  updated_by TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Decoupled Patient Portal identity (independent of file_number and phone; kept DISABLED in Slice 1)
CREATE TABLE IF NOT EXISTS aqlan_app.app_patient_portal_accounts (
  portal_account_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  patient_id TEXT NOT NULL UNIQUE REFERENCES aqlan_app.app_patients(patient_id),
  portal_handle TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DISABLED' CHECK (status IN ('DISABLED', 'INVITED', 'SUSPENDED')),
  activation_token_sha256 TEXT,
  activation_expires_at TIMESTAMPTZ,
  password_hash TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, portal_handle)
);

CREATE TABLE IF NOT EXISTS aqlan_app.app_attachments (
  attachment_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  patient_id TEXT NOT NULL REFERENCES aqlan_app.app_patients(patient_id),
  category TEXT NOT NULL CHECK (category IN ('XRAY', 'CONSENT', 'DOCUMENT', 'PHOTO')),
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'application/pdf')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 5242880),
  sha256_hex TEXT NOT NULL,
  storage_rel_path TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_attachments_patient_idx
  ON aqlan_app.app_attachments(clinic_id, patient_id, created_at DESC);

-- Scheduling, Leaves & Transactional Outbox
CREATE TABLE IF NOT EXISTS aqlan_app.app_doctor_leaves (
  leave_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  doctor_user_id TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('APPROVED', 'CANCELLED')),
  approved_by TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS app_doctor_leaves_lookup_idx
  ON aqlan_app.app_doctor_leaves(clinic_id, doctor_user_id, start_date, end_date);

CREATE TABLE IF NOT EXISTS aqlan_app.app_appointments (
  appointment_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  patient_id TEXT NOT NULL REFERENCES aqlan_app.app_patients(patient_id),
  doctor_user_id TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  appointment_date DATE NOT NULL,
  start_minute INTEGER NOT NULL CHECK (start_minute >= 0 AND start_minute < 1440),
  end_minute INTEGER NOT NULL CHECK (end_minute > start_minute AND end_minute <= 1440),
  chair_no INTEGER NOT NULL CHECK (chair_no >= 1),
  kind TEXT NOT NULL CHECK (kind IN ('CONSULTATION', 'TREATMENT', 'FOLLOW_UP', 'EMERGENCY')),
  status TEXT NOT NULL CHECK (status IN ('BOOKED', 'ARRIVED', 'IN_CHAIR', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  reason TEXT NOT NULL DEFAULT '',
  cancel_reason TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_appointments_day_idx
  ON aqlan_app.app_appointments(clinic_id, appointment_date, status);
CREATE INDEX IF NOT EXISTS app_appointments_doctor_day_idx
  ON aqlan_app.app_appointments(clinic_id, doctor_user_id, appointment_date);
CREATE INDEX IF NOT EXISTS app_appointments_patient_idx
  ON aqlan_app.app_appointments(clinic_id, patient_id);

CREATE TABLE IF NOT EXISTS aqlan_app.app_outbox_messages (
  message_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  channel TEXT NOT NULL CHECK (channel IN ('WHATSAPP_SIMULATED', 'SMS_SIMULATED', 'INTERNAL_LOG')),
  template_key TEXT NOT NULL,
  recipient_patient_id TEXT REFERENCES aqlan_app.app_patients(patient_id),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SIMULATED_DISPATCHED', 'SUPPRESSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS app_outbox_status_idx
  ON aqlan_app.app_outbox_messages(clinic_id, status, created_at DESC);

-- Visits & Unified FDI Procedures
CREATE TABLE IF NOT EXISTS aqlan_app.app_visits (
  visit_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  patient_id TEXT NOT NULL REFERENCES aqlan_app.app_patients(patient_id),
  appointment_id TEXT REFERENCES aqlan_app.app_appointments(appointment_id),
  doctor_user_id TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  visit_date DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('INITIAL', 'FOLLOW_UP', 'ADJUSTMENT')),
  chief_complaint TEXT NOT NULL,
  clinical_notes TEXT NOT NULL DEFAULT '',
  medical_alert_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  medical_alert_ack_by TEXT REFERENCES aqlan_app.app_staff_users(user_id),
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'COMPLETED', 'CANCELLED')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_visits_patient_idx
  ON aqlan_app.app_visits(clinic_id, patient_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS app_visits_appointment_idx
  ON aqlan_app.app_visits(appointment_id);

CREATE TABLE IF NOT EXISTS aqlan_app.app_visit_procedures (
  procedure_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  visit_id TEXT NOT NULL REFERENCES aqlan_app.app_visits(visit_id),
  patient_id TEXT NOT NULL REFERENCES aqlan_app.app_patients(patient_id),
  doctor_user_id TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  service_code TEXT NOT NULL CHECK (service_code IN ('CONSULTATION', 'RESTORATION', 'ENDO', 'ORTHO')),
  procedure_name_ar TEXT NOT NULL,
  procedure_name_en TEXT NOT NULL,
  fdi_tooth TEXT,
  surfaces JSONB,
  arch TEXT CHECK (arch IS NULL OR arch IN ('UPPER', 'LOWER', 'BOTH')),
  planned_sessions INTEGER NOT NULL DEFAULT 1 CHECK (planned_sessions >= 1 AND planned_sessions <= 36),
  completed_sessions INTEGER NOT NULL DEFAULT 0 CHECK (completed_sessions >= 0 AND completed_sessions <= planned_sessions),
  currency TEXT NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  fee_minor BIGINT NOT NULL CHECK (fee_minor >= 0),
  clinical_note TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_visit_procedures_patient_idx
  ON aqlan_app.app_visit_procedures(clinic_id, patient_id);
CREATE INDEX IF NOT EXISTS app_visit_procedures_visit_idx
  ON aqlan_app.app_visit_procedures(visit_id);

CREATE TABLE IF NOT EXISTS aqlan_app.app_clinical_revisions (
  revision_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  patient_id TEXT NOT NULL REFERENCES aqlan_app.app_patients(patient_id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  actor_user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_clinical_revisions_patient_idx
  ON aqlan_app.app_clinical_revisions(clinic_id, patient_id, recorded_at DESC);

DROP TRIGGER IF EXISTS app_clinical_revisions_immutable ON aqlan_app.app_clinical_revisions;
CREATE TRIGGER app_clinical_revisions_immutable
  BEFORE UPDATE OR DELETE ON aqlan_app.app_clinical_revisions
  FOR EACH ROW EXECUTE FUNCTION aqlan_app.forbid_mutation();

-- Billing, Append-Only Receipts & Remaining-Balance Installments
CREATE TABLE IF NOT EXISTS aqlan_app.app_invoices (
  invoice_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  invoice_number BIGINT NOT NULL,
  patient_id TEXT NOT NULL REFERENCES aqlan_app.app_patients(patient_id),
  visit_id TEXT REFERENCES aqlan_app.app_visits(visit_id),
  doctor_user_id TEXT REFERENCES aqlan_app.app_staff_users(user_id),
  issued_date DATE NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  gross_minor BIGINT NOT NULL CHECK (gross_minor > 0),
  discount_minor BIGINT NOT NULL DEFAULT 0 CHECK (discount_minor >= 0 AND discount_minor < gross_minor),
  net_minor BIGINT NOT NULL CHECK (net_minor = gross_minor - discount_minor AND net_minor > 0),
  paid_minor BIGINT NOT NULL DEFAULT 0 CHECK (paid_minor >= 0 AND paid_minor <= net_minor),
  status TEXT NOT NULL CHECK (status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOIDED')),
  void_reason TEXT,
  voided_by TEXT REFERENCES aqlan_app.app_staff_users(user_id),
  voided_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  issued_by TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS app_invoices_patient_idx
  ON aqlan_app.app_invoices(clinic_id, patient_id, issued_date DESC);
CREATE INDEX IF NOT EXISTS app_invoices_visit_idx
  ON aqlan_app.app_invoices(visit_id);

DROP TRIGGER IF EXISTS app_invoices_no_delete ON aqlan_app.app_invoices;
CREATE TRIGGER app_invoices_no_delete
  BEFORE DELETE ON aqlan_app.app_invoices
  FOR EACH ROW EXECUTE FUNCTION aqlan_app.forbid_delete();

CREATE TABLE IF NOT EXISTS aqlan_app.app_invoice_lines (
  line_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  invoice_id TEXT NOT NULL REFERENCES aqlan_app.app_invoices(invoice_id),
  patient_id TEXT NOT NULL REFERENCES aqlan_app.app_patients(patient_id),
  visit_procedure_id TEXT REFERENCES aqlan_app.app_visit_procedures(procedure_id),
  description_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  fdi_tooth TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  unit_price_minor BIGINT NOT NULL CHECK (unit_price_minor >= 0),
  line_total_minor BIGINT NOT NULL CHECK (line_total_minor = quantity * unit_price_minor),
  is_active_billing BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS app_invoice_lines_invoice_idx
  ON aqlan_app.app_invoice_lines(invoice_id);
CREATE UNIQUE INDEX IF NOT EXISTS app_invoice_lines_active_proc_uq
  ON aqlan_app.app_invoice_lines(clinic_id, visit_procedure_id)
  WHERE visit_procedure_id IS NOT NULL AND is_active_billing = TRUE;

DROP TRIGGER IF EXISTS app_invoice_lines_no_delete ON aqlan_app.app_invoice_lines;
CREATE TRIGGER app_invoice_lines_no_delete
  BEFORE DELETE ON aqlan_app.app_invoice_lines
  FOR EACH ROW EXECUTE FUNCTION aqlan_app.forbid_delete();

CREATE TABLE IF NOT EXISTS aqlan_app.app_receipts (
  receipt_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  receipt_number BIGINT NOT NULL,
  invoice_id TEXT NOT NULL REFERENCES aqlan_app.app_invoices(invoice_id),
  patient_id TEXT NOT NULL REFERENCES aqlan_app.app_patients(patient_id),
  kind TEXT NOT NULL CHECK (kind IN ('COLLECTION', 'REVERSAL')),
  reverses_receipt_id TEXT UNIQUE REFERENCES aqlan_app.app_receipts(receipt_id),
  receipt_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER')),
  payment_currency TEXT NOT NULL CHECK (payment_currency IN ('YER', 'SAR', 'USD')),
  payment_minor BIGINT NOT NULL CHECK (payment_minor > 0),
  invoice_currency TEXT NOT NULL CHECK (invoice_currency IN ('YER', 'SAR', 'USD')),
  allocated_invoice_minor BIGINT NOT NULL CHECK (allocated_invoice_minor > 0),
  fx_snapshot JSONB,
  reason TEXT NOT NULL,
  recorded_by TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, receipt_number),
  CHECK ((kind = 'COLLECTION' AND reverses_receipt_id IS NULL) OR (kind = 'REVERSAL' AND reverses_receipt_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS app_receipts_patient_idx
  ON aqlan_app.app_receipts(clinic_id, patient_id, receipt_date DESC);
CREATE INDEX IF NOT EXISTS app_receipts_invoice_idx
  ON aqlan_app.app_receipts(invoice_id);

DROP TRIGGER IF EXISTS app_receipts_immutable ON aqlan_app.app_receipts;
CREATE TRIGGER app_receipts_immutable
  BEFORE UPDATE OR DELETE ON aqlan_app.app_receipts
  FOR EACH ROW EXECUTE FUNCTION aqlan_app.forbid_mutation();

CREATE TABLE IF NOT EXISTS aqlan_app.app_installment_schedules (
  schedule_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  invoice_id TEXT NOT NULL REFERENCES aqlan_app.app_invoices(invoice_id),
  patient_id TEXT NOT NULL REFERENCES aqlan_app.app_patients(patient_id),
  currency TEXT NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  invoice_net_minor BIGINT NOT NULL CHECK (invoice_net_minor > 0),
  paid_at_creation_minor BIGINT NOT NULL CHECK (paid_at_creation_minor >= 0),
  financed_remaining_minor BIGINT NOT NULL CHECK (
    financed_remaining_minor > 0
    AND financed_remaining_minor = invoice_net_minor - paid_at_creation_minor
  ),
  months_count INTEGER NOT NULL CHECK (months_count >= 1 AND months_count <= 60),
  start_due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'CANCELLED')),
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS app_installments_active_invoice_uq
  ON aqlan_app.app_installment_schedules(invoice_id)
  WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS app_installments_patient_idx
  ON aqlan_app.app_installment_schedules(clinic_id, patient_id);

DROP TRIGGER IF EXISTS app_installment_schedules_no_delete ON aqlan_app.app_installment_schedules;
CREATE TRIGGER app_installment_schedules_no_delete
  BEFORE DELETE ON aqlan_app.app_installment_schedules
  FOR EACH ROW EXECUTE FUNCTION aqlan_app.forbid_delete();

CREATE TABLE IF NOT EXISTS aqlan_app.app_installment_lines (
  installment_line_id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL REFERENCES aqlan_app.app_installment_schedules(schedule_id),
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  installment_no INTEGER NOT NULL CHECK (installment_no >= 1),
  due_date DATE NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  UNIQUE (schedule_id, installment_no)
);

CREATE INDEX IF NOT EXISTS app_installment_lines_schedule_idx
  ON aqlan_app.app_installment_lines(schedule_id, installment_no);

CREATE TABLE IF NOT EXISTS aqlan_app.app_print_logs (
  print_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  doc_type TEXT NOT NULL CHECK (doc_type IN ('INVOICE_A4', 'RECEIPT_A6', 'STATEMENT_A4', 'LAB_ORDER_A5')),
  entity_id TEXT NOT NULL,
  patient_id TEXT REFERENCES aqlan_app.app_patients(patient_id),
  copy_ordinal INTEGER NOT NULL CHECK (copy_ordinal >= 1),
  is_reprint BOOLEAN NOT NULL,
  printed_by TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  printed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_print_logs_lookup_idx
  ON aqlan_app.app_print_logs(clinic_id, doc_type, entity_id);

DROP TRIGGER IF EXISTS app_print_logs_immutable ON aqlan_app.app_print_logs;
CREATE TRIGGER app_print_logs_immutable
  BEFORE UPDATE OR DELETE ON aqlan_app.app_print_logs
  FOR EACH ROW EXECUTE FUNCTION aqlan_app.forbid_mutation();

-- Operational Lab & Inventory Settings Consumers
CREATE TABLE IF NOT EXISTS aqlan_app.app_lab_orders (
  lab_order_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  order_number BIGINT NOT NULL,
  patient_id TEXT NOT NULL REFERENCES aqlan_app.app_patients(patient_id),
  visit_id TEXT REFERENCES aqlan_app.app_visits(visit_id),
  doctor_user_id TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  lab_name TEXT NOT NULL,
  work_description TEXT NOT NULL,
  shade TEXT NOT NULL DEFAULT 'A2',
  ordered_date DATE NOT NULL,
  due_date DATE NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  lab_cost_minor BIGINT NOT NULL CHECK (lab_cost_minor >= 0),
  privacy_mode_applied TEXT NOT NULL CHECK (privacy_mode_applied IN ('CODE_ONLY', 'FULL_NAME')),
  status TEXT NOT NULL CHECK (status IN ('SENT', 'RECEIVED', 'DELIVERED', 'CANCELLED')),
  created_by TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, order_number),
  CHECK (due_date >= ordered_date)
);

CREATE INDEX IF NOT EXISTS app_lab_orders_patient_idx
  ON aqlan_app.app_lab_orders(clinic_id, patient_id);

CREATE TABLE IF NOT EXISTS aqlan_app.app_inventory_items (
  item_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  sku TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  unit_of_measure TEXT NOT NULL,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  has_movements BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, sku)
);

CREATE TABLE IF NOT EXISTS aqlan_app.app_inventory_movements (
  movement_id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES aqlan_app.app_clinics(clinic_id),
  item_id TEXT NOT NULL REFERENCES aqlan_app.app_inventory_items(item_id),
  patient_id TEXT REFERENCES aqlan_app.app_patients(patient_id),
  visit_id TEXT REFERENCES aqlan_app.app_visits(visit_id),
  kind TEXT NOT NULL CHECK (kind IN ('STOCK_IN', 'VISIT_DISPENSE', 'RETURN_IN', 'ADJUSTMENT')),
  qty_delta INTEGER NOT NULL CHECK (qty_delta <> 0),
  resulting_qty INTEGER NOT NULL,
  reason TEXT NOT NULL,
  recorded_by TEXT NOT NULL REFERENCES aqlan_app.app_staff_users(user_id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_inventory_movements_item_idx
  ON aqlan_app.app_inventory_movements(clinic_id, item_id, recorded_at DESC);

DROP TRIGGER IF EXISTS app_inventory_movements_immutable ON aqlan_app.app_inventory_movements;
CREATE TRIGGER app_inventory_movements_immutable
  BEFORE UPDATE OR DELETE ON aqlan_app.app_inventory_movements
  FOR EACH ROW EXECUTE FUNCTION aqlan_app.forbid_mutation();
