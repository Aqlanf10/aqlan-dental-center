-- Provision finance_runtime separately as a non-owner, non-superuser role.
-- Do not grant membership of the migration owner or CREATE on the database/public schema.
BEGIN;
GRANT USAGE ON SCHEMA finance TO finance_runtime;
GRANT SELECT ON ALL TABLES IN SCHEMA finance TO finance_runtime;
GRANT INSERT ON finance.commands, finance.sources TO finance_runtime;
GRANT UPDATE (snapshot, version) ON finance.accounts TO finance_runtime;
-- FOR SHARE requires some UPDATE privilege; column-limited privilege on a never-used
-- guard column is deliberately avoided. Context is immutable for runtime instead.
COMMIT;
