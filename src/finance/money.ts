import type { Currency, Rounding, FxSnapshot } from './types.ts';
/** Explicit prototype currency registry. Minor amounts are canonical integer strings. */
export const CURRENCIES = Object.freeze({ YER: 2, SAR: 2, USD: 2 });
export function currency(code: unknown): Currency {
  if (code !== 'YER' && code !== 'SAR' && code !== 'USD') throw new Error('Unsupported currency');
  return code;
}
export function units(value: unknown, { positive = false }: {positive?: boolean} = {}) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) throw new Error('Expected canonical nonnegative integer string');
  const n = BigInt(value);
  if (positive && n === 0n) throw new Error('Amount must be positive');
  return n;
}
/** Parse a human decimal without ever passing through floating point. */
export function parseMoney(decimal: string, code: string) {
  const checkedCode = currency(code);
  if (typeof decimal !== 'string' || !/^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(decimal)) throw new Error('Invalid decimal amount');
  const [whole, fraction = ''] = decimal.split('.');
  if (whole === undefined) throw new Error('Invalid decimal amount');
  const precision = CURRENCIES[checkedCode];
  if (fraction.length > precision) throw new Error('Excess currency precision');
  return Object.freeze({ currency: checkedCode, minor: (BigInt(whole) * 10n ** BigInt(precision) + BigInt(fraction.padEnd(precision, '0'))).toString() });
}
export function roundRatio(numerator: bigint, denominator: bigint, mode: Rounding) {
  if (typeof numerator !== 'bigint' || typeof denominator !== 'bigint') throw new TypeError('Ratio operands must be BigInt');
  if (denominator <= 0n || numerator < 0n) throw new Error('Invalid ratio');
  if (!['DOWN', 'HALF_UP', 'HALF_EVEN'].includes(mode)) throw new Error('Explicit rounding required');
  const q = numerator / denominator, r = numerator % denominator;
  if (mode === 'DOWN') return q;
  const twice = r * 2n;
  return q + (twice > denominator || (twice === denominator && (mode === 'HALF_UP' || q % 2n !== 0n)) ? 1n : 0n);
}
/** Rate is target major units per source major unit; never a market quote. */
export function convertMinor(sourceMinor: string, snapshot: FxSnapshot) {
  const { sourceCurrency, targetCurrency, numerator, denominator, rounding, capturedAt, source, approvedBy } = snapshot ?? {};
  currency(sourceCurrency); currency(targetCurrency);
  if (![capturedAt, source, approvedBy].every(v => typeof v === 'string' && v.trim())) throw new Error('Incomplete FX evidence');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(capturedAt) || Number.isNaN(Date.parse(capturedAt))) throw new Error('Invalid FX timestamp');
  const normalizedTime = capturedAt.includes('.') ? capturedAt : capturedAt.replace('Z', '.000Z');
  if (new Date(capturedAt).toISOString() !== normalizedTime) throw new Error('Invalid FX timestamp');
  const n = units(sourceMinor) * units(numerator, { positive: true }) * 10n ** BigInt(CURRENCIES[targetCurrency]);
  const d = units(denominator, { positive: true }) * 10n ** BigInt(CURRENCIES[sourceCurrency]);
  return roundRatio(n, d, rounding).toString();
}
