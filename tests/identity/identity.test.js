import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyIdentityRegistry, registerPerson, attachProfile, defineGrant, evaluatePermission, delegatePermission, revokeGrant } from '../../src/identity/index.ts';
const start = '2026-01-01T00:00:00Z', at = '2026-06-01T00:00:00Z', end = '2027-01-01T00:00:00Z';
const scope = { clinicId: 'clinic1', branchIds: ['branch1'] };
const grant = overrides => defineGrant({ grantId: 'g1', subjectId: 'owner-user', action: 'read', resource: 'chart', effect: 'allow', scope, startsAt: start, expiresAt: end, canDelegate: true, ...overrides });
const request = overrides => ({ subjectId: 'owner-user', action: 'read', resource: 'chart', scope: { ...scope, resourceIds: ['patient1'] }, at, ...overrides });
test('owner doctor employee and login refer to exactly one person; names do not merge', () => {
  let registry = registerPerson(emptyIdentityRegistry(), { personId: 'owner', displayName: 'Same Name' });
  for (const kind of ['doctor', 'employee', 'user']) registry = attachProfile(registry, { personId: 'owner', kind, profileId: `${kind}1` });
  registry = registerPerson(registry, { personId: 'other', displayName: 'Same Name' });
  assert.equal(registry.persons.length, 2); assert.equal(registry.profiles.length, 3);
  assert.ok(registry.profiles.every(p => p.personId === 'owner'));
  assert.throws(() => attachProfile(registry, { personId: 'other', kind: 'user', profileId: 'user1' }), /PROFILE_EXISTS/);
  assert.throws(() => attachProfile(registry, { personId: 'missing', kind: 'user', profileId: 'user2' }), /PERSON_NOT_FOUND/);
});
test('permission matrix denies default and constrains subject/action/resource/clinic/branch/object', () => {
  const g = grant({ scope: { ...scope, resourceIds: ['patient1'] } });
  for (const [override, allowed] of [[{}, true], [{ subjectId: 'doctor1' }, false], [{ action: 'write' }, false], [{ resource: 'finance' }, false], [{ scope: { clinicId: 'other' } }, false], [{ scope: { ...scope, branchIds: ['branch2'], resourceIds: ['patient1'] } }, false], [{ scope: { ...scope, resourceIds: ['patient2'] } }, false], [{ scope }, false]]) assert.equal(evaluatePermission([g], request(override)).allowed, allowed);
  assert.equal(evaluatePermission([], request()).allowed, false);
  assert.equal(evaluatePermission([g], request({ at: 'bad' })).allowed, false);
});
test('expiry boundary, future start and revocation are enforced', () => {
  assert.equal(evaluatePermission([grant()], request({ at: end })).allowed, false);
  assert.equal(evaluatePermission([grant()], request({ at: '2025-12-31T23:59:59Z' })).allowed, false);
  const revoked = revokeGrant(grant(), at);
  assert.equal(evaluatePermission([revoked], request()).allowed, false);
  assert.equal(evaluatePermission([revoked], request({ at: start })).allowed, true);
});
test('explicit deny overrides owner allow including partially denied bulk scope', () => {
  const deny = grant({ grantId: 'deny', effect: 'deny', scope: { ...scope, resourceIds: ['patient1'] } });
  assert.equal(evaluatePermission([grant(), deny], request()).reason, 'EXPLICIT_DENY');
  assert.equal(evaluatePermission([grant(), deny], request({ scope })).allowed, false);
});
const delegate = (grants, overrides = {}) => delegatePermission(grants, { parentGrantId: 'g1', actorId: 'owner-user', grantId: 'child', subjectId: 'manager-user', scope, startsAt: at, expiresAt: end, at, ...overrides });
test('bounded delegation cannot widen scope, lifetime, actor or redelegate', () => {
  const parent = grant(), child = delegate([parent]);
  assert.equal(evaluatePermission([parent, child], request({ subjectId: 'manager-user' })).allowed, true);
  for (const overrides of [{ scope: { clinicId: 'clinic1' } }, { expiresAt: '2028-01-01T00:00:00Z' }, { actorId: 'intruder' }, { startsAt: start }]) assert.throws(() => delegate([parent], overrides));
  assert.throws(() => delegate([parent, child], { parentGrantId: 'child', actorId: 'manager-user', grantId: 'grandchild' }), /DELEGATION_DENIED/);
  assert.equal(evaluatePermission([revokeGrant(parent, at), child], request({ subjectId: 'manager-user' })).allowed, false);
});
test('denied delegator cannot delegate; later deny removes existing child authority', () => {
  const parent = grant(), child = delegate([parent]);
  const deny = grant({ grantId: 'deny', effect: 'deny' });
  assert.throws(() => delegate([parent, deny]), /DELEGATION_DENIED/);
  assert.equal(evaluatePermission([parent, deny, child], request({ subjectId: 'manager-user' })).allowed, false);
});
test('immutable grants and duplicate policy IDs fail closed', () => {
  const g = grant(); assert.throws(() => { g.scope.branchIds.push('branch2'); }, TypeError);
  assert.equal(evaluatePermission([g, g], request()).reason, 'INVALID_POLICY');
});
test('future deny blocks delegation for overlapping interval and grant references are required', () => {
  const parent = grant();
  const deny = grant({ grantId: 'future-deny', effect: 'deny', startsAt: '2026-07-01T00:00:00Z' });
  assert.throws(() => delegate([parent, deny]), /DELEGATION_DENIED/);
  const child = delegate([parent]);
  assert.equal(evaluatePermission([child], request({ subjectId: 'manager-user' })).allowed, false);
});
test('malformed scopes and invalid calendar instants fail closed', () => {
  const g = grant();
  for (const scopeOverride of [{ clinicId: 'clinic1', unexpected: true }, { clinicId: 'clinic1', branchIds: [] }, {}]) assert.equal(evaluatePermission([g], request({ scope: scopeOverride })).allowed, false);
  for (const badTime of ['2026-02-30T00:00:00Z', '2026-06-01T24:00:00Z', '2026-06-01T00:00:00']) assert.equal(evaluatePermission([g], request({ at: badTime })).allowed, false);
});
test('sparse branch and resource scopes reject for construction, requests and delegation', () => {
  const parent = grant({ scope: { ...scope, resourceIds: ['patient1'] } });
  for (const key of ['branchIds', 'resourceIds']) {
    for (const invalid of [new Array(1), ['branch1', , 'patient1'], [undefined], [null], [17]]) {
      const badScope = { ...parent.scope, [key]: invalid };
      assert.throws(() => grant({ scope: badScope }), /INVALID_SCOPE/);
      assert.equal(evaluatePermission([parent], request({ scope: badScope })).reason, 'INVALID_POLICY');
      assert.throws(() => delegate([parent], { scope: badScope }), /INVALID_SCOPE/);
      const invalidStoredGrant = { ...parent, scope: badScope };
      assert.equal(evaluatePermission([invalidStoredGrant], request()).reason, 'INVALID_POLICY');
      assert.throws(() => delegate([invalidStoredGrant]), /INVALID_SCOPE/);
    }
  }
});
test('sparse policy lists reject instead of skipping missing grant entries', () => {
  const parent = grant();
  for (const policies of [new Array(1), [parent, ,], [, parent], [parent, undefined]]) {
    assert.equal(evaluatePermission(policies, request()).reason, 'INVALID_POLICY');
    assert.throws(() => delegate(policies));
  }
});
test('inherited array indices cannot fill a scope hole', () => {
  const branches = new Array(1);
  const prototype = Object.create(Array.prototype);
  prototype[0] = 'branch1';
  Object.setPrototypeOf(branches, prototype);
  assert.equal(evaluatePermission([grant()], request({ scope: { clinicId: 'clinic1', branchIds: branches } })).reason, 'INVALID_POLICY');
  assert.throws(() => delegate([grant()], { scope: { clinicId: 'clinic1', branchIds: branches } }), /INVALID_SCOPE/);
});
