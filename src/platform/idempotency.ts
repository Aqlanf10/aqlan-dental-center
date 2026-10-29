import type { DbExecutor } from './db.ts';
import { canonicalJson, sha256Hex } from './crypto.ts';
import { failApp } from './errors.ts';

export interface IdempotentEnvelope<T> {
  readonly status: number;
  readonly body: T;
  readonly replayed: boolean;
}

export interface IdempotentOptions {
  readonly clinicId: string;
  readonly actorUserId: string;
  readonly scope: string;
  readonly key: string;
  readonly payload: unknown;
}

export function assertIdempotencyKey(raw: unknown): string {
  if (typeof raw !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{3,127}$/.test(raw)) {
    failApp('INVALID_INPUT', 400, 'Idempotency-Key header (4..128 safe chars) is required');
  }
  return raw;
}

interface StoredIdempotencyRow extends Record<string, unknown> {
  actor_user_id: string;
  payload_sha256: string;
  response_status: number;
  response_body: unknown;
}

/**
 * Durable transactional idempotency coordinator.
 * Serializes concurrent duplicate requests via `pg_advisory_xact_lock`, verifies
 * actor + canonical payload fingerprint, and commits the outcome atomically with
 * the domain state changes.
 */
export async function runIdempotentCommand<T>(
  tx: DbExecutor,
  opts: IdempotentOptions,
  executeFn: () => Promise<{ status: number; body: T }>,
): Promise<IdempotentEnvelope<T>> {
  const checkedKey = assertIdempotencyKey(opts.key);
  const payloadSha256 = sha256Hex(canonicalJson(opts.payload));
  const lockBucket = `${opts.scope}:${checkedKey}`;

  await tx.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [opts.clinicId, lockBucket]);

  const existing = await tx.query<StoredIdempotencyRow>(
    `SELECT actor_user_id, payload_sha256, response_status, response_body
       FROM app_idempotency_keys
      WHERE clinic_id = $1 AND scope = $2 AND idempotency_key = $3`,
    [opts.clinicId, opts.scope, checkedKey],
  );

  const prior = existing.rows[0];
  if (prior !== undefined) {
    if (prior.actor_user_id !== opts.actorUserId || prior.payload_sha256 !== payloadSha256) {
      failApp('IDEMPOTENCY_CONFLICT', 409, 'Idempotency key reused with different actor or payload');
    }
    return {
      status: prior.response_status,
      body: prior.response_body as T,
      replayed: true,
    };
  }

  const fresh = await executeFn();
  const serializedBody = canonicalJson(fresh.body);

  await tx.query(
    `INSERT INTO app_idempotency_keys
       (clinic_id, scope, idempotency_key, actor_user_id, payload_sha256, response_status, response_body)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      opts.clinicId,
      opts.scope,
      checkedKey,
      opts.actorUserId,
      payloadSha256,
      fresh.status,
      serializedBody,
    ],
  );

  return {
    status: fresh.status,
    body: JSON.parse(serializedBody) as T,
    replayed: false,
  };
}
