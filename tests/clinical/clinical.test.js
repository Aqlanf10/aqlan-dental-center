import test from 'node:test';
import assert from 'node:assert/strict';
import { createClinicalRecord, executeClinical, isFdiTooth, validateServiceTarget } from '../../src/clinical/index.ts';

const identity = { persons: [{ personId: 'person-1', displayName: 'Synthetic Person' }, { personId: 'person-2', displayName: 'Synthetic Person' }] };
const empty = () => createClinicalRecord({ patientId: 'patient-1', personId: 'person-1', clinicId: 'clinic-1' }, identity);
const n = text => ({ text });
function cmd(state, type, payload, extra = {}) {
  return { type, payload, key: `key-${state.version}`, expectedVersion: state.version, patientId: state.patientId, clinicId: state.clinicId, actorId: 'synthetic-doctor', onDate: '2026-10-19', reason: 'Synthetic workflow test', ...extra };
}
const run = (s, type, payload, extra) => executeClinical(s, cmd(s, type, payload, extra)).state;
const link = { planId: 'plan-1', caseId: 'case-1' };
const visitLink = { ...link, visitId: 'visit-1' };
const procLink = { ...visitLink, procedureId: 'proc-1' };
function setup(service = 'ENDO', target = { tooth: '11' }) {
  let s = run(empty(), 'CREATE_PLAN', { planId: 'plan-1' });
  const p = { ...link, service, target, baseline: n('Original synthetic intake') };
  if (service === 'ENDO') p.episodeId = 'episode-1';
  s = run(s, 'CREATE_CASE', p);
  s = run(s, 'APPROVE_CASE', link);
  return run(s, 'OPEN_VISIT', { ...visitLink, kind: 'INITIAL', delta: n('First visit') });
}
function draft(s, target = s.cases[0].target, cov = { status: 'REVIEW_REQUIRED' }) {
  return run(s, 'DRAFT_PROCEDURE', { ...procLink, target, note: n('Synthetic procedure'), coverage: cov });
}
function ref(target) {
  return { status: 'REFERENCED', reference: { patientId: 'patient-1', ...link, obligationId: 'ob-1', obligationLineId: 'line-1', agreementVersionId: 'agreement-v1', service: 'ENDO', target } };
}

test('patient has explicit existing person and clinic references; names are not identifiers', () => {
  const s = empty(); assert.equal(s.personId, 'person-1');
  assert.throws(() => createClinicalRecord({ patientId: 'p', personId: 'missing', clinicId: 'c' }, identity), /PERSON_NOT_FOUND/);
  const second = createClinicalRecord({ patientId: 'patient-2', personId: 'person-2', clinicId: 'clinic-1' }, identity);
  assert.notEqual(s.personId, second.personId);
});
test('FDI primary/permanent structural codes reject out-of-range and coercions', () => {
  for (const t of ['11', '48', '51', '85']) assert.equal(isFdiTooth(t), true);
  for (const t of ['10', '49', '56', '86', '91', '011', 11, null]) assert.equal(isFdiTooth(t), false);
});
test('service target shape is strict, including surfaces and arch', () => {
  validateServiceTarget('RESTORATION', { tooth: '26', surfaces: ['M', 'O'] });
  validateServiceTarget('ORTHO', { arch: 'BOTH' }); validateServiceTarget('CONSULTATION', {});
  for (const [service, target] of [ ['ENDO', { tooth: ['11', '12'] }], ['ENDO', { tooth: '11', surfaces: ['M'] }], ['RESTORATION', { tooth: '11', surfaces: [] }], ['RESTORATION', { tooth: '11', surfaces: ['M', 'M'] }], ['RESTORATION', { tooth: '11', surfaces: ['X'] }], ['ORTHO', { tooth: '11' }], ['CONSULTATION', { tooth: '11' }], ['UNKNOWN', {}]]) assert.throws(() => validateServiceTarget(service, target));
  assert.throws(() => validateServiceTarget('RESTORATION', { tooth: '11', surfaces: Array(1) }));
});
test('one master plan and explicit cases; no case deduplication by tooth', () => {
  let s = setup();
  assert.throws(() => run(s, 'CREATE_PLAN', { planId: 'plan-2' }), /MASTER_PLAN_EXISTS/);
  s = run(s, 'CREATE_CASE', { ...link, caseId: 'case-2', service: 'ENDO', target: { tooth: '11' }, episodeId: 'episode-2', baseline: n('Separate explicit episode') });
  assert.equal(s.cases.length, 2);
  assert.throws(() => run(s, 'CREATE_CASE', { ...link, caseId: 'case-3', service: 'ENDO', target: { tooth: '11' }, episodeId: 'episode-2', baseline: n('Invalid duplicate episode') }), /DUPLICATE_EPISODE/);
});
test('patient and clinic mismatches fail before clinical mutation', () => {
  const s = setup();
  for (const extra of [{ patientId: 'patient-2' }, { clinicId: 'clinic-2' }]) assert.throws(() => run(s, 'DRAFT_PROCEDURE', {}, extra), /CONTEXT_MISMATCH/);
  assert.equal(s.procedures.length, 0);
});
test('case, visit and procedure links cannot cross clinical contexts', () => {
  let s = draft(setup());
  s = run(s, 'CREATE_CASE', { ...link, caseId: 'case-2', service: 'ENDO', target: { tooth: '11' }, episodeId: 'episode-2', baseline: n('Second') });
  s = run(s, 'APPROVE_CASE', { ...link, caseId: 'case-2' });
  s = run(s, 'OPEN_VISIT', { ...link, caseId: 'case-2', visitId: 'visit-2', kind: 'FOLLOW_UP', delta: n('Delta') });
  assert.throws(() => run(s, 'APPROVE_PROCEDURE', { ...procLink, caseId: 'case-2' }), /CONTEXT_MISMATCH/);
  assert.throws(() => run(s, 'APPROVE_PROCEDURE', { ...procLink, caseId: 'case-2', visitId: 'visit-2' }), /CONTEXT_MISMATCH/);
  assert.throws(() => run(s, 'DRAFT_PROCEDURE', { ...procLink, procedureId: 'p2', caseId: 'case-2', target: { tooth: '11' }, note: n('Mismatch'), coverage: { status: 'REVIEW_REQUIRED' } }), /CONTEXT_MISMATCH/);
});
test('procedure location must stay within case service scope', () => {
  assert.throws(() => draft(setup(), { tooth: '12' }), /TARGET_MISMATCH/);
  const s = setup('RESTORATION', { tooth: '26', surfaces: ['M', 'O'] });
  assert.throws(() => draft(s, { tooth: '26', surfaces: ['D'] }), /TARGET_MISMATCH/);
  assert.equal(draft(s, { tooth: '26', surfaces: ['M'] }).procedures.length, 1);
  assert.equal(draft(setup('ORTHO', { arch: 'BOTH' }), { arch: 'LOWER' }).procedures.length, 1);
  assert.throws(() => draft(setup('ORTHO', { arch: 'UPPER' }), { arch: 'LOWER' }), /TARGET_MISMATCH/);
});
test('drafts cannot complete without explicit clinical approvals', () => {
  let s = run(empty(), 'CREATE_PLAN', { planId: 'plan-1' });
  s = run(s, 'CREATE_CASE', { ...link, service: 'CONSULTATION', target: {}, baseline: n('Intake') });
  assert.throws(() => run(s, 'OPEN_VISIT', { ...visitLink, kind: 'INITIAL', delta: n('Delta') }), /CASE_NOT_APPROVED/);
  s = draft(setup());
  assert.throws(() => run(s, 'COMPLETE_PROCEDURE', procLink), /INVALID_TRANSITION/);
  assert.throws(() => run(s, 'COMPLETE_VISIT', visitLink), /INCOMPLETE_PROCEDURES/);
  assert.equal(s.procedures[0].status, 'DRAFT');
});
test('immutable versions retain draft, approval, completion and reasoned amendment', () => {
  const original = draft(setup());
  let s = run(original, 'APPROVE_PROCEDURE', procLink);
  s = run(s, 'COMPLETE_PROCEDURE', procLink);
  s = run(s, 'COMPLETE_VISIT', visitLink);
  s = run(s, 'AMEND_PROCEDURE_NOTE', { ...procLink, note: n('Explicit corrected note') }, { reason: 'Correct transcription' });
  assert.equal(original.procedures[0].status, 'DRAFT');
  assert.deepEqual(s.procedures[0].revisions.map(r => r.status), ['DRAFT', 'APPROVED', 'COMPLETED', 'COMPLETED']);
  assert.equal(s.procedures[0].revisions[3].reason, 'Correct transcription');
  assert.equal(s.procedures[0].revisions[2].note.text, 'Synthetic procedure');
  assert.throws(() => { s.procedures[0].revisions[0].note.text = 'overwrite'; }, TypeError);
  assert.throws(() => run(s, 'AMEND_PROCEDURE_NOTE', { ...procLink, note: n('X') }, { reason: '' }), /TEXT_REQUIRED/);
});
test('stale draft cannot overwrite newer approval; signed target cannot be silently edited', () => {
  const s = draft(setup());
  const old = cmd(s, 'REVISE_PROCEDURE_DRAFT', { ...procLink, target: { tooth: '11' }, note: n('Old draft'), coverage: { status: 'REVIEW_REQUIRED' } });
  const approved = run(s, 'APPROVE_PROCEDURE', procLink, { key: 'approve' });
  assert.throws(() => executeClinical(approved, old), /STALE_VERSION/);
  assert.throws(() => run(approved, 'REVISE_PROCEDURE_DRAFT', old.payload), /INVALID_TRANSITION/);
  assert.throws(() => run(approved, 'AMEND_PROCEDURE_NOTE', { ...procLink, note: n('x'), target: { tooth: '12' } }), /INVALID_FIELDS/);
});
test('idempotent retry survives subsequent writes; changed payload conflicts', () => {
  let s = draft(setup()); const approve = cmd(s, 'APPROVE_PROCEDURE', procLink);
  s = executeClinical(s, approve).state;
  s = run(s, 'COMPLETE_PROCEDURE', procLink);
  const replay = executeClinical(s, approve);
  assert.equal(replay.state, s); assert.equal(replay.replayed, true);
  assert.throws(() => executeClinical(s, { ...approve, reason: 'Changed payload' }), /IDEMPOTENCY_CONFLICT/);
});
test('repeat completion cannot duplicate clinical work or completion history', () => {
  let s = run(draft(setup()), 'APPROVE_PROCEDURE', procLink);
  const completion = cmd(s, 'COMPLETE_PROCEDURE', procLink); s = executeClinical(s, completion).state;
  assert.equal(executeClinical(s, completion).state, s);
  assert.throws(() => run(s, 'COMPLETE_PROCEDURE', procLink), /INVALID_TRANSITION/);
  assert.equal(s.procedures.length, 1);
  assert.equal(s.history.filter(h => h.type === 'COMPLETE_PROCEDURE').length, 1);
});
test('adjustments record delta and preserve baseline version without repeated intake', () => {
  let s = setup('ORTHO', { arch: 'BOTH' });
  const baselineVersion = s.cases[0].version;
  s = run(s, 'OPEN_VISIT', { ...link, visitId: 'adjust-1', kind: 'ADJUSTMENT', delta: n('Changed since previous visit') });
  s = run(s, 'AMEND_CASE_BASELINE', { ...link, baseline: n('Corrected baseline') }, { reason: 'Correct original transcription' });
  s = run(s, 'OPEN_VISIT', { ...link, visitId: 'adjust-2', kind: 'ADJUSTMENT', delta: n('No change reported') });
  assert.equal(s.visits[1].baselineVersion, baselineVersion);
  assert.equal(s.visits[2].baselineVersion, s.cases[0].version);
  assert.equal(s.cases[0].revisions[0].baseline.text, 'Original synthetic intake');
  assert.equal(Object.hasOwn(s.visits[1], 'baseline'), false);
});
test('old case remains explicit and continuing visits never create cases or invoices', () => {
  let s = run(empty(), 'CREATE_PLAN', { planId: 'plan-1' });
  s = run(s, 'CREATE_CASE', { ...link, service: 'ORTHO', target: { arch: 'BOTH' }, baseline: n('Synthetic historical intake'), legacyReference: 'legacy-case-100' });
  s = run(s, 'APPROVE_CASE', link);
  for (const v of ['visit-1', 'visit-2']) s = run(s, 'OPEN_VISIT', { ...link, visitId: v, kind: 'ADJUSTMENT', delta: n('Continuity') });
  assert.equal(s.cases.length, 1); assert.equal(s.visits.length, 2);
  assert.equal(s.cases[0].legacyReference, 'legacy-case-100');
  assert.throws(() => run(s, 'CREATE_CASE', { ...link, caseId: 'case-2', service: 'ORTHO', target: { arch: 'BOTH' }, baseline: n('Duplicate'), legacyReference: 'legacy-case-100' }), /DUPLICATE_LEGACY_REFERENCE/);
  for (const field of ['invoices', 'cash', 'obligations']) assert.equal(Object.hasOwn(s, field), false);
});
test('coverage must be explicit and match patient, case, service and exact procedure target', () => {
  const s = setup(); const target = { tooth: '11' };
  assert.equal(draft(s, target, ref(target)).procedures[0].coverage.status, 'REFERENCED');
  for (const patch of [{ patientId: 'other' }, { caseId: 'other' }, { service: 'ORTHO' }, { target: { tooth: '12' } }]) {
    const cov = ref(target); Object.assign(cov.reference, patch);
    assert.throws(() => draft(s, target, cov), /COVERAGE_CONTEXT_MISMATCH/);
  }
  assert.throws(() => draft(s, target, {}), /INVALID_COVERAGE/);
});
test('clinical completion with coverage review pending has no financial side effects', () => {
  let s = run(draft(setup()), 'APPROVE_PROCEDURE', procLink);
  s = run(s, 'COMPLETE_PROCEDURE', procLink);
  assert.equal(s.procedures[0].coverage.status, 'REVIEW_REQUIRED');
  assert.deepEqual(Object.keys(s).sort(), ['patientId', 'personId', 'clinicId', 'version', 'plans', 'cases', 'visits', 'procedures', 'history', 'idempotency'].sort());
});
test('input snapshots cannot mutate records and malformed commands fail atomically', () => {
  const s = setup(); const payload = { ...procLink, target: { tooth: '11' }, note: n('Original'), coverage: { status: 'REVIEW_REQUIRED' } };
  const output = run(s, 'DRAFT_PROCEDURE', payload); payload.note.text = 'Mutated';
  assert.equal(output.procedures[0].note.text, 'Original'); assert.equal(s.procedures.length, 0);
  assert.throws(() => run(s, 'DRAFT_PROCEDURE', payload, { onDate: '2026-02-30' }), /INVALID_DATE/);
  assert.throws(() => run(s, 'DRAFT_PROCEDURE', { ...payload, invoiceId: 'forbidden' }), /INVALID_FIELDS/);
});
