import type { Pool, PoolClient, PoolConfig } from 'pg';
import { AppError, failApp } from './errors.ts';

export interface DbQueryResult<R> {
  readonly rows: R[];
  readonly rowCount: number | null;
}

/**
 * Narrow query executor passed to repositories and module handlers.
 * Repositories NEVER receive a `Pool`, making nested connection acquisition
 * (and small-pool self-deadlocks) impossible by construction.
 */
export interface DbExecutor {
  query<R extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<DbQueryResult<R>>;
}

export interface TransactionHooks {
  readonly onBeforeCommit?: (tx: DbExecutor) => Promise<void>;
  readonly onAfterCommit?: () => Promise<void>;
}

export interface TransactionOptions {
  readonly isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  readonly readOnly?: boolean;
  readonly statementTimeoutMs?: number;
  readonly lockTimeoutMs?: number;
  readonly hooks?: TransactionHooks;
}

const FORBIDDEN_DB_NAME_PATTERN = /(mini|prod|production|staging|live)/i;
const ALLOWED_LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export function parseIsolatedDatabaseConfig(
  rawUrl: string | undefined,
  isolationAck: string | undefined,
  extra?: { max?: number; allowCustomHostInContainer?: boolean },
): PoolConfig {
  if (isolationAck !== '1') {
    failApp(
      'DATABASE_IDENTITY_MISMATCH',
      500,
      'AQLAN_ISOLATED_DB=1 is required to confirm isolated synthetic database usage',
    );
  }
  if (!rawUrl || typeof rawUrl !== 'string') {
    failApp('DATABASE_IDENTITY_MISMATCH', 500, 'DATABASE_URL is required');
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    failApp('DATABASE_IDENTITY_MISMATCH', 500, 'Malformed PostgreSQL URL');
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    failApp('DATABASE_IDENTITY_MISMATCH', 500, 'Expected postgres:// or postgresql:// protocol');
  }
  if (parsed.search || parsed.hash) {
    failApp('DATABASE_IDENTITY_MISMATCH', 500, 'Database URL query/hash overrides are forbidden');
  }
  if (!extra?.allowCustomHostInContainer && !ALLOWED_LOCAL_HOSTS.has(parsed.hostname)) {
    failApp('DATABASE_IDENTITY_MISMATCH', 500, 'Only isolated loopback PostgreSQL hosts are permitted');
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!database || !/^[a-z0-9_]{3,63}$/.test(database) || FORBIDDEN_DB_NAME_PATTERN.test(database)) {
    failApp(
      'DATABASE_IDENTITY_MISMATCH',
      500,
      `Refusing non-isolated or forbidden database name: ${database || '<empty>'}`,
    );
  }
  const port = parsed.port ? Number(parsed.port) : 5432;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    failApp('DATABASE_IDENTITY_MISMATCH', 500, 'Invalid PostgreSQL port');
  }
  return {
    host: parsed.hostname === '::1' || parsed.hostname === '[::1]' ? '::1' : parsed.hostname,
    port,
    user: decodeURIComponent(parsed.username || 'postgres'),
    password: decodeURIComponent(parsed.password || ''),
    database,
    ssl: false,
    max: extra?.max ?? 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  };
}

function wrapClient(client: PoolClient): DbExecutor {
  return {
    async query<R extends Record<string, unknown> = Record<string, unknown>>(
      sql: string,
      params?: readonly unknown[],
    ): Promise<DbQueryResult<R>> {
      const res = await client.query<R>(sql, params ? [...params] : undefined);
      return { rows: res.rows, rowCount: res.rowCount };
    },
  };
}

function mapPgError(err: unknown): never {
  if (err instanceof AppError) {
    throw err;
  }
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
  if (code === '40001' || code === '40P01' || code === '55P03' || code === '57014' || code === '53300') {
    throw new AppError('TEMPORARILY_UNAVAILABLE', 503, `Transient DB state (${code})`);
  }
  throw err;
}

/**
 * Single transaction coordinator.
 * - Acquires exactly ONE connection per unit of work.
 * - Applies local statement/lock timeouts and schema search_path.
 * - Discards the connection on broken rollback or uncertain commit so poisoned
 *   locks/session state can never leak back into the pool.
 */
export async function withTransaction<T>(
  pool: Pool,
  options: TransactionOptions,
  fn: (tx: DbExecutor) => Promise<T>,
): Promise<T> {
  let client: PoolClient;
  try {
    client = await pool.connect();
  } catch (err) {
    throw new AppError('TEMPORARILY_UNAVAILABLE', 503, err instanceof Error ? err.message : 'Pool connect failed');
  }

  let discardError: Error | boolean = false;
  const isolation = options.isolationLevel ?? 'READ COMMITTED';
  const accessMode = options.readOnly ? 'READ ONLY' : 'READ WRITE';
  const stmtMs = Math.max(500, Math.min(options.statementTimeoutMs ?? 8000, 60000));
  const lockMs = Math.max(250, Math.min(options.lockTimeoutMs ?? 4000, 30000));

  try {
    await client.query(`BEGIN ISOLATION LEVEL ${isolation} ${accessMode}`);
    await client.query(`SET LOCAL statement_timeout = '${stmtMs}ms'`);
    await client.query(`SET LOCAL lock_timeout = '${lockMs}ms'`);
    await client.query(`SET LOCAL idle_in_transaction_session_timeout = '15000ms'`);
    await client.query(`SET LOCAL search_path TO aqlan_app, pg_catalog`);

    const tx = wrapClient(client);
    let result: T;
    try {
      result = await fn(tx);
      if (options.hooks?.onBeforeCommit) {
        await options.hooks.onBeforeCommit(tx);
      }
    } catch (workErr) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        discardError = rbErr instanceof Error ? rbErr : new Error('Rollback failed');
      }
      mapPgError(workErr);
    }

    try {
      await client.query('COMMIT');
      if (options.hooks?.onAfterCommit) {
        await options.hooks.onAfterCommit();
      }
    } catch (commitErr) {
      discardError = commitErr instanceof Error ? commitErr : new Error('Commit outcome uncertain');
      throw new AppError('COMMIT_OUTCOME_UNKNOWN', 503, discardError.message);
    }

    return result;
  } finally {
    client.release(discardError);
  }
}

export async function withReadOnly<T>(pool: Pool, fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
  return withTransaction(pool, { isolationLevel: 'REPEATABLE READ', readOnly: true }, fn);
}
