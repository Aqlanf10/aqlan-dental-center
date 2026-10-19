-- One-shot migration: explicit transaction, duplicate schema aborts without partial changes.
-- Run as database owner, never the runtime role. Fixture writes are admin-only.
BEGIN;
CREATE SCHEMA finance;
REVOKE ALL ON SCHEMA finance FROM PUBLIC;
CREATE TABLE finance.policies (
  clinic_id text NOT NULL,
  entity_id text NOT NULL,
  policy_version text NOT NULL,
  functional_currency text,
  timezone text,
  synthetic_approved boolean NOT NULL DEFAULT false,
  PRIMARY KEY (clinic_id, entity_id)
);
CREATE TABLE finance.accounts (
  clinic_id text NOT NULL,
  account_id text NOT NULL,
  entity_id text NOT NULL,
  patient_id text NOT NULL,
  branch_id text NOT NULL,
  version bigint NOT NULL CHECK (version BETWEEN 0 AND 9007199254740991),
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  snapshot jsonb NOT NULL CHECK (octet_length(snapshot::text) <= 1048576),
  PRIMARY KEY (clinic_id, account_id),
  UNIQUE (clinic_id, entity_id, account_id),
  FOREIGN KEY (clinic_id, entity_id) REFERENCES finance.policies (clinic_id, entity_id),
  CHECK (jsonb_typeof(snapshot) = 'object'
    AND snapshot ?& ARRAY['id','entityId','patientId','version']
    AND jsonb_typeof(snapshot->'id') = 'string'
    AND jsonb_typeof(snapshot->'entityId') = 'string'
    AND jsonb_typeof(snapshot->'patientId') = 'string'
    AND jsonb_typeof(snapshot->'version') = 'number'
    AND snapshot->>'id' = account_id AND snapshot->>'entityId' = entity_id
    AND snapshot->>'patientId' = patient_id AND snapshot->>'version' = version::text)
);
-- Synthetic trusted fixture. No identity enrollment or grant/policy write API.
CREATE TABLE finance.memberships (
  clinic_id text NOT NULL,
  account_id text NOT NULL,
  user_id text NOT NULL,
  person_id text NOT NULL,
  profile_id text NOT NULL,
  grants jsonb NOT NULL CHECK (jsonb_typeof(grants) = 'array'),
  PRIMARY KEY (clinic_id, account_id, user_id),
  FOREIGN KEY (clinic_id, account_id) REFERENCES finance.accounts
);
CREATE TABLE finance.commands (
  clinic_id text NOT NULL,
  account_id text NOT NULL,
  idempotency_key text NOT NULL,
  fingerprint text NOT NULL CHECK (length(fingerprint) = 64),
  actor_id text NOT NULL,
  user_id text NOT NULL,
  person_id text NOT NULL,
  command_type text NOT NULL CHECK (command_type IN ('DRAFT_AGREEMENT','APPROVE_AGREEMENT','RECORD_RECEIPT')),
  reason text NOT NULL,
  business_date date NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  policy_version text NOT NULL,
  result jsonb NOT NULL,
  committed_version bigint NOT NULL CHECK (committed_version BETWEEN 1 AND 9007199254740991),
  PRIMARY KEY (clinic_id, account_id, idempotency_key),
  UNIQUE (clinic_id, account_id, committed_version),
  FOREIGN KEY (clinic_id, account_id) REFERENCES finance.accounts
);
CREATE TABLE finance.sources (
  clinic_id text NOT NULL,
  entity_id text NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN ('agreement','obligation','receipt','allocation','cash')),
  source_id text NOT NULL,
  account_id text NOT NULL,
  idempotency_key text NOT NULL,
  PRIMARY KEY (clinic_id, entity_id, source_kind, source_id),
  FOREIGN KEY (clinic_id, entity_id, account_id) REFERENCES finance.accounts (clinic_id, entity_id, account_id),
  FOREIGN KEY (clinic_id, account_id, idempotency_key) REFERENCES finance.commands
);
REVOKE ALL ON ALL TABLES IN SCHEMA finance FROM PUBLIC;
COMMIT;
