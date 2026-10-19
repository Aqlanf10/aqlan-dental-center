# Aqlan Dental Center: identity and authorization foundation

This module is a pure, synthetic domain prototype. It does not authenticate anyone, store accounts, secure an HTTP endpoint, or provide concurrent database guarantees.

## Contracts

- A person ID is the identity anchor. Optional doctor, employee and login-user profiles reference the same person. Each kind has at most one profile per person in this narrow model. Names are display attributes and never matching keys; phones are deliberately absent. There is no implicit person merge.
- A grant addresses an explicit user-profile ID, action, resource and clinic scope. Optional branch and object-ID lists narrow that scope. No role label (including owner) bypasses policy. Integrators must resolve authenticated user profiles to their person and load policy from trusted storage.
- Omitted branch/object lists mean all within the enclosing clinic. Requests for broad lists are denied if any intersecting explicit denial applies. Collection adapters should evaluate each object or restrict their database query; the evaluator does not filter records itself.
- Start is inclusive, expiry and revocation exclusive. Time must be supplied explicitly by a trusted adapter. Immutable historical objects retain their previous values.
- Only `canDelegate: true` grants can issue a child. Children cannot redelegate or widen scope/lifetime. They remain tied to the parent's live authority; revocation or a matching denial against the parent removes child authority. Scheduled denials that overlap the requested delegation window also prevent issuance.
- `defineGrant`, `revokeGrant` and identity registration are domain constructors, not publicly callable administrative endpoints. Adapters must authorize creation/revocation, enforce actor identity, serialize writes and persist immutable audit events. Raw policy objects are trusted input, never accepted from clients.

## Decisions before production

The owner/manager authority matrix, patient and branch scopes, emergency-access rules, identity verification, duplicate-person review/merge, retention, and authentication provider remain explicit implementation and policy decisions. No production credentials or access are created here.
