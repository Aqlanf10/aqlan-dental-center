/** Pure identity/access domain model. Trusted callers supply authenticated IDs and time.
 * This is not authentication, a database, or HTTP enforcement.
 */
const clone = value => structuredClone(value);
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value);
const requireId = value => { if (!id(value)) throw new Error('INVALID_ID'); };
// Iteration methods skip holes: validate indexed ownership before any .some/.every.
const denseArray = (value, validate = () => true) => {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index) || !validate(value[index])) return false;
  return true;
};
const instant = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value)) throw new Error('INVALID_TIME');
  const parsed = Date.parse(value), day = Date.parse(value.slice(0, 10) + 'T00:00:00Z');
  if (!Number.isFinite(parsed) || !Number.isFinite(day) || new Date(day).toISOString().slice(0, 10) !== value.slice(0, 10) || Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59) throw new Error('INVALID_TIME');
  return parsed;
};
export function emptyIdentityRegistry() { return freeze({ persons: [], profiles: [] }); }
/** Names and phone numbers are attributes, never identity keys or merge criteria. */
export function registerPerson(registry, person) {
  requireId(person.personId);
  if (registry.persons.some(p => p.personId === person.personId)) throw new Error('PERSON_EXISTS');
  if (typeof person.displayName !== 'string' || !person.displayName.trim()) throw new Error('NAME_REQUIRED');
  return freeze({ persons: [...clone(registry.persons), { personId: person.personId, displayName: person.displayName }], profiles: clone(registry.profiles) });
}
export function attachProfile(registry, { personId, profileId, kind }) {
  requireId(personId); requireId(profileId);
  if (!['employee', 'doctor', 'user'].includes(kind)) throw new Error('INVALID_PROFILE_KIND');
  if (!registry.persons.some(p => p.personId === personId)) throw new Error('PERSON_NOT_FOUND');
  if (registry.profiles.some(p => p.profileId === profileId || (p.personId === personId && p.kind === kind))) throw new Error('PROFILE_EXISTS');
  return freeze({ persons: clone(registry.persons), profiles: [...clone(registry.profiles), { personId, profileId, kind }] });
}
function validateScope(scope) {
  if (!scope || Object.keys(scope).some(k => !['clinicId', 'branchIds', 'resourceIds'].includes(k))) throw new Error('INVALID_SCOPE');
  requireId(scope.clinicId);
  for (const key of ['branchIds', 'resourceIds']) if (scope[key] !== undefined && (!denseArray(scope[key], id) || !scope[key].length)) throw new Error('INVALID_SCOPE');
}
function contains(outer, inner) {
  return outer.clinicId === inner.clinicId && ['branchIds', 'resourceIds'].every(k => outer[k] === undefined || (inner[k] !== undefined && inner[k].every(v => outer[k].includes(v))));
}
function overlaps(a, b) {
  return a.clinicId === b.clinicId && ['branchIds', 'resourceIds'].every(k => a[k] === undefined || b[k] === undefined || a[k].some(v => b[k].includes(v)));
}
function validateGrant(grant) {
  for (const key of ['grantId', 'subjectId', 'action', 'resource']) requireId(grant[key]);
  if (!['allow', 'deny'].includes(grant.effect) || typeof grant.canDelegate !== 'boolean') throw new Error('INVALID_GRANT');
  validateScope(grant.scope);
  if (instant(grant.startsAt) >= instant(grant.expiresAt)) throw new Error('INVALID_INTERVAL');
  if (grant.revokedAt !== null) instant(grant.revokedAt);
}
export function defineGrant(input) {
  const grant = { ...clone(input), revokedAt: input.revokedAt ?? null, canDelegate: input.canDelegate ?? false };
  validateGrant(grant);
  if (grant.parentGrantId !== undefined) throw new Error('USE_DELEGATION_COMMAND');
  return freeze(grant);
}
function live(grant, grants, now, seen = new Set()) {
  if (seen.has(grant.grantId)) return false;
  seen.add(grant.grantId);
  if (now < instant(grant.startsAt) || now >= instant(grant.expiresAt) || (grant.revokedAt !== null && now >= instant(grant.revokedAt))) return false;
  if (grant.parentGrantId === undefined) return true;
  const parent = grants.find(g => g.grantId === grant.parentGrantId);
  if (!parent || !parent.canDelegate || parent.effect !== 'allow' || parent.subjectId !== grant.delegatedBy || parent.action !== grant.action || parent.resource !== grant.resource || !contains(parent.scope, grant.scope) || instant(grant.startsAt) < instant(parent.startsAt) || instant(grant.expiresAt) > instant(parent.expiresAt)) return false;
  // Delegator losing authority (including an explicit denial) invalidates child access.
  if (grants.some(g => g.subjectId === parent.subjectId && g.effect === 'deny' && g.action === grant.action && g.resource === grant.resource && overlaps(g.scope, grant.scope) && live(g, grants, now, new Set(seen)))) return false;
  return live(parent, grants, now, seen);
}
/** Deny by default; explicit denials override allowances, including owner allowances. */
export function evaluatePermission(grants, { subjectId, action, resource, scope, at }) {
  try {
    requireId(subjectId); requireId(action); requireId(resource); validateScope(scope);
    const now = instant(at);
    if (!denseArray(grants)) throw new Error('INVALID_GRANT_LIST');
    if (new Set(grants.map(g => g.grantId)).size !== grants.length) return freeze({ allowed: false, reason: 'INVALID_POLICY' });
    grants.forEach(validateGrant);
    const candidates = grants.filter(g => g.subjectId === subjectId && g.action === action && g.resource === resource && live(g, grants, now));
    if (candidates.some(g => g.effect === 'deny' && overlaps(g.scope, scope))) return freeze({ allowed: false, reason: 'EXPLICIT_DENY' });
    return candidates.some(g => g.effect === 'allow' && contains(g.scope, scope)) ? freeze({ allowed: true, reason: 'EXPLICIT_ALLOW' }) : freeze({ allowed: false, reason: 'NO_MATCHING_GRANT' });
  } catch { return freeze({ allowed: false, reason: 'INVALID_POLICY' }); }
}
/** Only an explicitly delegable grant can issue a bounded non-redelegable child. */
export function delegatePermission(grants, { parentGrantId, actorId, grantId, subjectId, scope, startsAt, expiresAt, at }) {
  const now = instant(at);
  if (!denseArray(grants)) throw new Error('INVALID_GRANT_LIST');
  grants.forEach(validateGrant);
  if (new Set(grants.map(g => g.grantId)).size !== grants.length || grants.some(g => g.grantId === grantId)) throw new Error('DUPLICATE_GRANT');
  const parent = grants.find(g => g.grantId === parentGrantId);
  if (!parent || parent.subjectId !== actorId || !parent.canDelegate || parent.effect !== 'allow' || !live(parent, grants, now)) throw new Error('DELEGATION_DENIED');
  validateScope(scope);
  if (!contains(parent.scope, scope) || instant(startsAt) < now || instant(startsAt) < instant(parent.startsAt) || instant(expiresAt) > instant(parent.expiresAt)) throw new Error('DELEGATION_EXCEEDS_AUTHORITY');
  if (grants.some(g => g.subjectId === actorId && g.effect === 'deny' && g.action === parent.action && g.resource === parent.resource && overlaps(g.scope, scope) && instant(g.startsAt) < instant(expiresAt) && instant(g.expiresAt) > instant(startsAt) && (g.revokedAt === null || instant(g.revokedAt) > instant(startsAt)))) throw new Error('DELEGATION_DENIED');
  const child = { grantId, subjectId, action: parent.action, resource: parent.resource, scope: clone(scope), effect: 'allow', canDelegate: false, startsAt, expiresAt, revokedAt: null, parentGrantId, delegatedBy: actorId };
  validateGrant(child);
  return freeze(child);
}
/** Authorization to revoke is the adapter's responsibility; no history is mutated. */
export function revokeGrant(grant, at) {
  validateGrant(grant); instant(at);
  if (grant.revokedAt !== null) throw new Error('ALREADY_REVOKED');
  return freeze({ ...clone(grant), revokedAt: at });
}
