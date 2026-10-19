/** Immutable in-memory configuration aggregate. Persistence, atomic compare-and-swap,
 * authenticated authorization and trusted clock must be supplied by an adapter.
 */
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const time = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value)) throw new Error('INVALID_TIME');
  const parsed = Date.parse(value), day = Date.parse(value.slice(0, 10) + 'T00:00:00Z');
  if (!Number.isFinite(parsed) || !Number.isFinite(day) || new Date(day).toISOString().slice(0, 10) !== value.slice(0, 10) || Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59) throw new Error('INVALID_TIME');
  return parsed;
};
const validId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value);
export const SETTING_DEFINITIONS = freeze({
  'clinic.language': { scope: 'clinic', type: 'enum', values: ['ar', 'en'], default: 'ar', sensitive: false },
  'clinic.timezone': { scope: 'clinic', type: 'timezone', default: 'UTC', sensitive: false },
  'clinic.functionalCurrency': { scope: 'clinic', type: 'nullable-enum', values: ['YER', 'SAR', 'USD'], default: null, sensitive: false },
  'user.language': { scope: 'user', type: 'nullable-enum', values: ['ar', 'en'], default: null, sensitive: false },
  'clinic.webhookSecretReference': { scope: 'clinic', type: 'secret-reference', default: null, sensitive: true },
});
// Safety invariants deliberately have no setting keys and cannot be disabled.
export const FIXED_INVARIANTS = freeze({ denyAccessByDefault: true, preservePostedHistory: true, uniqueSourcePosting: true });
function validateValue(definition, value) {
  if (definition.type === 'enum' && !definition.values.includes(value)) throw new Error('INVALID_SETTING_VALUE');
  if (definition.type === 'nullable-enum' && value !== null && !definition.values.includes(value)) throw new Error('INVALID_SETTING_VALUE');
  if (definition.type === 'timezone') {
    if (typeof value !== 'string') throw new Error('INVALID_SETTING_VALUE');
    try { new Intl.DateTimeFormat('en', { timeZone: value }); } catch { throw new Error('INVALID_SETTING_VALUE'); }
  }
  if (definition.type === 'secret-reference' && value !== null && (typeof value !== 'string' || !/^vault:\/\/[A-Za-z0-9/_-]{1,160}$/.test(value))) throw new Error('INVALID_SECRET_REFERENCE');
}
export function emptySettings({ scope, scopeId }) {
  if (!['clinic', 'user'].includes(scope) || !validId(scopeId)) throw new Error('INVALID_SCOPE');
  return freeze({ scope, scopeId, version: 0, events: [] });
}
const defaults = scope => Object.fromEntries(Object.entries(SETTING_DEFINITIONS).filter(([, d]) => d.scope === scope).map(([key, d]) => [key, d.default]));
const redact = patch => Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, SETTING_DEFINITIONS[key].sensitive && value !== null ? '[REDACTED]' : value]));
/** An empty first patch persists defaults. Omitted fields never imply reset.
 * Effective times must be monotonic, so queued future changes cannot be bypassed.
 */
export function updateSettings(state, { expectedVersion, patch, effectiveAt, recordedAt, actorId, reason, sourceId }) {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion !== state.version) throw new Error('STALE_SETTINGS_VERSION');
  if (!validId(actorId) || !validId(sourceId) || typeof reason !== 'string' || !reason.trim()) throw new Error('PROVENANCE_REQUIRED');
  if (!patch || typeof patch !== 'object' || Array.isArray(patch) || ![Object.prototype, null].includes(Object.getPrototypeOf(patch))) throw new Error('INVALID_PATCH');
  const effectiveTime = time(effectiveAt), recordedTime = time(recordedAt);
  if (effectiveTime < recordedTime) throw new Error('RETROACTIVE_CHANGE_DENIED');
  const previous = state.events.at(-1);
  if (previous && (effectiveTime < time(previous.effectiveAt) || recordedTime < time(previous.recordedAt))) throw new Error('NON_MONOTONIC_CHANGE');
  if (state.events.some(e => e.sourceId === sourceId)) throw new Error('DUPLICATE_SOURCE');
  for (const [key, value] of Object.entries(patch)) {
    const definition = Object.hasOwn(SETTING_DEFINITIONS, key) ? SETTING_DEFINITIONS[key] : null;
    if (!definition || definition.scope !== state.scope) throw new Error('UNKNOWN_OR_WRONG_SCOPE_SETTING');
    validateValue(definition, value);
  }
  const changes = state.version === 0 ? { ...defaults(state.scope), ...structuredClone(patch) } : structuredClone(patch);
  const event = { version: state.version + 1, effectiveAt, recordedAt, actorId, reason, sourceId, changes };
  return freeze({ ...structuredClone(state), version: event.version, events: [...structuredClone(state.events), event] });
}
/** Snapshot may contain secret references. Only use internally; send publicSettings to clients. */
export function settingsAt(state, at) {
  const instant = time(at);
  let values = defaults(state.scope), version = 0;
  for (const event of state.events) if (time(event.effectiveAt) <= instant) { values = { ...values, ...event.changes }; version = event.version; }
  return freeze({ scope: state.scope, scopeId: state.scopeId, version, persisted: version > 0, values });
}
export function publicSettings(state, at) {
  const snapshot = settingsAt(state, at);
  return freeze({ ...snapshot, values: redact(snapshot.values) });
}
/** Free-text reasons can contain arbitrary user text; public audit omits them. */
export function settingsAudit(state) {
  return freeze(state.events.map(e => ({ version: e.version, actorId: e.actorId, sourceId: e.sourceId, recordedAt: e.recordedAt, effectiveAt: e.effectiveAt, changes: redact(e.changes) })));
}
export function resolveLanguage(clinicState, userState, at) {
  if (clinicState.scope !== 'clinic' || userState.scope !== 'user') throw new Error('INVALID_SCOPE');
  return settingsAt(userState, at).values['user.language'] ?? settingsAt(clinicState, at).values['clinic.language'];
}
