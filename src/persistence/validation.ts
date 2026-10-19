import { currency } from '../finance/money.ts';
export class FinanceError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status = 400) { super(code); this.code = code; this.status = status; }
}
export function fail(code: string, status = 400): never { throw new FinanceError(code, status); }
export function identifier(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value)) fail('INVALID_REQUEST');
  return value;
}
export function businessDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('INVALID_REQUEST');
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) fail('INVALID_REQUEST');
  return value;
}
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype || Reflect.ownKeys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) fail('INVALID_REQUEST');
  return value as Record<string, unknown>;
}
function array<T>(value: unknown, validate: (item: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100 || Reflect.ownKeys(value).length !== value.length + 1) fail('INVALID_REQUEST');
  const result: T[] = [];
  for (let i = 0; i < value.length; i++) { if (!Object.hasOwn(value, i)) fail('INVALID_REQUEST'); result.push(validate(value[i])); }
  return result;
}
function amount(value: unknown): string { if (typeof value !== 'string' || !/^[1-9][0-9]{0,29}$/.test(value)) fail('INVALID_REQUEST'); return value; }
function currencyCode(value: unknown): 'YER' | 'SAR' | 'USD' {
  if (value !== 'YER' && value !== 'SAR' && value !== 'USD') fail('INVALID_REQUEST');
  currency(value); return value;
}
type Base = { key: string; expectedVersion: number; reason: string; onDate: string };
export type Command = Base & (
  | { type: 'DRAFT_AGREEMENT'; payload: { agreementId: string; currency: 'YER' | 'SAR' | 'USD'; minor: string; schedule: {dueDate: string; minor: string}[] } }
  | { type: 'APPROVE_AGREEMENT'; payload: { agreementId: string; obligationId: string } }
  | { type: 'RECORD_RECEIPT'; payload: { receiptId: string; cashMovementId: string; currency: 'YER' | 'SAR' | 'USD'; minor: string; allocations: {id: string; obligationId: string; sourceMinor: string}[] } }
);
/** Bounded strict shape. No client actor, context, locale, timestamp or aggregate. */
export function validateCommand(input: unknown): Command {
  const raw = object(input, ['key', 'expectedVersion', 'type', 'reason', 'onDate', 'payload']);
  const key = identifier(raw.key), onDate = businessDate(raw.onDate);
  if (typeof raw.expectedVersion !== 'number' || !Number.isSafeInteger(raw.expectedVersion) || raw.expectedVersion < 0 || raw.expectedVersion >= Number.MAX_SAFE_INTEGER) fail('INVALID_REQUEST');
  if (typeof raw.reason !== 'string' || !raw.reason.trim() || raw.reason.length > 500) fail('INVALID_REQUEST');
  const base = { key, onDate, expectedVersion: raw.expectedVersion, reason: raw.reason };
  let command: Command;
  switch (raw.type) {
    case 'DRAFT_AGREEMENT': {
      const p = object(raw.payload, ['agreementId', 'currency', 'minor', 'schedule']);
      command = { ...base, type: raw.type, payload: { agreementId: identifier(p.agreementId), currency: currencyCode(p.currency), minor: amount(p.minor), schedule: array(p.schedule, item => { const s = object(item, ['dueDate', 'minor']); return {dueDate: businessDate(s.dueDate), minor: amount(s.minor)}; }) } }; break;
    }
    case 'APPROVE_AGREEMENT': {
      const p = object(raw.payload, ['agreementId', 'obligationId']);
      command = { ...base, type: raw.type, payload: { agreementId: identifier(p.agreementId), obligationId: identifier(p.obligationId) } }; break;
    }
    case 'RECORD_RECEIPT': {
      const p = object(raw.payload, ['receiptId', 'cashMovementId', 'currency', 'minor', 'allocations']);
      command = { ...base, type: raw.type, payload: { receiptId: identifier(p.receiptId), cashMovementId: identifier(p.cashMovementId), currency: currencyCode(p.currency), minor: amount(p.minor), allocations: array(p.allocations, item => { const a = object(item, ['id', 'obligationId', 'sourceMinor']); return {id: identifier(a.id), obligationId: identifier(a.obligationId), sourceMinor: amount(a.sourceMinor)}; }) } }; break;
    }
    default: fail('UNSUPPORTED_COMMAND');
  }
  if (Buffer.byteLength(JSON.stringify(command)) > 32768) fail('REQUEST_TOO_LARGE', 413);
  return command;
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item: unknown) => canonical(item)).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(k => `${JSON.stringify(k)}:${canonical(record[k])}`).join(',')}}`;
  }
  const result = JSON.stringify(value);
  if (result === undefined) fail('INVALID_REQUEST');
  return result;
}
