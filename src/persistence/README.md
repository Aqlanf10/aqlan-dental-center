# Synthetic durable finance prototype

This is a strict-TypeScript, PostgreSQL 18.6 test slice, **not a production API**.
It exposes only draft agreement → approval → same-currency fully allocated receipt
and an authorized commercial-balance projection. It does not implement an invoice,
refund, FX, revenue/GL, real authentication, clinical posting, migration of existing
clinic data, deployments, or future AI/Dot features.

## Boundary and trusted context

`createFinanceHandler(service, authenticate)` is an injected, transport-independent
handler. There is no HTTP listener, authentication-header shortcut, or production
login. The resolver must return an already verified user/profile/person/clinic.
The account's patient, entity and branch come exclusively from stored account rows.
Stored fixture memberships and deny-by-default scoped grants must match that identity.
Missing accounts and denied scope both return 404; no replay is disclosed without
fresh authorization. No body can supply context, actor, settings, grants or state.

The runtime role can only read the synthetic policies/memberships. Admin fixture
changes require quiescence: **there is no concurrent revocation guarantee**. Real
mutable identity/settings systems require a context-lock protocol before production.
The fixture policy requires persisted synthetic approval, functional currency and a
valid IANA timezone. New commands accept only today's business date in that timezone;
no discretionary backdating, future posting, or invented accounting approval.
`dueAsOf` selects installment maturity; it is not a historical cash cutoff.

## Storage/transaction contract

- One client per READ COMMITTED transaction; account row lock, authorization,
  durable replay lookup, source reservation, audit and snapshot CAS, then COMMIT.
- SHA-256 binds the canonical validated command (including expectedVersion, reason,
  date), authenticated identity and scoped account/entity/patient. Locale and newly
  generated timestamps are excluded. Exact replay returns its original committed
  result/version plus the latest version, even after later writes/reconnection.
- Before every read/write, the entire bounded account is reconstructed from strictly
  validated history with the pure engine. Full snapshot, normalized audit fields and
  fingerprints, and source reservations must match. Past policy approval and the
  original server timestamp cannot be independently rederived from the aggregate.
  Inconsistency is an integrity
  error, never silently repaired. Database JSON enters as unknown, not AccountState.
- Source IDs are unique per clinic/entity/kind, including receipt and cash sources,
  across accounts. Reservations are sorted and stored atomically with the command.
- At most three attempts, only for recognized deadlock/serialization aborts. No
  rebasing on stale versions. An uncertain COMMIT returns `COMMIT_OUTCOME_UNKNOWN`;
  the caller must retry exactly the same key/body to discover the durable outcome.
- Amounts are canonical positive integer strings, max 30 digits; never floats.
  Max raw command 32 KiB, reason 500 characters, 100 schedule/allocation entries,
  aggregate 1 MiB and at most 1,000 committed commands. Size rejection is atomic. The domain's embedded audit/replay
  arrays remain intentionally duplicated; growth beyond the bound fails closed.
- API responses contain IDs, versions/replay flags or limited obligation projections.
  No internal history, SQL, stack, raw failure details or private reasons are returned.
  Stable error codes use the existing English/Arabic presentation catalog.

## Database roles and migrations

`sql/001_finance.sql` is a one-shot transaction: duplicate schema aborts on rerun.
It creates five tables. It does not create a role, inspect credentials or touch any
existing Mini database. `sql/002_runtime_grants.sql` grants a separately provisioned
non-owner `finance_runtime` role SELECT, audit/source INSERT, and only account
snapshot/version UPDATE. The owner must not give it CREATE on the database/public
schema, superuser privileges or membership in the migration-owner role.
Account identity columns, policies, memberships and audit/source history cannot be
updated/deleted by runtime. SQL FKs cover tenant/account/entity links, **not real
patient or identity records**, which are not implemented here. The application audit
is not cryptographically tamper-proof; an owner can alter it, and a compromised
runtime can still write fabricated allowed inserts or mutate account snapshots.

## Verification

`npm run check` performs strict no-emit TypeScript and syntax checks. `npm test`
runs domain and API-boundary tests without a database. `npm run test:postgres`
is deliberately separate and **fails without the disposable-database guard**.
It requires `FINANCE_TEST_DISPOSABLE=1` and `FINANCE_TEST_DATABASE_URL` pointing
only to loopback database `finance_test` on port 5432 as disposable owner `postgres`
with the known synthetic-only password. Query parameters, fragments, other protocols
and alternate credentials are rejected; validated fields become explicit PoolConfig
values, never a raw connection string with pg query-parameter override behavior.
It creates a limited runtime login with a known synthetic-only password and tests
all application work through that role, not the superuser. Never use these fixtures
or credentials in deployment. The migration owner is used solely for fixture setup,
invariant inspection and fault injections.

The CI workflow uses the official PostgreSQL 18.6 service image pinned by immutable
manifest digest, ordinary public GitHub Actions, no paid/production database.
The suite checks actual independent-session barriers, concurrent replay/stale/source
conflicts, overpayment, large exact balances, rollback at both write boundaries,
reconnection/replay, scoped authorization/revocation, policy rejection and runtime
privileges. It is not a browser/usability, live auth, backup/restore or Railway test.
Local PostgreSQL was unavailable when authored; authoritative real-server results
must come from that CI job, and merge remains gated on review and exact-commit CI.
