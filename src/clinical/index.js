/** Synthetic, pure clinical records. Trusted adapters MUST authenticate and authorize every command. */
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const clone = value => structuredClone(value);
function fail(message) { throw new Error(message); }
function id(value) { if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value)) fail('INVALID_ID'); return value; }
function text(value) { if (typeof value !== 'string' || !value.trim()) fail('TEXT_REQUIRED'); return value; }
function exact(value, keys) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype || Object.keys(value).some(k => !keys.includes(k))) fail('INVALID_FIELDS');
}
function canonical(value) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) if (!Object.hasOwn(value, i)) fail('INVALID_JSON');
    return `[${value.map(canonical).join(',')}]`;
  }
  if (value && Object.getPrototypeOf(value) === Object.prototype) return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  fail('INVALID_JSON');
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('INVALID_DATE');
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) fail('INVALID_DATE');
  return value;
}
function find(rows, value) { id(value); return rows.find(r => r.id === value) ?? fail('REFERENCE_NOT_FOUND'); }
function unique(rows, value) { id(value); if (rows.some(r => r.id === value)) fail('DUPLICATE_ID'); }
export function isFdiTooth(value) {
  return typeof value === 'string' && /^(?:[1-4][1-8]|[5-8][1-5])$/.test(value);
}
/** Structural location validation only; not a clinical indication or diagnostic rule. */
export function validateServiceTarget(service, target) {
  exact(target, ['tooth', 'surfaces', 'arch']);
  if (service === 'ENDO' || service === 'RESTORATION') {
    if (!isFdiTooth(target.tooth) || target.arch !== undefined) fail('INVALID_TOOTH_TARGET');
    if (service === 'ENDO') { if (target.surfaces !== undefined) fail('INVALID_ENDO_TARGET'); }
    else {
      const s = target.surfaces;
      if (!Array.isArray(s) || !s.length || new Set(s).size !== s.length) fail('INVALID_SURFACES');
      for (let i = 0; i < s.length; i++) if (!Object.hasOwn(s, i) || !['M', 'D', 'O', 'I', 'B', 'L', 'P'].includes(s[i])) fail('INVALID_SURFACES');
    }
  } else if (service === 'ORTHO') {
    if (!['UPPER', 'LOWER', 'BOTH'].includes(target.arch) || target.tooth !== undefined || target.surfaces !== undefined) fail('INVALID_ARCH_TARGET');
  } else if (service === 'CONSULTATION') {
    if (Object.keys(target).length) fail('INVALID_CONSULTATION_TARGET');
  } else fail('UNSUPPORTED_SERVICE');
  return freeze(clone(target));
}
function targetMatches(service, scope, target) {
  validateServiceTarget(service, target);
  if (service === 'ORTHO') return scope.arch === 'BOTH' || scope.arch === target.arch;
  if (service === 'RESTORATION') return scope.tooth === target.tooth && target.surfaces.every(s => scope.surfaces.includes(s));
  return canonical(scope) === canonical(target);
}
function note(value) { exact(value, ['text']); return { text: text(value.text) }; }
function revision(row, command) {
  const { revisions, ...snapshot } = row;
  row.revisions.push({ ...clone(snapshot), actorId: command.actorId, onDate: command.onDate, reason: command.reason, commandKey: command.key });
}
function context(state, p, withVisit = false) {
  const plan = find(state.plans, p.planId), c = find(state.cases, p.caseId);
  if (c.planId !== plan.id || c.patientId !== state.patientId || plan.patientId !== state.patientId) fail('CONTEXT_MISMATCH');
  let visit;
  if (withVisit) {
    visit = find(state.visits, p.visitId);
    if (visit.caseId !== c.id || visit.planId !== plan.id || visit.patientId !== state.patientId) fail('CONTEXT_MISMATCH');
  }
  return { plan, c, visit };
}
function procedureContext(state, p) {
  const ctx = context(state, p, true), procedure = find(state.procedures, p.procedureId);
  if (procedure.visitId !== ctx.visit.id || procedure.caseId !== ctx.c.id || procedure.planId !== ctx.plan.id || procedure.patientId !== state.patientId) fail('CONTEXT_MISMATCH');
  return { ...ctx, procedure };
}
function coverage(value, state, c, target) {
  exact(value, ['status', 'reference']);
  if (value.status === 'REVIEW_REQUIRED') {
    if (value.reference !== undefined) fail('INVALID_COVERAGE');
    return { status: 'REVIEW_REQUIRED' };
  }
  if (value.status !== 'REFERENCED') fail('INVALID_COVERAGE');
  const r = value.reference;
  exact(r, ['patientId', 'planId', 'caseId', 'obligationId', 'obligationLineId', 'agreementVersionId', 'service', 'target']);
  ['patientId', 'planId', 'caseId', 'obligationId', 'obligationLineId', 'agreementVersionId'].forEach(k => id(r[k]));
  if (r.patientId !== state.patientId || r.planId !== c.planId || r.caseId !== c.id || r.service !== c.service || canonical(r.target) !== canonical(target)) fail('COVERAGE_CONTEXT_MISMATCH');
  return clone(value);
}
/** Explicit person reference. Identity registry and clinical state must be loaded from trusted storage. */
export function createClinicalRecord({ patientId, personId, clinicId }, identityRegistry) {
  [patientId, personId, clinicId].forEach(id);
  if (!identityRegistry?.persons?.some(p => p.personId === personId)) fail('PERSON_NOT_FOUND');
  return freeze({ patientId, personId, clinicId, version: 0, plans: [], cases: [], visits: [], procedures: [], history: [], idempotency: [] });
}
/** In-memory CAS and replay contract; persistence must enforce both atomically. No financial side effects. */
export function executeClinical(state, command) {
  exact(command, ['type', 'key', 'expectedVersion', 'actorId', 'onDate', 'reason', 'patientId', 'clinicId', 'payload']);
  const fingerprint = canonical(command);
  [command.key, command.actorId, command.patientId, command.clinicId].forEach(id);
  if (command.patientId !== state.patientId || command.clinicId !== state.clinicId) fail('CONTEXT_MISMATCH');
  const prior = state.idempotency.find(r => r.key === command.key);
  if (prior) {
    if (prior.fingerprint !== fingerprint) fail('IDEMPOTENCY_CONFLICT');
    return freeze({ state, result: prior.result, replayed: true });
  }
  if (!Number.isSafeInteger(command.expectedVersion) || command.expectedVersion !== state.version) fail('STALE_VERSION');
  text(command.reason); date(command.onDate);
  const next = clone(state), p = clone(command.payload);
  let result;
  switch (command.type) {
    case 'CREATE_PLAN': {
      exact(p, ['planId']); unique(next.plans, p.planId);
      if (next.plans.length) fail('MASTER_PLAN_EXISTS');
      next.plans.push({ id: p.planId, patientId: state.patientId });
      result = { planId: p.planId }; break;
    }
    case 'CREATE_CASE': {
      exact(p, ['planId', 'caseId', 'service', 'target', 'episodeId', 'baseline', 'legacyReference']);
      find(next.plans, p.planId); unique(next.cases, p.caseId);
      const target = validateServiceTarget(p.service, p.target);
      if (p.service === 'ENDO') {
        id(p.episodeId);
        if (next.cases.some(c => c.episodeId === p.episodeId)) fail('DUPLICATE_EPISODE');
      } else if (p.episodeId !== undefined) fail('INVALID_EPISODE');
      if (p.legacyReference !== undefined) {
        id(p.legacyReference);
        if (next.cases.some(c => c.legacyReference === p.legacyReference)) fail('DUPLICATE_LEGACY_REFERENCE');
      }
      const c = { id: p.caseId, planId: p.planId, patientId: state.patientId, service: p.service, target, baseline: note(p.baseline), status: 'DRAFT', version: 1, revisions: [] };
      if (p.episodeId !== undefined) c.episodeId = p.episodeId;
      if (p.legacyReference !== undefined) c.legacyReference = p.legacyReference;
      revision(c, command); next.cases.push(c); result = { caseId: c.id, version: c.version }; break;
    }
    case 'APPROVE_CASE':
    case 'AMEND_CASE_BASELINE': {
      exact(p, command.type === 'APPROVE_CASE' ? ['planId', 'caseId'] : ['planId', 'caseId', 'baseline']);
      const { c } = context(next, p);
      if (command.type === 'APPROVE_CASE') {
        if (c.status !== 'DRAFT') fail('INVALID_TRANSITION');
        c.status = 'APPROVED';
      } else c.baseline = note(p.baseline);
      c.version++; revision(c, command); result = { caseId: c.id, version: c.version }; break;
    }
    case 'OPEN_VISIT': {
      exact(p, ['planId', 'caseId', 'visitId', 'kind', 'delta']);
      const { c } = context(next, p); unique(next.visits, p.visitId);
      if (c.status !== 'APPROVED') fail('CASE_NOT_APPROVED');
      if (!['INITIAL', 'FOLLOW_UP', 'ADJUSTMENT'].includes(p.kind)) fail('INVALID_VISIT_KIND');
      if (p.kind === 'ADJUSTMENT' && c.service !== 'ORTHO') fail('INVALID_VISIT_KIND');
      const visit = { id: p.visitId, planId: c.planId, caseId: c.id, patientId: state.patientId, kind: p.kind, delta: note(p.delta), baselineVersion: c.version, status: 'OPEN', version: 1, revisions: [] };
      revision(visit, command); next.visits.push(visit); result = { visitId: visit.id }; break;
    }
    case 'DRAFT_PROCEDURE': {
      exact(p, ['planId', 'caseId', 'visitId', 'procedureId', 'target', 'note', 'coverage']);
      const { c, visit } = context(next, p, true); unique(next.procedures, p.procedureId);
      if (visit.status !== 'OPEN' || c.status !== 'APPROVED') fail('INVALID_TRANSITION');
      if (!targetMatches(c.service, c.target, p.target)) fail('TARGET_MISMATCH');
      const procedure = { id: p.procedureId, planId: c.planId, caseId: c.id, visitId: visit.id, patientId: state.patientId, service: c.service, target: clone(p.target), note: note(p.note), coverage: coverage(p.coverage, state, c, p.target), status: 'DRAFT', version: 1, revisions: [] };
      revision(procedure, command); next.procedures.push(procedure); result = { procedureId: procedure.id, version: procedure.version }; break;
    }
    case 'REVISE_PROCEDURE_DRAFT':
    case 'APPROVE_PROCEDURE':
    case 'COMPLETE_PROCEDURE':
    case 'AMEND_PROCEDURE_NOTE': {
      const fields = ['planId', 'caseId', 'visitId', 'procedureId'];
      exact(p, [...fields, ...(command.type === 'REVISE_PROCEDURE_DRAFT' ? ['target', 'note', 'coverage'] : command.type === 'AMEND_PROCEDURE_NOTE' ? ['note'] : [])]);
      const { c, visit, procedure: proc } = procedureContext(next, p);
      if (command.type === 'REVISE_PROCEDURE_DRAFT') {
        if (proc.status !== 'DRAFT' || visit.status !== 'OPEN') fail('INVALID_TRANSITION');
        if (!targetMatches(c.service, c.target, p.target)) fail('TARGET_MISMATCH');
        proc.target = clone(p.target); proc.note = note(p.note);
        // Target edits always require a fresh explicit coverage assertion or review marker.
        proc.coverage = coverage(p.coverage, state, c, p.target);
      } else if (command.type === 'AMEND_PROCEDURE_NOTE') {
        if (!['APPROVED', 'COMPLETED'].includes(proc.status)) fail('INVALID_TRANSITION');
        proc.note = note(p.note);
      } else {
        if (visit.status !== 'OPEN' || c.status !== 'APPROVED') fail('INVALID_TRANSITION');
        if (command.type === 'APPROVE_PROCEDURE') {
          if (proc.status !== 'DRAFT') fail('INVALID_TRANSITION');
          proc.status = 'APPROVED'; proc.approvedBy = command.actorId;
        } else {
          if (proc.status !== 'APPROVED') fail('INVALID_TRANSITION');
          proc.status = 'COMPLETED'; proc.completedBy = command.actorId;
        }
      }
      proc.version++; revision(proc, command); result = { procedureId: proc.id, version: proc.version }; break;
    }
    case 'COMPLETE_VISIT': {
      exact(p, ['planId', 'caseId', 'visitId']);
      const { visit } = context(next, p, true);
      if (visit.status !== 'OPEN') fail('INVALID_TRANSITION');
      const procedures = next.procedures.filter(r => r.visitId === visit.id);
      if (!procedures.length || procedures.some(r => r.status !== 'COMPLETED')) fail('INCOMPLETE_PROCEDURES');
      visit.status = 'COMPLETED'; visit.version++; revision(visit, command); result = { visitId: visit.id }; break;
    }
    default: fail('UNKNOWN_COMMAND');
  }
  next.version++;
  next.history.push({ version: next.version, type: command.type, actorId: command.actorId, reason: command.reason, onDate: command.onDate, key: command.key, result: clone(result) });
  next.idempotency.push({ key: command.key, fingerprint, result: clone(result) });
  return freeze({ state: next, result, replayed: false });
}
