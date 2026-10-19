# Clinical context and immutable records

This dependency-free module is a synthetic domain slice, not a production clinical system or a medically validated workflow. It neither authenticates actors nor provides database, HTTP, UI, signatures, or financial posting integrations.

## Identity and boundaries

`createClinicalRecord({ patientId, personId, clinicId }, identityRegistry)` requires an existing explicit person reference. One patient aggregate holds one master plan, explicit specialty cases, visits, and procedures. `executeClinical(state, command)` returns a deeply frozen `{ state, result, replayed }`. It never changes the supplied state. Commands carry patient and clinic IDs, actor, date, reason, expected aggregate version, idempotency key, and a strictly shaped payload.

A trusted adapter must enforce unique patient/person association across aggregates, authenticate the actor, authorize action and scope, load untampered records, and persist aggregate CAS, replay keys, audit and revisions atomically. These in-memory checks are not durable concurrency or authorization guarantees. Never accept supplied state or an identity registry from a client as proof of authority. Access control and person-merge workflows remain pending.

All child operations use explicit plan/case/visit/procedure links and reject mismatched context. Names, phones, and tooth similarity never merge or auto-create cases. Endodontic cases require a distinct episode ID and one tooth. A second explicitly created episode on the same tooth remains separate. Historical cases can carry a unique `legacyReference` within the patient record; continuing visits use the existing case ID. This is not a migration or historical financial import tool.

## Structural service locations

- `ENDO`: one FDI string (permanent 11–48 within quadrant/tooth ranges, primary 51–85 within ranges), no surfaces/arch, explicit episode.
- `RESTORATION`: one FDI tooth and nonempty unique explicit surface codes M, D, O, I, B, L, P. Procedure surfaces must be a subset of the case surfaces on the same tooth.
- `ORTHO`: UPPER, LOWER or BOTH; BOTH case scope can contain an upper/lower procedure.
- `CONSULTATION`: empty location, without inventing a tooth.

These are data-shape checks only. Surface vocabulary is structural, not a claim about anatomical appropriateness for a particular tooth. Clinical indications, valid clinical combinations, diagnosis, protocols and specialty templates require specialist review and are not implemented. Other service scopes (bridges, periodontal regions, etc.) are intentionally unsupported rather than guessed.

## Commands and versioning

- `CREATE_PLAN`, `CREATE_CASE`, `APPROVE_CASE`
- `AMEND_CASE_BASELINE`: an explicit reasoned correction with its own version; it never changes case identity, tooth or service.
- `OPEN_VISIT`: INITIAL, FOLLOW_UP, or orthodontic ADJUSTMENT, recording delta text and the exact case version containing the baseline. No repeat intake is required. Even an unchanged visit can explicitly record “no change reported.”
- `DRAFT_PROCEDURE`, `REVISE_PROCEDURE_DRAFT`, `APPROVE_PROCEDURE`, `COMPLETE_PROCEDURE`
- `AMEND_PROCEDURE_NOTE`: a reasoned, versioned correction to approved/completed narrative. It preserves the original approval/completion and never silently rewrites location or financial links. The amendment actor is recorded separately in its revision; previous approver identity is historical provenance, not a signature on corrected text.
- `COMPLETE_VISIT`: requires at least one completed procedure and no incomplete procedures. Administrative checkout is deliberately not modeled.

Every changed case, visit and procedure appends a full immutable revision with actor, reason, date and command key. Initial values and signed-stage snapshots remain visible. All these commands require adapter authorization; amendment commands are explicit attestations, not autosave. Actual authenticated clinical signatures and approval matrices remain pending.

Replay of the identical command returns its prior result and current state without another event, even after subsequent writes. A different command reusing its key fails. A stale expected aggregate version fails. Repeat completion under a new key fails; the identical original request replays. Target revisions are allowed only in draft within the case scope, and must supply fresh explicit coverage or a review-required marker. Once approved, this slice refuses target changes; an explicit clinical correction/replacement workflow is future work.

## Financial boundary

Every procedure supplies either `{ status: 'REVIEW_REQUIRED' }` or `REFERENCED` coverage with an explicit patient, plan, case, obligation, obligation-line, agreement-version, service and exact target reference. Reference context is checked, but external obligations are not loaded or financially validated. `REFERENCED` does not mean paid, cleared, collectible, or financially approved.

Clinical completion is permitted with financial review pending: debt is not an implicit clinical gate. No command creates an invoice, obligation, receipt, cash event, commission, inventory change or financial approval. Financial integration must independently verify referenced agreement versions and coverage, without reposting the obligation or treating procedure completion as an instruction to create debt.

## Remaining integration work

Persistent transactional storage and foreign keys, server-side authentication/authorization, signatures, clinical approval/correction policy, cross-aggregate identity uniqueness, time/audit trust, service catalog and specialist validation, history retention/access control, Arabic/English UI/error translation and browser tests, consent and guardianship, financial coverage verification, migration/reconciliation, and Production deployment all remain pending. No production credentials, patient data, or external services are used by this module or tests.
