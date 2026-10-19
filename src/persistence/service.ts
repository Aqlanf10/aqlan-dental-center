import type { Pool, PoolClient, QueryResultRow } from 'pg';
import { execute, obligationBalance } from '../finance/account.ts';
import { evaluatePermission, defineGrant } from '../identity/index.ts';
import { canonical, businessDate, identifier, validateCommand, FinanceError, fail } from './validation.ts';
import { commandFingerprint, sourceIds, verifyStoredAccount, MAX_COMMANDS } from './integrity.ts';
import type { AuditRecord, SourceRecord } from './integrity.ts';

export type TrustedIdentity = { clinicId: string; userId: string; profileId: string; personId: string };
type Grant = ReturnType<typeof defineGrant>;
type AccountRow = QueryResultRow & { clinic_id: string; account_id: string; entity_id: string; patient_id: string; branch_id: string; version: string; snapshot: unknown };
type PolicyRow = QueryResultRow & { policy_version: string; functional_currency: string | null; timezone: string | null; synthetic_approved: boolean };
type MembershipRow = QueryResultRow & { person_id: string; profile_id: string; grants: Grant[] };
type Result = Record<string, string>;
type AuditRow = QueryResultRow & { fingerprint: string; result: Result; committed_version: string };
export type CommandResponse = { result: Result; committedVersion: number; currentVersion: number; replayed: boolean };
export type Hooks = { beforeAccountLock?: (client: PoolClient) => Promise<void>; afterAccountLock?: (client: PoolClient) => Promise<void>; afterAudit?: (client: PoolClient) => Promise<void>; beforeCommit?: (client: PoolClient) => Promise<void>; afterCommit?: () => Promise<void> };
type Options = { pool: Pool; now?: () => Date; hooks?: Hooks };

function databaseCode(error: unknown): string | undefined {
  return error !== null && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : undefined;
}
function classify(error: unknown): FinanceError {
  if (error instanceof FinanceError) return error;
  const code = databaseCode(error);
  if (code === '23505') return new FinanceError('SOURCE_CONFLICT', 409);
  if (code === '40P01' || code === '40001' || code === '55P03' || code === '57014' || code?.startsWith('08') || code === '57P01' || code === 'ECONNREFUSED' || code === 'ECONNRESET') return new FinanceError('TEMPORARILY_UNAVAILABLE', 503);
  return new FinanceError('INTEGRITY_FAILURE', 500);
}
function identity(value: TrustedIdentity | null): TrustedIdentity {
  if (!value) fail('UNAUTHENTICATED', 401);
  for (const key of ['clinicId', 'userId', 'profileId', 'personId'] as const) {
    try { identifier(value[key]); } catch { fail('UNAUTHENTICATED', 401); }
  }
  return { clinicId: value.clinicId, userId: value.userId, profileId: value.profileId, personId: value.personId };
}
function today(at: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
    const part = (kind: string) => parts.find(p => p.type === kind)?.value;
    return businessDate(`${part('year')}-${part('month')}-${part('day')}`);
  } catch { return fail('POLICY_UNAVAILABLE', 422); }
}
/** Synthetic fixture-only adapter. Auth MUST be resolved outside this service.
 * Runtime cannot mutate policy/membership. Admin fixture changes must be quiescent;
 * concurrent revocation is deliberately not a production security guarantee.
 */
export function createFinanceService({ pool, now = () => new Date(), hooks = {} }: Options) {
  async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      let client: PoolClient;
      try { client = await pool.connect(); } catch { throw new FinanceError('TEMPORARILY_UNAVAILABLE', 503); }
      let committing = false, discard = false;
      try {
        await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
        await client.query("SET LOCAL statement_timeout = '5s'");
        await client.query("SET LOCAL lock_timeout = '3s'");
        const result = await work(client);
        await hooks.beforeCommit?.(client);
        committing = true;
        await client.query('COMMIT');
        await hooks.afterCommit?.();
        return result;
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { discard = true; }
        // Never automatically retry an uncertain COMMIT. Caller reuses identical key.
        if (committing) { discard = true; throw new FinanceError('COMMIT_OUTCOME_UNKNOWN', 503); }
        if (attempt < 2 && ['40P01', '40001'].includes(databaseCode(error) ?? '')) continue;
        throw classify(error);
      } finally { client.release(discard); }
    }
  }
  async function load(client: PoolClient, who: TrustedIdentity, accountId: string, action: string, lock: boolean) {
    await hooks.beforeAccountLock?.(client);
    const rows = await client.query<AccountRow>(`SELECT * FROM finance.accounts WHERE clinic_id=$1 AND account_id=$2 ${lock ? 'FOR UPDATE' : 'FOR SHARE'}`, [who.clinicId, accountId]);
    const account = rows.rows[0];
    if (!account) fail('NOT_FOUND', 404);
    await hooks.afterAccountLock?.(client);
    const membership = (await client.query<MembershipRow>('SELECT person_id, profile_id, grants FROM finance.memberships WHERE clinic_id=$1 AND account_id=$2 AND user_id=$3', [who.clinicId, accountId, who.userId])).rows[0];
    const at = now();
    if (!membership || membership.person_id !== who.personId || membership.profile_id !== who.profileId || !evaluatePermission(membership.grants, { subjectId: who.profileId, action, resource: 'finance', scope: { clinicId: who.clinicId, branchIds: [account.branch_id], resourceIds: [accountId] }, at: at.toISOString() }).allowed) fail('NOT_FOUND', 404);
    const policy = (await client.query<PolicyRow>('SELECT policy_version, functional_currency, timezone, synthetic_approved FROM finance.policies WHERE clinic_id=$1 AND entity_id=$2', [who.clinicId, account.entity_id])).rows[0];
    if (!policy || !policy.synthetic_approved || !policy.policy_version || !['YER', 'SAR', 'USD'].includes(policy.functional_currency ?? '') || !policy.timezone) fail('POLICY_UNAVAILABLE', 422);
    try { identifier(policy.policy_version); } catch { fail('POLICY_UNAVAILABLE', 422); }
    const currentDate = today(at, policy.timezone);
    const audits = (await client.query<AuditRecord>('SELECT idempotency_key, fingerprint, actor_id, user_id, person_id, command_type, reason, business_date::text, policy_version, result, committed_version FROM finance.commands WHERE clinic_id=$1 AND account_id=$2 ORDER BY committed_version', [who.clinicId, accountId])).rows;
    const sources = (await client.query<SourceRecord>('SELECT source_kind, source_id, idempotency_key, entity_id FROM finance.sources WHERE clinic_id=$1 AND account_id=$2', [who.clinicId, accountId])).rows;
    const snapshot = verifyStoredAccount(account, account.snapshot, audits, sources);
    return { account: {...account, snapshot}, policy, currentDate };
  }
  return {
    async command(auth: TrustedIdentity | null, accountIdInput: unknown, input: unknown): Promise<CommandResponse> {
      const who = identity(auth), accountId = identifier(accountIdInput), command = validateCommand(input);
      return transaction(async client => {
        const { account, policy, currentDate } = await load(client, who, accountId, command.type, true);
        const state = account.snapshot;
        const domainCommand = { ...command, actorId: who.profileId };
        const fingerprint = commandFingerprint(who, account, command);
        const prior = (await client.query<AuditRow>('SELECT fingerprint, result, committed_version FROM finance.commands WHERE clinic_id=$1 AND account_id=$2 AND idempotency_key=$3', [who.clinicId, accountId, command.key])).rows[0];
        const embedded = state.idempotency.find(row => row.key === command.key);
        if (prior) {
          if (prior.fingerprint !== fingerprint) fail('IDEMPOTENCY_CONFLICT', 409);
          const history = state.history.find(row => row.version === Number(prior.committed_version));
          if (!embedded || embedded.fingerprint !== canonical(domainCommand) || canonical(embedded.result) !== canonical(prior.result) || !history || history.key !== command.key || canonical(history.result) !== canonical(prior.result)) fail('INTEGRITY_FAILURE', 500);
          return { result: prior.result, committedVersion: Number(prior.committed_version), currentVersion: state.version, replayed: true };
        }
        if (embedded) fail('INTEGRITY_FAILURE', 500);
        if (command.expectedVersion !== state.version) fail('STALE_VERSION', 409);
        if (state.version >= MAX_COMMANDS) fail('AGGREGATE_LIMIT_OR_INTEGRITY', 422);
        // Only today's business date in persisted policy timezone; no backdate discretion.
        if (command.onDate !== currentDate) fail('BUSINESS_DATE_NOT_ALLOWED', 422);
        if ('currency' in command.payload && command.payload.currency !== policy.functional_currency) fail('CURRENCY_MISMATCH', 422);
        if (command.type === 'APPROVE_AGREEMENT') {
          const agreement = state.agreements.find(a => a.id === command.payload.agreementId);
          if (agreement && agreement.currency !== policy.functional_currency) fail('CURRENCY_MISMATCH', 422);
        }
        if (command.type === 'RECORD_RECEIPT') for (const allocation of command.payload.allocations) {
          const obligation = state.obligations.find(o => o.id === allocation.obligationId);
          if (obligation && obligation.currency !== command.payload.currency) fail('CURRENCY_MISMATCH', 422);
        }
        let transition: ReturnType<typeof execute>;
        try { transition = execute(state, domainCommand); } catch (error) {
          if (error instanceof Error && error.message === 'Overpayment forbidden') fail('OVERPAYMENT', 422);
          fail('DOMAIN_REJECTED', 422);
        }
        if (transition.replayed || transition.state.version !== state.version + 1 || Buffer.byteLength(JSON.stringify(transition.state)) > 1048576) fail('AGGREGATE_LIMIT_OR_INTEGRITY', 422);
        const result = transition.result;
        await client.query('INSERT INTO finance.commands (clinic_id, account_id, idempotency_key, fingerprint, actor_id, user_id, person_id, command_type, reason, business_date, policy_version, result, committed_version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)', [who.clinicId, accountId, command.key, fingerprint, who.profileId, who.userId, who.personId, command.type, command.reason, command.onDate, policy.policy_version, JSON.stringify(result), transition.state.version]);
        for (const [kind, sourceId] of sourceIds(command).sort((a, b) => canonical(a).localeCompare(canonical(b), 'en'))) {
          await client.query('INSERT INTO finance.sources (clinic_id, entity_id, source_kind, source_id, account_id, idempotency_key) VALUES ($1,$2,$3,$4,$5,$6)', [who.clinicId, account.entity_id, kind, sourceId, accountId, command.key]);
        }
        await hooks.afterAudit?.(client);
        const updated = await client.query('UPDATE finance.accounts SET snapshot=$1, version=$2 WHERE clinic_id=$3 AND account_id=$4 AND version=$5', [JSON.stringify(transition.state), transition.state.version, who.clinicId, accountId, state.version]);
        if (updated.rowCount !== 1) fail('INTEGRITY_FAILURE', 500);
        return { result, committedVersion: transition.state.version, currentVersion: transition.state.version, replayed: false };
      });
    },
    async balance(auth: TrustedIdentity | null, accountIdInput: unknown, dueAsOfInput: unknown) {
      const who = identity(auth), accountId = identifier(accountIdInput), dueAsOf = businessDate(dueAsOfInput);
      return transaction(async client => {
        const { account } = await load(client, who, accountId, 'READ_BALANCE', false);
        return { accountId, currentVersion: account.snapshot.version, dueAsOf, dueAsOfMeaning: 'INSTALLMENT_MATURITY_NOT_HISTORICAL_CUTOFF', obligations: account.snapshot.obligations.map(o => ({ obligationId: o.id, ...obligationBalance(account.snapshot, o.id, dueAsOf) })) };
      });
    }
  };
}
export type FinanceService = ReturnType<typeof createFinanceService>;
