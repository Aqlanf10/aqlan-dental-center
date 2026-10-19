# Aqlan Dental Center: finance domain prototype

This is a dependency-free, synthetic-data, immutable in-memory domain foundation. It is **not a production ledger or an API**. It implements the commercial obligation semantics from the reviewed architecture plan, especially sections 2–5. Approval of commercial debt does **not** recognize accounting revenue.

## Run

From the project root, with Node 24:

    node --test tests/finance/*.test.js

Public exports are in `money.js` and `account.js`. No database, framework, third-party package, network request or credentials are needed.

## Contract

- `createAccount({id, patientId, entityId})` creates a frozen account at version 0. IDs must already be resolved by the caller; this module does not authenticate or resolve people.
- `execute(state, {key, expectedVersion, actorId, reason, onDate, type, payload})` returns `{state, result, replayed}`. Dates are ISO calendar days. State and every nested object are frozen. All successful commands append immutable audit history; old snapshots stay unchanged.
- `key` is scoped to the account. Its canonical fingerprint includes the entire command, including expected version and audit metadata. Exact retries work even after later commands; the latest state is returned with the original result. A changed body is rejected. New commands must match the current version.
- Money is a canonical unsigned integer **string in minor units**, parsed into BigInt solely for calculation. No Number or float monetary inputs. The exported `roundRatio` low-level helper accepts BigInt operands only and returns BigInt; it rejects Number and string operands without coercion. Prototype registry explicitly uses 2 fractional digits for YER, SAR and USD; cash denomination/display rules need separate approval.
- `DRAFT_AGREEMENT`: `{agreementId,currency,minor,schedule:[{dueDate,minor}]}`. Schedule must sum to principal. Draft creates no obligation.
- `APPROVE_AGREEMENT`: `{agreementId,obligationId}`. Only one approval for the draft creates principal.
- `ISSUE_INVOICE`: `{invoiceId,obligationId}`. One full documentary invoice per obligation in this slice, with no extra debt or cash posting.
- `RECORD_RECEIPT`: `{receiptId,cashMovementId,currency,minor,allocations:[{id,obligationId,sourceMinor,fx?}]}`. All cash must be explicitly allocated in the same transition. Unallocated credit and overpayment are rejected. Each allocation retains both source and target amounts. Multiple allocations create only one incoming cash movement.
- FX snapshot: `{sourceCurrency,targetCurrency,numerator,denominator,rounding,capturedAt,source,approvedBy}`. Rate direction is target major units per one source major unit; numerator and denominator are positive integer strings. Supported rounding: DOWN, HALF_UP, HALF_EVEN. `capturedAt` is a UTC timestamp. Captured evidence is stored, never looked up or repriced later. It is an assertion from the caller, not actual authorization verification.
- `REFUND_RECEIPT` / `REVERSE_RECEIPT`: `{refundId,cashMovementId,receiptId,currency,minor,releasePolicy,releases:[{id,allocationId,sourceMinor}]}`. Refund currency must equal receipt currency. Release totals must equal outgoing cash. A reversal consumes all remaining cash. Release policy must explicitly be `ORIGINAL_ALLOCATION_CUMULATIVE_FLOOR`. Each release calculates the cumulative proportion of the original target allocation using integer floor, subtracts target units already released, and assigns the final residual on full release. This prevents rounding drift across split refunds. A tiny partial release may release zero target units, so this synthetic policy requires finance review before production.
- `obligationBalance(state, obligationId, asOf)` provides principal, net allocation, full remaining, due and overdue separately, in obligation currency. Allocations are applied earliest-due-first for due calculations. `asOf` selects installment maturity only: **it is not a historical transaction cutoff**. All recorded allocations/refunds are included.
- `receiptBalance(state, receiptId)` provides net cash, active allocation and available amount in receipt currency only. No mixed-currency summation.

## Review decisions and deliberate limitations

1. Currency registry precision, installment FIFO, FX rounding, and original-currency cumulative proportional refund release are explicit prototype decisions, not accepted accounting/operational policy. Refund cash amount is supplied explicitly, never translated at a new market rate.
2. Full receipt allocation is deliberately mandatory because there is no explicit credit balance model yet. Standalone allocation/reallocation, agreement amendments, credit notes, cancellations, invoice lines and schedule revision are not implemented.
3. Commercial balance is distinct from revenue, tax, AR recognition and GL. No double-entry journals, functional currency, exchange gain/loss or reconciliation to a GL is implemented or claimed.
4. Pure functions do not provide database transactions, row locking, durable idempotency, multi-process concurrency, durable audit, global cash-source uniqueness, or event/outbox delivery. A future persistence adapter must perform account-version CAS and unique source/idempotency constraints atomically. Two calls against the same input can both succeed independently; only real persistence can elect a winner.
5. Account membership enforces only references within the supplied snapshot. Tenant isolation, patient identity verification, actor permissions, separation of duties and actual FX/refund approvals are external responsibilities and untested. Caller-supplied aggregates are trusted; do not accept arbitrary state from HTTP clients.
6. Dates are caller-supplied business dates without timezone policy. No period close, backdate restrictions, tamper-resistant event signing, historical-as-of ledger, pagination, scale/load bounds, or event replay migration is provided. Idempotency data grows with the aggregate.
7. This slice has no PostgreSQL, browser UI, HTTP, authentication, production data, deployment or Railway verification. Tests establish local domain behavior only. Repeated partial refunds and integer conservation are tested, but passing tests do not establish production safety.
8. No AI or Dot features are included.
