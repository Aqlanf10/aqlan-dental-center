import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCommand, FinanceError } from '../../src/persistence/validation.ts';
import { createFinanceHandler } from '../../src/persistence/handler.ts';
import { disposableDatabaseConfig } from '../postgres/config.ts';
import type { FinanceService } from '../../src/persistence/service.ts';
const draft = () => ({ key: 'request-1', expectedVersion: 0, type: 'DRAFT_AGREEMENT', reason: 'Synthetic agreement', onDate: '2026-10-19', payload: { agreementId: 'a-1', currency: 'SAR', minor: '900719925474099300', schedule: [{ dueDate: '2026-10-19', minor: '900719925474099300' }] } });
test('strict boundary preserves exact strings, rejects unsupported fields and malformed values', () => {
  const command = validateCommand(draft());
  assert.equal(command.type, 'DRAFT_AGREEMENT');
  if (command.type !== 'DRAFT_AGREEMENT') throw new Error('Unexpected command type');
  assert.equal(command.payload.minor, '900719925474099300');
  for (const injected of ['actorId', 'state', 'grants', 'entityId', 'patientId', 'recordedAt', 'policy', 'language']) assert.throws(() => validateCommand({ ...draft(), [injected]: 'injected' }), FinanceError);
  for (const value of [null, [], {}, { ...draft(), key: '../a' }, { ...draft(), expectedVersion: -1 }, { ...draft(), expectedVersion: 0.5 }, { ...draft(), onDate: '2026-02-30' }, { ...draft(), type: 'REFUND_RECEIPT' }, { ...draft(), type: 'ISSUE_INVOICE' }, { ...draft(), reason: 'x'.repeat(501) }, { ...draft(), payload: { ...draft().payload, minor: 100 } }, { ...draft(), payload: { ...draft().payload, minor: '01' } }, { ...draft(), payload: { ...draft().payload, minor: '1'.repeat(31) } }, { ...draft(), payload: { ...draft().payload, schedule: Array(101).fill(draft().payload.schedule[0]) } }, { ...draft(), payload: { ...draft().payload, schedule: new Array(1) } }]) assert.throws(() => validateCommand(value), FinanceError);
  assert.throws(() => validateCommand({ key: 'r', expectedVersion: 2, type: 'RECORD_RECEIPT', reason: 'receipt', onDate: '2026-10-19', payload: { receiptId: 'r', cashMovementId: 'c', currency: 'SAR', minor: '1', allocations: [{ id: 'a', obligationId: 'o', sourceMinor: '1', fx: {} }] } }), FinanceError);
});
const auth = { clinicId: 'clinic', userId: 'user', profileId: 'profile', personId: 'person' };
const request = (body = JSON.stringify(draft())) => ({ method: 'POST', path: '/v1/finance/accounts/account/commands', body });
test('handler authenticates first, bounds raw body and does not expose exceptions', async () => {
  let calls = 0;
  const service: FinanceService = { command: async () => { calls++; throw new Error('postgres://secret SQL stack private reason'); }, balance: async () => { throw new Error('private'); } };
  const anonymous = createFinanceHandler(service, async () => null);
  assert.equal((await anonymous(request(), {})).status, 401);
  assert.equal(calls, 0);
  const handler = createFinanceHandler(service, async () => auth);
  assert.equal((await handler(request('x'.repeat(32769)), {})).status, 413);
  assert.equal((await handler(request('{'), {})).status, 400);
  assert.equal((await handler({ ...request(), path: '/v1/finance/accounts/account/commands?clinicId=evil' }, {})).status, 400);
  assert.equal(calls, 0);
  const result = await handler(request(), {});
  assert.equal(result.status, 503);
  assert.ok(!JSON.stringify(result).includes('secret'));
});
test('Arabic and English share machine codes and request bytes; only presentation changes', async () => {
  const seen: unknown[] = [];
  const service: FinanceService = { command: async (_auth, _id, input) => { seen.push(input); throw new FinanceError('STALE_VERSION', 409); }, balance: async () => { throw new Error('unused'); } };
  const handler = createFinanceHandler(service, async () => auth);
  const en = await handler({ ...request(), language: 'en' }, {});
  const ar = await handler({ ...request(), language: 'ar' }, {});
  assert.deepEqual(seen[0], seen[1]);
  assert.equal(en.status, ar.status);
  assert.notDeepEqual(en.body, ar.body);
  assert.ok(JSON.stringify(en.body).includes('STALE_VERSION') && JSON.stringify(ar.body).includes('STALE_VERSION'));
});

test('disposable database guard rejects pg query overrides before any connection', () => {
  const safe = 'postgres://postgres:synthetic-only@localhost:5432/finance_test';
  const config = disposableDatabaseConfig(safe,'1');
  assert.equal(config.host, 'localhost'); assert.ok(!Object.hasOwn(config,'connectionString'));
  assert.equal(disposableDatabaseConfig('postgresql://postgres:synthetic-only@[::1]:5432/finance_test','1').host,'::1');
  for (const url of [safe+'?host=remote.example&user=owner',safe+'?options=-c%20role=postgres',safe+'?password=secret',safe+'#ignored',safe+'?',safe.replace('postgres://','https://'),safe.replace('localhost','remote.example'),safe.replace('/finance_test','/production'),safe.replace('synthetic-only','real-secret'),safe.replace(':5432',':5433')]) assert.throws(() => disposableDatabaseConfig(url,'1'));
  assert.throws(() => disposableDatabaseConfig(safe,undefined));
});
