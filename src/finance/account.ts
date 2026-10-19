import type { AccountState, Allocation, FinanceCommand, ExecutionResult } from './types.ts';
import { currency, units, convertMinor } from './money.ts';

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} required`);
  return value;
}
function date(value: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error('Invalid date');
  return value;
}
function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`;
  throw new Error('Commands must contain plain JSON data');
}
function find<T extends {id:string}>(rows: T[], id: string, kind: string): T {
  return rows.find(row => row.id === id) ?? (() => { throw new Error(`${kind} not found`); })();
}
function unique(rows: {id:string}[], id: string) {
  text(id, 'ID');
  if (rows.some(row => row.id === id)) throw new Error('Duplicate source ID');
}
const sum = <K extends string>(rows: Record<K, string>[], field: K) => rows.reduce((n, row) => n + units(row[field]), 0n);
function released(state: AccountState, allocationId: string, field: 'sourceMinor'|'targetMinor') {
  return sum(state.releases.filter(r => r.allocationId === allocationId), field);
}
function active(state: AccountState, allocation: Allocation, field: 'sourceMinor'|'targetMinor') { return units(allocation[field]) - released(state, allocation.id, field); }
function receiptTotals(state: AccountState, id: string) {
  const receipt = find(state.receipts, id, 'Receipt');
  const outgoing = sum(state.cash.filter(c => c.receiptId === id && c.direction === 'OUT'), 'minor');
  const allocated = state.allocations.filter(a => a.receiptId === id).reduce((n, a) => n + active(state, a, 'sourceMinor'), 0n);
  return { receipt, net: units(receipt.minor) - outgoing, allocated, available: units(receipt.minor) - outgoing - allocated };
}
export function createAccount({ id, patientId, entityId }: {id:string;patientId:string;entityId:string}): AccountState {
  [id, patientId, entityId].forEach(v => text(v, 'Account identity'));
  return freeze({ id, patientId, entityId, version: 0, agreements: [], obligations: [], invoices: [], receipts: [], allocations: [], releases: [], refunds: [], cash: [], history: [], idempotency: [] });
}
export function obligationBalance(state: AccountState, obligationId: string, asOf: string) {
  date(asOf);
  const obligation = find(state.obligations, obligationId, 'Obligation');
  const paid = state.allocations.filter(a => a.obligationId === obligationId).reduce((n, a) => n + active(state, a, 'targetMinor'), 0n);
  const scheduledDue = sum(obligation.schedule.filter(s => s.dueDate <= asOf), 'minor');
  const overdue = sum(obligation.schedule.filter(s => s.dueDate < asOf), 'minor');
  return freeze({ currency: obligation.currency, principalMinor: obligation.minor, allocatedMinor: paid.toString(), remainingMinor: (units(obligation.minor) - paid).toString(), dueMinor: (scheduledDue > paid ? scheduledDue - paid : 0n).toString(), overdueMinor: (overdue > paid ? overdue - paid : 0n).toString() });
}
export function receiptBalance(state: AccountState, receiptId: string) {
  const t = receiptTotals(state, receiptId);
  return freeze({ currency: t.receipt.currency, netCashMinor: t.net.toString(), allocatedMinor: t.allocated.toString(), availableMinor: t.available.toString() });
}
/** Pure immutable transition. Caller must persist atomically with a real CAS in production. */
export function execute(state: AccountState, command: FinanceCommand): ExecutionResult {
  const fingerprint = canonical(command);
  text(command.key, 'Idempotency key');
  const prior = state.idempotency.find(item => item.key === command.key);
  if (prior) {
    if (prior.fingerprint !== fingerprint) throw new Error('Idempotency payload conflict');
    return freeze({ state, result: prior.result, replayed: true });
  }
  if (!Number.isSafeInteger(command.expectedVersion) || command.expectedVersion !== state.version) throw new Error('Stale aggregate version');
  text(command.actorId, 'Actor'); text(command.reason, 'Reason'); date(command.onDate);
  const next = structuredClone(state);
  command = structuredClone(command);
  let result;
  switch (command.type) {
    case 'DRAFT_AGREEMENT': {
      const p = command.payload;
      unique(next.agreements, p.agreementId); currency(p.currency); units(p.minor, { positive: true });
      if (!Array.isArray(p.schedule) || p.schedule.length === 0) throw new Error('Schedule required');
      p.schedule.forEach(s => { date(s.dueDate); units(s.minor, { positive: true }); });
      if (sum(p.schedule, 'minor') !== units(p.minor)) throw new Error('Schedule must equal principal');
      next.agreements.push({ id: p.agreementId, currency: p.currency, minor: p.minor, schedule: p.schedule, status: 'DRAFT' });
      result = { agreementId: p.agreementId }; break;
    }
    case 'APPROVE_AGREEMENT': {
      const p = command.payload;
      const agreement = find(next.agreements, p.agreementId, 'Agreement');
      if (agreement.status !== 'DRAFT') throw new Error('Agreement already approved');
      unique(next.obligations, p.obligationId);
      agreement.status = 'APPROVED';
      next.obligations.push({ id: p.obligationId, agreementId: agreement.id, currency: agreement.currency, minor: agreement.minor, schedule: structuredClone(agreement.schedule) });
      result = { obligationId: p.obligationId }; break;
    }
    case 'ISSUE_INVOICE': {
      const p = command.payload;
      unique(next.invoices, p.invoiceId);
      const obligation = find(next.obligations, p.obligationId, 'Obligation');
      // First slice: one full documentary invoice, no independently posted principal.
      if (next.invoices.some(i => i.obligationId === obligation.id)) throw new Error('Obligation already invoiced');
      next.invoices.push({ id: p.invoiceId, obligationId: obligation.id, currency: obligation.currency, minor: obligation.minor });
      result = { invoiceId: p.invoiceId }; break;
    }
    case 'RECORD_RECEIPT': {
      const p = command.payload;
      unique(next.receipts, p.receiptId); unique(next.cash, p.cashMovementId);
      currency(p.currency); units(p.minor, { positive: true });
      // No credit model: receipt must be fully allocated in this command.
      if (!Array.isArray(p.allocations) || p.allocations.length === 0) throw new Error('Explicit full allocation required');
      if (sum(p.allocations, 'sourceMinor') !== units(p.minor)) throw new Error('Unallocated credit is not supported');
      next.receipts.push({ id: p.receiptId, currency: p.currency, minor: p.minor });
      next.cash.push({ id: p.cashMovementId, receiptId: p.receiptId, currency: p.currency, minor: p.minor, direction: 'IN' });
      for (const a of p.allocations) {
        unique(next.allocations, a.id); units(a.sourceMinor, { positive: true });
        const obligation = find(next.obligations, a.obligationId, 'Obligation');
        let targetMinor;
        if (obligation.currency === p.currency) {
          if (a.fx !== undefined) throw new Error('FX not allowed for same currency');
          targetMinor = a.sourceMinor;
        } else {
          if (a.fx?.sourceCurrency !== p.currency || a.fx?.targetCurrency !== obligation.currency) throw new Error('FX direction mismatch');
          targetMinor = convertMinor(a.sourceMinor, a.fx);
        }
        units(targetMinor, { positive: true });
        if (units(targetMinor) > units(obligationBalance(next, obligation.id, command.onDate).remainingMinor)) throw new Error('Overpayment forbidden');
        next.allocations.push({ id: a.id, receiptId: p.receiptId, obligationId: obligation.id, sourceMinor: a.sourceMinor, targetMinor, sourceCurrency: p.currency, targetCurrency: obligation.currency, ...(a.fx ? { fx: a.fx } : {}) });
      }
      result = { receiptId: p.receiptId }; break;
    }
    case 'REFUND_RECEIPT':
    case 'REVERSE_RECEIPT': {
      const p = command.payload;
      unique(next.refunds, p.refundId); unique(next.cash, p.cashMovementId);
      const totals = receiptTotals(next, p.receiptId);
      units(p.minor, { positive: true });
      if (p.currency !== totals.receipt.currency) throw new Error('Refund must use original receipt currency');
      if (units(p.minor) > totals.net) throw new Error('Refund exceeds remaining cash');
      if (command.type === 'REVERSE_RECEIPT' && units(p.minor) !== totals.net) throw new Error('Reversal must reverse all remaining receipt cash');
      if (!Array.isArray(p.releases) || sum(p.releases, 'sourceMinor') !== units(p.minor)) throw new Error('Refund requires exact allocation releases');
      for (const release of p.releases) {
        unique(next.releases, release.id);
        const allocation = find(next.allocations, release.allocationId, 'Allocation');
        if (allocation.receiptId !== p.receiptId) throw new Error('Allocation receipt mismatch');
        const amount = units(release.sourceMinor, { positive: true });
        if (amount > active(next, allocation, 'sourceMinor')) throw new Error('Allocation already released or release exceeds allocation');
        // Cumulative proportional floor, final release consumes exact residue.
        // Explicit synthetic policy; cross-currency refunds need real approval later.
        if (p.releasePolicy !== 'ORIGINAL_ALLOCATION_CUMULATIVE_FLOOR') throw new Error('Explicit refund release policy required');
        const previousSource = released(next, allocation.id, 'sourceMinor');
        const previousTarget = released(next, allocation.id, 'targetMinor');
        const cumulativeTarget = (previousSource + amount) * units(allocation.targetMinor) / units(allocation.sourceMinor);
        next.releases.push({ id: release.id, allocationId: allocation.id, refundId: p.refundId, sourceMinor: amount.toString(), targetMinor: (cumulativeTarget - previousTarget).toString() });
      }
      next.refunds.push({ id: p.refundId, receiptId: p.receiptId, minor: p.minor, currency: p.currency, kind: command.type, releasePolicy: p.releasePolicy });
      next.cash.push({ id: p.cashMovementId, receiptId: p.receiptId, refundId: p.refundId, currency: p.currency, minor: p.minor, direction: 'OUT' });
      result = { refundId: p.refundId }; break;
    }
    default: throw new Error('Unsupported finance command');
  }
  next.version += 1;
  next.history.push({ version: next.version, key: command.key, type: command.type, actorId: command.actorId, reason: command.reason, onDate: command.onDate, payload: command.payload, result });
  next.idempotency.push({ key: command.key, fingerprint, result });
  return freeze({ state: next, result, replayed: false });
}
