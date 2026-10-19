import test from 'node:test';
import assert from 'node:assert/strict';
import { emptySettings, updateSettings, settingsAt, publicSettings, settingsAudit, resolveLanguage, SETTING_DEFINITIONS, FIXED_INVARIANTS } from '../../src/settings/index.js';
const at = '2026-06-01T00:00:00Z', future = '2026-07-01T00:00:00Z';
const empty = () => emptySettings({ scope: 'clinic', scopeId: 'clinic1' });
const command = overrides => ({ expectedVersion: 0, patch: {}, effectiveAt: at, recordedAt: at, actorId: 'owner-user', reason: 'Synthetic test setup', sourceId: 'source1', ...overrides });
test('empty first save persists defaults with explicit provenance and version', () => {
  const original = empty(), state = updateSettings(original, command());
  assert.equal(original.version, 0); assert.equal(state.version, 1);
  const snapshot = settingsAt(state, at);
  assert.equal(snapshot.persisted, true); assert.equal(snapshot.values['clinic.language'], 'ar');
  assert.equal(snapshot.values['clinic.timezone'], 'UTC'); assert.equal(snapshot.values['clinic.functionalCurrency'], null);
  assert.equal(state.events[0].actorId, 'owner-user'); assert.equal(state.events[0].reason, 'Synthetic test setup');
  assert.equal(settingsAt(original, at).persisted, false);
});
test('stale edits and duplicate command sources reject without mutation', () => {
  const state = updateSettings(empty(), command());
  assert.throws(() => updateSettings(state, command({ patch: { 'clinic.language': 'en' } })), /STALE_SETTINGS_VERSION/);
  assert.throws(() => updateSettings(state, command({ expectedVersion: 1 })), /DUPLICATE_SOURCE/);
  assert.equal(state.version, 1);
});
test('typed fields reject unknown keys, undefined, bad enums/timezone, wrong scope and disabled invariants', () => {
  for (const patch of [{ 'clinic.language': 'fr' }, { 'clinic.language': undefined }, { 'clinic.timezone': 'Unknown/Zone' }, { 'clinic.functionalCurrency': 'EUR' }, { 'user.language': 'en' }, { denyAccessByDefault: false }, { preservePostedHistory: false }, { constructor: 1 }]) assert.throws(() => updateSettings(empty(), command({ patch })));
  assert.equal(FIXED_INVARIANTS.denyAccessByDefault, true);
  assert.throws(() => { SETTING_DEFINITIONS['clinic.language'].values.push('fr'); }, TypeError);
});
test('omitted fields are untouched, currency/timezone do not follow language', () => {
  const state = updateSettings(empty(), command({ patch: { 'clinic.timezone': 'Asia/Aden', 'clinic.functionalCurrency': 'SAR' } }));
  const next = updateSettings(state, command({ expectedVersion: 1, sourceId: 'source2', patch: { 'clinic.language': 'en' } }));
  assert.deepEqual(settingsAt(next, at).values, { 'clinic.language': 'en', 'clinic.timezone': 'Asia/Aden', 'clinic.functionalCurrency': 'SAR', 'clinic.webhookSecretReference': null });
});
test('future policy preserves historical snapshots and rejects backdated or reordered edits', () => {
  const first = updateSettings(empty(), command());
  const oldSnapshot = settingsAt(first, at);
  const scheduled = updateSettings(first, command({ expectedVersion: 1, sourceId: 'source2', patch: { 'clinic.language': 'en' }, effectiveAt: future }));
  assert.deepEqual(settingsAt(scheduled, at), oldSnapshot);
  assert.equal(settingsAt(scheduled, future).values['clinic.language'], 'en');
  assert.equal(settingsAt(first, future).values['clinic.language'], 'ar');
  assert.throws(() => updateSettings(scheduled, command({ expectedVersion: 2, sourceId: 'source3' })), /NON_MONOTONIC_CHANGE/);
  assert.throws(() => updateSettings(empty(), command({ effectiveAt: '2026-05-01T00:00:00Z' })), /RETROACTIVE_CHANGE_DENIED/);
  assert.throws(() => { scheduled.events[0].changes['clinic.language'] = 'en'; }, TypeError);
});
test('user preference overrides clinic default; null explicitly restores inheritance', () => {
  const clinic = updateSettings(empty(), command());
  let user = emptySettings({ scope: 'user', scopeId: 'user1' });
  assert.equal(resolveLanguage(clinic, user, at), 'ar');
  user = updateSettings(user, command({ patch: { 'user.language': 'en' } }));
  assert.equal(resolveLanguage(clinic, user, at), 'en');
  user = updateSettings(user, command({ expectedVersion: 1, sourceId: 'source2', patch: { 'user.language': null } }));
  assert.equal(resolveLanguage(clinic, user, at), 'ar');
});
test('sensitive references are redacted from public snapshots and audit; raw credentials rejected', () => {
  const reference = 'vault://synthetic/webhook';
  const state = updateSettings(empty(), command({ patch: { 'clinic.webhookSecretReference': reference }, reason: reference }));
  assert.equal(settingsAt(state, at).values['clinic.webhookSecretReference'], reference);
  assert.equal(publicSettings(state, at).values['clinic.webhookSecretReference'], '[REDACTED]');
  assert.ok(!JSON.stringify(settingsAudit(state)).includes(reference));
  assert.ok(!JSON.stringify(publicSettings(state, at)).includes(reference));
  assert.throws(() => updateSettings(empty(), command({ patch: { 'clinic.webhookSecretReference': 'synthetic-password' } })), /INVALID_SECRET_REFERENCE/);
});
test('provenance and timezone-qualified effective dates are required', () => {
  for (const overrides of [{ actorId: '' }, { sourceId: '' }, { reason: '' }, { effectiveAt: '2026-06-01' }, { recordedAt: 'invalid' }]) assert.throws(() => updateSettings(empty(), command(overrides)));
});
test('invalid calendar timestamps reject instead of being normalized', () => {
  for (const effectiveAt of ['2026-02-30T00:00:00Z', '2026-06-01T24:00:00Z', '2026-06-01T00:00:00']) assert.throws(() => updateSettings(empty(), command({ effectiveAt })), /INVALID_TIME/);
});
test('an unchanged explicit value still persists as an audited version and inputs stay immutable', () => {
  const patch = { 'clinic.language': 'ar' };
  const first = updateSettings(empty(), command({ patch }));
  patch['clinic.language'] = 'en';
  assert.equal(first.events[0].changes['clinic.language'], 'ar');
  const second = updateSettings(first, command({ expectedVersion: 1, sourceId: 'source2', patch: { 'clinic.language': 'ar' } }));
  assert.equal(second.version, 2); assert.equal(second.events.length, 2);
  assert.deepEqual(settingsAudit(second)[1].changes, { 'clinic.language': 'ar' });
});
