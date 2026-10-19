import test from 'node:test';
import assert from 'node:assert/strict';
import { CURRENCIES, parseMoney, convertMinor, roundRatio, units } from '../../src/finance/money.ts';
import { createAccount, execute, obligationBalance, receiptBalance } from '../../src/finance/account.ts';
const day = '2026-10-19';
const fresh = () => createAccount({ id: 'account-1', patientId: 'patient-1', entityId: 'entity-1' });
const cmd = (s, type, payload, key = `command-${s.version}`) => ({ key, expectedVersion: s.version, actorId: 'synthetic-actor', reason: 'Synthetic test', onDate: day, type, payload });
const run = (s, type, payload, key) => execute(s, cmd(s, type, payload, key)).state;
const draft = (s = fresh()) => run(s, 'DRAFT_AGREEMENT', { agreementId: 'agreement-1', currency: 'SAR', minor: '150000', schedule: [{ dueDate: day, minor: '50000' }, { dueDate: '2026-12-01', minor: '100000' }] });
const approved = () => run(draft(), 'APPROVE_AGREEMENT', { agreementId: 'agreement-1', obligationId: 'obligation-1' });
const receipt = (s = approved(), minor = '50000', extra = {}) => run(s, 'RECORD_RECEIPT', { receiptId: 'receipt-1', cashMovementId: 'cash-in-1', currency: 'SAR', minor, allocations: [{ id: 'allocation-1', obligationId: 'obligation-1', sourceMinor: minor }], ...extra });
const refundPayload = (minor = '10000', id = '1') => ({ refundId: `refund-${id}`, cashMovementId: `cash-out-${id}`, receiptId: 'receipt-1', currency: 'SAR', minor, releasePolicy: 'ORIGINAL_ALLOCATION_CUMULATIVE_FLOOR', releases: [{ id: `release-${id}`, allocationId: 'allocation-1', sourceMinor: minor }] });
const fx = { sourceCurrency: 'USD', targetCurrency: 'SAR', numerator: '375', denominator: '100', rounding: 'HALF_EVEN', capturedAt: '2026-10-19T00:00:00Z', source: 'synthetic-test-rate', approvedBy: 'synthetic-approver' };

test('money registry and parsing preserve integer precision even above Number safe range', () => {
  assert.deepEqual(CURRENCIES, { YER: 2, SAR: 2, USD: 2 });
  for (const c of Object.keys(CURRENCIES)) assert.deepEqual(parseMoney('1500.01', c), { currency: c, minor: '150001' });
  assert.equal(parseMoney('900719925474099300.99', 'SAR').minor, '90071992547409930099');
  for (const bad of ['-1', '1e2', '01', 'NaN', 'Infinity', '1.001', '.1', '1.', '', ' 1', 1, null]) assert.throws(() => parseMoney(bad, 'SAR'));
  for (const bad of ['EUR', 'sar', '__proto__', null]) assert.throws(() => parseMoney('1', bad));
  for (const bad of [1, 1n, '-1', '01', '1.0', '1e2']) assert.throws(() => units(bad));
});
test('rational FX and declared rounding have exact explicit direction', () => {
  assert.equal(convertMinor('10000', fx), '37500');
  assert.equal(roundRatio(5n, 2n, 'HALF_EVEN'), 2n);
  assert.equal(roundRatio(7n, 2n, 'HALF_EVEN'), 4n);
  assert.equal(roundRatio(5n, 2n, 'HALF_UP'), 3n);
  assert.equal(roundRatio(9n, 2n, 'DOWN'), 4n);
  for (const change of [{ rounding: undefined }, { numerator: '0' }, { denominator: '0' }, { source: '' }, { approvedBy: '' }, { capturedAt: 'yesterday' }, { capturedAt: '2026-02-30T00:00:00Z' }, { targetCurrency: 'EUR' }]) assert.throws(() => convertMinor('10000', { ...fx, ...change }));
});
test('draft has no debt and approval recognizes principal once', () => {
  const s = draft();
  assert.equal(s.obligations.length, 0);
  const a = run(s, 'APPROVE_AGREEMENT', { agreementId: 'agreement-1', obligationId: 'obligation-1' });
  assert.equal(obligationBalance(a, 'obligation-1', day).remainingMinor, '150000');
  assert.throws(() => run(a, 'APPROVE_AGREEMENT', { agreementId: 'agreement-1', obligationId: 'obligation-2' }), /already approved/);
  assert.equal(s.agreements[0].status, 'DRAFT');
});
test('1500 SAR agreement, 500 SAR collection, invoice leave 1000 remaining', () => {
  const s = receipt();
  assert.deepEqual(obligationBalance(s, 'obligation-1', day), { currency: 'SAR', principalMinor: '150000', allocatedMinor: '50000', remainingMinor: '100000', dueMinor: '0', overdueMinor: '0' });
  const invoiced = run(s, 'ISSUE_INVOICE', { invoiceId: 'invoice-1', obligationId: 'obligation-1' });
  assert.equal(invoiced.obligations.length, 1);
  assert.equal(invoiced.cash.length, 1);
  assert.equal(obligationBalance(invoiced, 'obligation-1', day).remainingMinor, '100000');
  assert.equal(obligationBalance(invoiced, 'obligation-1', '2026-12-01').dueMinor, '100000');
  assert.equal(obligationBalance(invoiced, 'obligation-1', '2026-12-01').overdueMinor, '0');
  assert.equal(obligationBalance(invoiced, 'obligation-1', '2026-12-02').overdueMinor, '100000');
  assert.throws(() => run(invoiced, 'ISSUE_INVOICE', { invoiceId: 'invoice-2', obligationId: 'obligation-1' }), /already invoiced/);
});
test('partial refund releases once, never double-subtracts and does not reduce principal', () => {
  const original = receipt();
  const c = cmd(original, 'REFUND_RECEIPT', refundPayload());
  const first = execute(original, c);
  const s = first.state;
  assert.equal(obligationBalance(s, 'obligation-1', day).remainingMinor, '110000');
  assert.deepEqual(receiptBalance(s, 'receipt-1'), { currency: 'SAR', netCashMinor: '40000', allocatedMinor: '40000', availableMinor: '0' });
  assert.equal(s.cash.length, 2);
  const replay = execute(s, c);
  assert.equal(replay.state, s); assert.equal(replay.replayed, true); assert.deepEqual(replay.result, first.result);
  assert.throws(() => run(s, 'REFUND_RECEIPT', refundPayload()), /Duplicate/);
  const final = run(s, 'REVERSE_RECEIPT', refundPayload('40000', '2'));
  assert.equal(obligationBalance(final, 'obligation-1', day).remainingMinor, '150000');
  assert.equal(receiptBalance(final, 'receipt-1').netCashMinor, '0');
  assert.throws(() => run(final, 'REFUND_RECEIPT', refundPayload('1', '3')), /exceeds/);
  assert.equal(receiptBalance(original, 'receipt-1').netCashMinor, '50000');
});
test('cross-currency stores original cash and immutable FX snapshot, refund uses original currency', () => {
  const inputFx = { ...fx };
  const s = receipt(approved(), '10000', { currency: 'USD', allocations: [{ id: 'allocation-1', obligationId: 'obligation-1', sourceMinor: '10000', fx: inputFx }] });
  inputFx.numerator = '999';
  assert.equal(s.allocations[0].fx.numerator, '375');
  assert.equal(s.cash[0].currency, 'USD');
  assert.equal(obligationBalance(s, 'obligation-1', day).remainingMinor, '112500');
  const refund = refundPayload('2000'); refund.currency = 'USD';
  const r = run(s, 'REFUND_RECEIPT', refund);
  assert.equal(obligationBalance(r, 'obligation-1', day).remainingMinor, '120000');
  assert.deepEqual(receiptBalance(r, 'receipt-1'), { currency: 'USD', netCashMinor: '8000', allocatedMinor: '8000', availableMinor: '0' });
  assert.throws(() => run(s, 'REFUND_RECEIPT', refundPayload('2000')), /original receipt currency/);
});
test('partial cross-currency rounding releases exact final residual', () => {
  let s = receipt(approved(), '3', { currency: 'USD', allocations: [{ id: 'allocation-1', obligationId: 'obligation-1', sourceMinor: '3', fx: { ...fx, numerator: '2', denominator: '3', rounding: 'DOWN' } }] });
  assert.equal(s.allocations[0].targetMinor, '2');
  for (let i = 1; i <= 3; i++) {
    s = run(s, 'REFUND_RECEIPT', { ...refundPayload('1', String(i)), currency: 'USD' });
    assert.equal(receiptBalance(s, 'receipt-1').availableMinor, '0');
  }
  assert.deepEqual(s.releases.map(r => r.targetMinor), ['0', '1', '1']);
  assert.equal(obligationBalance(s, 'obligation-1', day).remainingMinor, '150000');
});
test('idempotency binds full body, precedes stale check, and canonicalizes object key order', () => {
  const s = approved(), c = cmd(s, 'ISSUE_INVOICE', { invoiceId: 'invoice-1', obligationId: 'obligation-1' }, 'stable');
  const first = execute(s, c);
  const newer = receipt(first.state);
  const replay = execute(newer, { ...c, payload: { obligationId: 'obligation-1', invoiceId: 'invoice-1' } });
  assert.equal(replay.state, newer);
  assert.deepEqual(replay.result, first.result);
  assert.throws(() => execute(newer, { ...c, reason: 'different' }), /Idempotency payload conflict/);
  assert.throws(() => execute(newer, { ...c, key: 'new-key' }), /Stale aggregate version/);
});
test('all snapshots, histories, results, schedules and nested FX are immutable', () => {
  const s = receipt(approved(), '10000', { currency: 'USD', allocations: [{ id: 'allocation-1', obligationId: 'obligation-1', sourceMinor: '10000', fx }] });
  function check(value) { if (value && typeof value === 'object') { assert.ok(Object.isFrozen(value)); Object.values(value).forEach(check); } }
  check(s);
  assert.throws(() => { s.history[0].payload.schedule[0].minor = '1'; }, TypeError);
  assert.throws(() => { s.allocations[0].fx.numerator = '1'; }, TypeError);
  assert.throws(() => s.cash.push({}), TypeError);
});
test('overpayment, unallocated credit and malformed allocation cannot partially mutate original state', () => {
  const s = approved(), before = JSON.stringify(s);
  assert.throws(() => receipt(s, '150001'), /Overpayment/);
  assert.throws(() => receipt(s, '50000', { allocations: [] }), /Explicit full allocation/);
  assert.throws(() => receipt(s, '50000', { allocations: [{ id: 'a', obligationId: 'obligation-1', sourceMinor: '49999' }] }), /credit/);
  assert.throws(() => receipt(s, '50000', { allocations: [{ id: 'a', obligationId: 'missing', sourceMinor: '50000' }] }), /not found/);
  assert.throws(() => receipt(s, '50000', { allocations: [{ id: 'a', obligationId: 'obligation-1', sourceMinor: '50000', fx }] }), /FX not allowed/);
  assert.throws(() => receipt(s, '50000', { currency: 'USD', allocations: [{ id: 'a', obligationId: 'obligation-1', sourceMinor: '50000' }] }), /direction/);
  assert.equal(JSON.stringify(s), before);
});
test('invalid schedules, identity, actor, date and unknown commands are rejected', () => {
  assert.throws(() => createAccount({ id: '', patientId: 'p', entityId: 'e' }));
  const s = fresh(), c = cmd(s, 'DRAFT_AGREEMENT', { agreementId: 'a', currency: 'SAR', minor: '100', schedule: [{ minor: '99', dueDate: day }] });
  assert.throws(() => execute(s, c), /equal principal/);
  assert.throws(() => execute(s, { ...c, actorId: '' }), /Actor/);
  assert.throws(() => execute(s, { ...c, onDate: '2026-02-30' }), /Invalid date/);
  assert.throws(() => execute(s, { ...c, type: 'CREATE_CREDIT' }), /Unsupported/);
  assert.throws(() => execute(s, { ...c, expectedVersion: 0.5 }), /plain JSON/);
});
test('refund requires matching full releases and cannot silently perform partial reversal', () => {
  const s = receipt(), p = refundPayload();
  assert.throws(() => run(s, 'REVERSE_RECEIPT', p), /all remaining/);
  assert.throws(() => run(s, 'REFUND_RECEIPT', { ...p, releases: [] }), /exact allocation/);
  assert.throws(() => run(s, 'REFUND_RECEIPT', { ...p, releasePolicy: 'TODAYS_FX' }), /Explicit refund/);
  assert.throws(() => run(s, 'REFUND_RECEIPT', { ...p, minor: '50001', releases: [{ ...p.releases[0], sourceMinor: '50001' }] }), /exceeds/);
});
test('multiple allocations cannot cumulatively overpay or duplicate allocation IDs', () => {
  const s = approved();
  assert.throws(() => receipt(s, '160000', { allocations: [{ id: 'a', obligationId: 'obligation-1', sourceMinor: '80000' }, { id: 'b', obligationId: 'obligation-1', sourceMinor: '80000' }] }), /Overpayment/);
  assert.throws(() => receipt(s, '50000', { allocations: [{ id: 'a', obligationId: 'obligation-1', sourceMinor: '25000' }, { id: 'a', obligationId: 'obligation-1', sourceMinor: '25000' }] }), /Duplicate/);
  const good = receipt(s, '50000', { allocations: [{ id: 'a', obligationId: 'obligation-1', sourceMinor: '25000' }, { id: 'b', obligationId: 'obligation-1', sourceMinor: '25000' }] });
  assert.equal(good.cash.length, 1);
  assert.equal(obligationBalance(good, 'obligation-1', day).remainingMinor, '100000');
});
test('cash source IDs and receipt IDs cannot be reused under a fresh idempotency key', () => {
  const s = receipt();
  assert.throws(() => receipt(s), /Duplicate/);
  assert.throws(() => receipt(s, '50000', { receiptId: 'receipt-2' }), /Duplicate/);
  assert.equal(s.cash.length, 1);
});
test('refund cannot release allocation belonging to another receipt', () => {
  const s = receipt();
  const second = receipt(s, '10000', { receiptId: 'receipt-2', cashMovementId: 'cash-in-2', allocations: [{ id: 'allocation-2', obligationId: 'obligation-1', sourceMinor: '10000' }] });
  const p = refundPayload('10000');
  p.releases[0].allocationId = 'allocation-2';
  assert.throws(() => run(second, 'REFUND_RECEIPT', p), /receipt mismatch/);
  assert.equal(second.releases.length, 0);
});
test('refund loops preserve money conservation after every synthetic partial refund', () => {
  let s = receipt();
  for (let i = 1; i <= 50; i++) {
    s = run(s, 'REFUND_RECEIPT', refundPayload('1000', String(i)));
    const r = receiptBalance(s, 'receipt-1'), b = obligationBalance(s, 'obligation-1', day);
    assert.equal(r.availableMinor, '0');
    assert.equal(r.netCashMinor, r.allocatedMinor);
    assert.equal(BigInt(b.remainingMinor) + BigInt(b.allocatedMinor), 150000n);
    assert.equal(BigInt(r.netCashMinor) + s.refunds.reduce((n, f) => n + BigInt(f.minor), 0n), 50000n);
  }
  assert.equal(s.cash.length, 51);
  assert.equal(obligationBalance(s, 'obligation-1', day).remainingMinor, '150000');
});
test('exported roundRatio rejects Number operands before arithmetic or coercion', () => {
  assert.throws(() => roundRatio(5, 2, 'DOWN'), { name: 'TypeError', message: 'Ratio operands must be BigInt' });
  for (const bad of [5, 2.5, NaN, Infinity, -Infinity, '5', null, undefined, true, {}, { valueOf: () => 5n }]) {
    for (const mode of ['DOWN', 'HALF_UP', 'HALF_EVEN']) {
      assert.throws(() => roundRatio(bad, 2n, mode), /operands must be BigInt/);
      assert.throws(() => roundRatio(5n, bad, mode), /operands must be BigInt/);
    }
  }
  for (const denominator of [0n, -1n]) assert.throws(() => roundRatio(5n, denominator, 'DOWN'), /Invalid ratio/);
  assert.throws(() => roundRatio(-1n, 2n, 'DOWN'), /Invalid ratio/);
  for (const mode of [undefined, null, '', 'down', 'CEIL', 1, {}]) assert.throws(() => roundRatio(5n, 2n, mode), /Explicit rounding required/);
  assert.equal(roundRatio(0n, 2n, 'DOWN'), 0n);
  assert.equal(roundRatio(5n, 2n, 'DOWN'), 2n);
  assert.equal(typeof roundRatio(5n, 2n, 'DOWN'), 'bigint');
});
