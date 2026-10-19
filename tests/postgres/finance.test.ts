import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAccount } from '../../src/finance/account.ts';
import { defineGrant } from '../../src/identity/index.ts';
import { createFinanceService } from '../../src/persistence/service.ts';
import type { Hooks, TrustedIdentity } from '../../src/persistence/service.ts';
import { createFinanceHandler } from '../../src/persistence/handler.ts';
import type { Command } from '../../src/persistence/validation.ts';
import type { Pool, PoolClient } from 'pg';
import { disposableDatabaseConfig } from './config.ts';

const enabled = process.env.FINANCE_TEST_DISPOSABLE === '1';
// This separate gate must fail rather than silently pass without a real database.
if (!enabled) throw new Error('FINANCE_TEST_DISPOSABLE=1 and a disposable loopback finance_test database are required');
test('real PostgreSQL finance acceptance (disposable database only)', async t => {
  const ownerConfig = disposableDatabaseConfig(process.env.FINANCE_TEST_DATABASE_URL, process.env.FINANCE_TEST_DISPOSABLE);
  const { Pool: PgPool } = await import('pg');
  const owner = new PgPool(ownerConfig);
  const runtimeConfig = {...ownerConfig, user:'finance_runtime', password:'synthetic-runtime-only'};
  let runtime: Pool;
  try {
    await owner.query("CREATE ROLE finance_runtime LOGIN PASSWORD 'synthetic-runtime-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS");
    await owner.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await owner.query(await readFile(new URL('../../src/persistence/sql/001_finance.sql', import.meta.url), 'utf8'));
    await owner.query(await readFile(new URL('../../src/persistence/sql/002_runtime_grants.sql', import.meta.url), 'utf8'));
    runtime = new PgPool(runtimeConfig);
  } catch (error) { await owner.end(); throw error; }
  const now = () => new Date('2026-10-19T12:00:00Z');
  let sequence = 0;
  type Fixture = { who: TrustedIdentity; accountId: string; entityId: string; patientId: string; branchId: string };
  async function fixture(clinicId = `clinic-${++sequence}`, accountId = `account-${++sequence}`): Promise<Fixture> {
    const entityId = 'entity', patientId = `patient-${accountId}`, branchId = 'branch';
    const who = { clinicId, userId: 'user', profileId: 'profile', personId: 'person' };
    await owner.query("INSERT INTO finance.policies VALUES ($1,$2,'synthetic-v1','SAR','UTC',true) ON CONFLICT DO NOTHING", [clinicId, entityId]);
    await owner.query('INSERT INTO finance.accounts (clinic_id,account_id,entity_id,patient_id,branch_id,version,snapshot) VALUES ($1,$2,$3,$4,$5,0,$6)', [clinicId, accountId, entityId, patientId, branchId, JSON.stringify(createAccount({id: accountId, entityId, patientId}))]);
    const grants = ['DRAFT_AGREEMENT', 'APPROVE_AGREEMENT', 'RECORD_RECEIPT', 'READ_BALANCE'].map(action => defineGrant({ grantId: action, subjectId: who.profileId, action, resource: 'finance', effect: 'allow', scope: {clinicId, branchIds: [branchId], resourceIds: [accountId]}, startsAt: '2026-01-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z' }));
    await owner.query('INSERT INTO finance.memberships VALUES ($1,$2,$3,$4,$5,$6)', [clinicId, accountId, who.userId, who.personId, who.profileId, JSON.stringify(grants)]);
    return { who, accountId, entityId, patientId, branchId };
  }
  function service(hooks: Hooks = {}) { return createFinanceService({ pool: runtime, now, hooks }); }
  const draft = (suffix = '', minor = '1000'): Command => ({key: `draft${suffix}`, type: 'DRAFT_AGREEMENT', expectedVersion: 0, reason: 'synthetic draft', onDate: '2026-10-19', payload: {agreementId: `agreement${suffix}`, currency: 'SAR', minor, schedule: [{dueDate: '2026-10-19', minor}]}});
  const approve = (suffix = ''): Command => ({key: `approve${suffix}`, type: 'APPROVE_AGREEMENT', expectedVersion: 1, reason: 'synthetic approval', onDate: '2026-10-19', payload: {agreementId: `agreement${suffix}`, obligationId: `obligation${suffix}`}});
  const receipt = (suffix = '', minor = '400', expectedVersion = 2, obligationSuffix = ''): Command => ({key: `receipt${suffix}`, type: 'RECORD_RECEIPT', expectedVersion, reason: 'synthetic receipt', onDate: '2026-10-19', payload: {receiptId: `receipt${suffix}`, cashMovementId: `cash${suffix}`, currency: 'SAR', minor, allocations: [{id: `allocation${suffix}`, obligationId: `obligation${obligationSuffix}`, sourceMinor: minor}]}});
  async function approved(f: Fixture, suffix = '', minor = '1000') { await service().command(f.who, f.accountId, draft(suffix, minor)); await service().command(f.who, f.accountId, approve(suffix)); }
  async function counts(f: Fixture) {
    const row = (await owner.query<{version: string; audit: string; sources: string}>('SELECT version, (SELECT count(*) FROM finance.commands c WHERE c.clinic_id=a.clinic_id AND c.account_id=a.account_id) audit, (SELECT count(*) FROM finance.sources s WHERE s.clinic_id=a.clinic_id AND s.account_id=a.account_id) sources FROM finance.accounts a WHERE clinic_id=$1 AND account_id=$2', [f.who.clinicId, f.accountId])).rows[0];
    assert.ok(row); return row;
  }
  function barrier() {
    const pids = new Set<number>(); let release: (() => void) | undefined;
    const gate = new Promise<void>(resolve => { release = resolve; });
    return { pids, hook: async (client: PoolClient) => { const row = (await client.query<{pid: number}>('SELECT pg_backend_pid() pid')).rows[0]; assert.ok(row); pids.add(row.pid); if (pids.size === 2) release?.(); await gate; } };
  }
  async function concurrent(f: Fixture, a: Command, b: Command) {
    const gate = barrier(), svc = service({beforeAccountLock: gate.hook});
    const outcomes = await Promise.allSettled([svc.command(f.who, f.accountId, a), svc.command(f.who, f.accountId, b)]);
    assert.equal(gate.pids.size, 2, 'Independent sessions overlap inside BEGIN before competing for account lock');
    return outcomes;
  }
  try {
    await t.test('fresh migration, explicit failed rerun and column consistency constraints', async () => {
      const client = await owner.connect();
      try { await assert.rejects(client.query(await readFile(new URL('../../src/persistence/sql/001_finance.sql', import.meta.url), 'utf8')), {code: '42P06'}); await client.query('ROLLBACK'); } finally { client.release(); }
      assert.equal((await owner.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='finance'")).rows[0].n, 5);
      const f = await fixture();
      await assert.rejects(owner.query("UPDATE finance.accounts SET snapshot=jsonb_set(snapshot,'{patientId}','null') WHERE clinic_id=$1", [f.who.clinicId]), {code:'23514'});
    });
    await t.test('draft approve receipt exact large string flow and limited authorized balance', async () => {
      const f = await fixture(); await approved(f, '', '900719925474099300');
      const result = await service().command(f.who, f.accountId, receipt('', '900719925474099299'));
      assert.equal(result.committedVersion, 3);
      const balance = await service().balance(f.who, f.accountId, '2026-10-19');
      assert.equal(balance.obligations[0]?.remainingMinor, '1');
      assert.equal(balance.obligations[0]?.principalMinor, '900719925474099300');
      assert.equal(balance.dueAsOfMeaning, 'INSTALLMENT_MATURITY_NOT_HISTORICAL_CUTOFF');
      for (const secret of ['reason','history','grants','patientId','personId']) assert.ok(!Object.hasOwn(balance, secret));
      const audit = (await owner.query('SELECT actor_id,person_id,reason,business_date::text,policy_version,recorded_at FROM finance.commands WHERE clinic_id=$1 AND idempotency_key=$2', [f.who.clinicId,'receipt'])).rows[0];
      assert.equal(audit.actor_id, 'profile'); assert.equal(audit.person_id, 'person'); assert.equal(audit.reason, 'synthetic receipt'); assert.equal(audit.business_date, '2026-10-19'); assert.equal(audit.policy_version, 'synthetic-v1'); assert.ok(audit.recorded_at instanceof Date);
    });
    await t.test('distinct keys same version serialize: one commit and one stale, no overpayment', async () => {
      const f = await fixture(); await approved(f);
      const results = await concurrent(f, receipt('-a', '700'), receipt('-b', '700'));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      const rejected = results.find(r => r.status === 'rejected'); assert.ok(rejected?.status === 'rejected'); assert.equal(rejected.reason.code, 'STALE_VERSION');
      assert.deepEqual(await counts(f), {version:'3', audit:'3', sources:'5'});
      await assert.rejects(service().command(f.who, f.accountId, receipt('-retry', '700', 3)), {code:'OVERPAYMENT'});
      assert.equal((await service().balance(f.who, f.accountId, '2026-10-19')).obligations[0]?.remainingMinor, '300');
    });
    await t.test('identical concurrent keys apply once; conflicting payload never writes', async () => {
      const f = await fixture(); await approved(f);
      const results = await concurrent(f, receipt(), receipt());
      assert.equal(results.filter(r => r.status === 'fulfilled' && r.value.replayed).length, 1);
      assert.equal(results.filter(r => r.status === 'fulfilled' && !r.value.replayed).length, 1);
      assert.deepEqual(await counts(f), {version:'3', audit:'3', sources:'5'});
      await assert.rejects(service().command(f.who, f.accountId, { ...receipt(), reason:'changed' }), {code:'IDEMPOTENCY_CONFLICT'});
    });
    await t.test('tenant/entity source uniqueness across independent accounts; cross-tenant remains independent', async () => {
      const a = await fixture(), b = await fixture(a.who.clinicId), c = await fixture();
      await approved(a, '-a'); await approved(b, '-b'); await approved(c, '-a');
      const gate = barrier(), svc = service({beforeAccountLock: gate.hook});
      const results = await Promise.allSettled([svc.command(a.who, a.accountId, receipt('', '400', 2, '-a')), svc.command(b.who, b.accountId, receipt('', '400', 2, '-b'))]);
      assert.equal(gate.pids.size, 2); assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      const rejected = results.find(r => r.status === 'rejected'); assert.ok(rejected?.status === 'rejected'); assert.equal(rejected.reason.code, 'SOURCE_CONFLICT');
      assert.equal(Number((await counts(a)).audit) + Number((await counts(b)).audit), 5);
      await service().command(c.who, c.accountId, receipt('', '400', 2, '-a'));
      await assert.rejects(owner.query("INSERT INTO finance.sources VALUES ($1,'entity','cash','foreign',$2,'receipt')", [c.who.clinicId, a.accountId]), {code:'23503'});
    });
    await t.test('replay survives later writes and pool restart; discarded response is recovered', async () => {
      const f = await fixture(); await approved(f); const original = await service().command(f.who, f.accountId, receipt());
      await service().command(f.who, f.accountId, receipt('-later', '100', 3));
      await runtime.end(); runtime = new PgPool(runtimeConfig);
      const replay = await service().command(f.who, f.accountId, receipt());
      assert.deepEqual(replay.result, original.result); assert.equal(replay.committedVersion, 3); assert.equal(replay.currentVersion, 4); assert.equal(replay.replayed, true);
      assert.deepEqual(await counts(f), {version:'4', audit:'4', sources:'8'});
    });
    await t.test('lost COMMIT response returns unknown then durable retry recovers exactly once', async () => {
      const f = await fixture(); await approved(f);
      await assert.rejects(service({afterCommit: async () => { throw new Error('simulated response loss after server commit'); }}).command(f.who, f.accountId, receipt()), {code:'COMMIT_OUTCOME_UNKNOWN'});
      const replay = await service().command(f.who, f.accountId, receipt());
      assert.equal(replay.replayed, true); assert.equal(replay.committedVersion, 3);
      assert.deepEqual(await counts(f), {version:'3', audit:'3', sources:'5'});
    });
    await t.test('same key competing payloads conflict; cash source reuse under fresh receipt rolls back', async () => {
      const f = await fixture();
      const results = await concurrent(f, draft(), {...draft(), reason:'different request'});
      assert.equal(results.filter(r => r.status === 'fulfilled').length,1);
      const rejected = results.find(r => r.status === 'rejected'); assert.ok(rejected?.status === 'rejected'); assert.equal(rejected.reason.code,'IDEMPOTENCY_CONFLICT');
      await service().command(f.who, f.accountId, approve());
      await service().command(f.who, f.accountId, receipt());
      const fresh = receipt('-fresh','100',3);
      if (fresh.type !== 'RECORD_RECEIPT') throw new Error('Unexpected command');
      await assert.rejects(service().command(f.who, f.accountId, {...fresh, payload:{...fresh.payload, cashMovementId:'cash'}}), {code:'DOMAIN_REJECTED'});
      assert.deepEqual(await counts(f), {version:'3',audit:'3',sources:'5'});
    });
    await t.test('corrupt financial principal cannot alter reads or enable overpayment', async () => {
      const f = await fixture(); await approved(f); const before = await counts(f);
      await owner.query("UPDATE finance.accounts SET snapshot=jsonb_set(snapshot,'{obligations,0,minor}','\"999999\"') WHERE clinic_id=$1",[f.who.clinicId]);
      await assert.rejects(service().balance(f.who,f.accountId,'2026-10-19'),{code:'INTEGRITY_FAILURE'});
      await assert.rejects(service().command(f.who,f.accountId,receipt('', '2000')),{code:'INTEGRITY_FAILURE'});
      assert.deepEqual(await counts(f),before);
    });
    await t.test('normalized and embedded replay inconsistency is never silently repaired', async () => {
      const f = await fixture(); await service().command(f.who, f.accountId, draft());
      await owner.query("UPDATE finance.accounts SET snapshot=jsonb_set(snapshot,'{idempotency}','[]') WHERE clinic_id=$1",[f.who.clinicId]);
      await assert.rejects(service().command(f.who, f.accountId, draft()),{code:'INTEGRITY_FAILURE'});
      assert.deepEqual(await counts(f), {version:'1',audit:'1',sources:'1'});
    });
    await t.test('failures after audit/sources and after snapshot roll everything back', async () => {
      for (const stage of ['afterAudit','beforeCommit'] as const) {
        const f = await fixture(); await approved(f); const before = await counts(f);
        await assert.rejects(service({[stage]: async () => { throw new Error('forced fault'); }}).command(f.who, f.accountId, receipt()), {code:'INTEGRITY_FAILURE'});
        assert.deepEqual(await counts(f), before);
        assert.equal((await service().balance(f.who, f.accountId, '2026-10-19')).obligations[0]?.remainingMinor, '1000');
        await service().command(f.who, f.accountId, receipt());
      }
    });
    await t.test('auth scope, denial, expiry, revoked replay and profile/person binding fail closed', async () => {
      const f = await fixture(); await approved(f); await service().command(f.who, f.accountId, receipt());
      for (const who of [null, {...f.who, clinicId:'other'}, {...f.who, personId:'other'}, {...f.who, profileId:'other'}, {...f.who, userId:'other'}]) await assert.rejects(service().command(who, f.accountId, receipt()), {code:who ? 'NOT_FOUND':'UNAUTHENTICATED'});
      const original = (await owner.query('SELECT grants FROM finance.memberships WHERE clinic_id=$1', [f.who.clinicId])).rows[0].grants as ReturnType<typeof defineGrant>[];
      for (const grants of [original.map(g => ({...g, scope:{...g.scope, branchIds:['wrong']}})), original.map(g => ({...g, scope:{...g.scope, resourceIds:['wrong-patient-account']}})), original.map(g => ({...g, expiresAt:'2026-10-01T00:00:00Z'})), original.map(g => ({...g, revokedAt:'2026-10-18T00:00:00Z'})), [...original, {...original[0], grantId:'deny', action:'RECORD_RECEIPT', effect:'deny'}]]) {
        await owner.query('UPDATE finance.memberships SET grants=$1 WHERE clinic_id=$2', [JSON.stringify(grants), f.who.clinicId]);
        await assert.rejects(service().command(f.who, f.accountId, receipt()), {code:'NOT_FOUND'});
      }
      assert.deepEqual(await counts(f), {version:'3', audit:'3', sources:'5'});
    });
    await t.test('persisted settings, currency and business date policy are mandatory', async () => {
      const f = await fixture();
      await assert.rejects(service().command(f.who, f.accountId, {...draft(), onDate:'2026-10-18'}), {code:'BUSINESS_DATE_NOT_ALLOWED'});
      const d = draft(); assert.equal(d.type, 'DRAFT_AGREEMENT'); if (d.type !== 'DRAFT_AGREEMENT') throw new Error('unreachable');
      await assert.rejects(service().command(f.who, f.accountId, {...d, payload:{...d.payload,currency:'USD'}}), {code:'CURRENCY_MISMATCH'});
      for (const update of ["functional_currency=NULL", "functional_currency='SAR', timezone=NULL", "timezone='UTC', synthetic_approved=false"]) {
        await owner.query(`UPDATE finance.policies SET ${update} WHERE clinic_id=$1`, [f.who.clinicId]);
        await assert.rejects(service().command(f.who, f.accountId, draft()), {code:'POLICY_UNAVAILABLE'});
      }
      assert.deepEqual(await counts(f), {version:'0', audit:'0', sources:'0'});
    });
    await t.test('runtime has no audit/source mutation, identity writes, context writes or DDL', async () => {
      const f = await fixture(); await approved(f);
      const role = (await runtime.query('SELECT current_user, rolsuper, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname=current_user')).rows[0];
      assert.equal(role.current_user,'finance_runtime'); assert.equal(role.rolsuper,false); assert.equal(role.rolcreaterole,false); assert.equal(role.rolcreatedb,false);
      for (const sql of ['UPDATE finance.commands SET reason=reason', 'DELETE FROM finance.commands', 'UPDATE finance.sources SET source_id=source_id', 'DELETE FROM finance.sources', 'UPDATE finance.accounts SET patient_id=patient_id', 'DELETE FROM finance.accounts', 'UPDATE finance.memberships SET grants=grants', 'UPDATE finance.policies SET synthetic_approved=true', 'CREATE TABLE finance.forbidden(id int)', 'CREATE TABLE public.forbidden(id int)', 'SET ROLE postgres']) await assert.rejects(runtime.query(sql), {code:'42501'});
    });
    await t.test('API locale and reader projection do not change financial effect or expose history', async () => {
      const f = await fixture(); const handler = createFinanceHandler(service(), async () => f.who);
      const req = {method:'POST',path:`/v1/finance/accounts/${f.accountId}/commands`,body:JSON.stringify(draft())};
      const en = await handler({...req,language:'en'}, {}), ar = await handler({...req,language:'ar'}, {});
      assert.equal(en.status,200); assert.equal(ar.status,200); assert.ok(JSON.stringify(ar.body).includes('"replayed":true'));
      const read = await handler({method:'GET',path:`/v1/finance/accounts/${f.accountId}/balance?dueAsOf=2026-10-19`}, {});
      assert.equal(read.status,200); assert.ok(!JSON.stringify(read.body).includes('synthetic draft')); assert.ok(!JSON.stringify(read.body).includes('history'));
    });
  } finally { await runtime.end(); await owner.end(); }
});
