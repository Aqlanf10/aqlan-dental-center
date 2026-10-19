# Aqlan Dental Center

An isolated, test-first foundation for a bilingual Arabic/English dental-center system.

## Current status

This repository starts with executable TypeScript domain models and synthetic tests. Domain implementations have no runtime framework dependency. A separate PostgreSQL persistence slice is under development; its validation status must be checked independently. It is **not** a deployed application, database ledger, authentication service, clinical decision system, or migration tool. There is no production data, connection, credential, or patient import.

The existing clinic system remains separate. Passing these tests does not establish database concurrency, HTTP authorization, browser usability, accounting-policy approval, backup recovery, or production readiness.

## Run the foundation checks

Requires a supported patched Node.js 24 LTS release. Install exact locked development dependencies before checking. Native TypeScript execution strips types; the separate TypeScript compiler check is mandatory.

```sh
npm ci --ignore-scripts
npm run check
npm test
```

## Boundaries

- `src/finance`: commercial obligations, money, receipt allocation and immutable correction rules; not revenue recognition or a general ledger.
- `src/identity`: person/profile identity and pure authorization/delegation rules; not a login implementation.
- `src/settings`: versioned, validated and auditable configuration models; not a persistent settings service.
- `src/clinical`: explicit patient/plan/case/visit/procedure context and immutable revisions; not specialist clinical validation.
- `src/i18n`: Arabic/English presentation contracts; not a completed translated application.
- `tests`: synthetic domain acceptance and regression cases plus compile-time contracts.

Database integration tests are a distinct gate and require an explicitly disposable PostgreSQL database. Ordinary domain tests cannot establish database concurrency or persistence safety. Never point test configuration at clinic data.

Arabic and English are first-release requirements. Display language must never change a stored amount, currency, timezone, clinical record, authorization decision or identifier. Clinical free text retains its original language.

## Release gates

Every later slice requires explicit contracts, independent source review, tests of its real persistence and API boundaries, role checks, replay and stale-state behavior, and a clear statement of limitations. Financial and clinical production activation requires integration, reconciliation, restoration and owner acceptance. A domain test alone is not permission to operate on real data.

No license is granted by this initial scaffold. Repository visibility and intellectual-property licensing are separate decisions.
