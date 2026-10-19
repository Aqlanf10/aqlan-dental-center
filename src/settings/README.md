# Aqlan Dental Center: governed configuration foundation

This is a pure immutable in-memory aggregate, not a database or authorization boundary. Callers must authenticate and authorize actors, supply a trusted clock, atomically compare versions during persistence, enforce scope membership and retain immutable audit storage.

## Contracts

- Definitions are fixed and typed. Unknown keys (including attempts to disable integrity/security invariants) fail. Clinic language (`ar` initially), timezone (`UTC` initially), currency (unset initially), and user language (null means inherit) are independent.
- The first save persists explicit defaults even with an empty patch. Later omissions do not reset values. Successful updates increment the stream version; stale expected versions and duplicate source IDs fail without mutation.
- Every update records actor, source, reason, recorded time and effective time. Effective time cannot precede recording and must not move backward within a stream. A future scheduled update therefore requires subsequent updates to have an equal or later effective date. This conservative scheduling restriction avoids ambiguous queued policies; a future cancellation/replacement workflow is not implemented.
- `settingsAt` selects the immutable effective snapshot. Historical business records must persist their chosen policy version and any computed facts, rather than repeatedly querying the latest settings. A default-only unsaved snapshot reports `persisted: false`.
- `publicSettings` and `settingsAudit` redact sensitive references. Public audit intentionally omits free-text reasons because they may contain secrets. Internal state and `settingsAt` are privileged and must never be serialized directly into a public response. The only integration field accepts a vault reference, not credential material; it performs no vault lookup or connection.
- Unknown or unset functional currency must block later financial posting in an adapter; null is deliberately not a production accounting choice.

## Decisions before production

Clinic/entity currency, timezone, approved finance policy, who may change each setting, setting approval workflow, audit retention, secure vault integration, and operational persistence remain unresolved. This narrow module does not implement every clinical/business setting or claim outage resilience.
