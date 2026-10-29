import { readFile } from 'node:fs/promises';
import type { Pool } from 'pg';
import { sha256Hex } from './crypto.ts';
import { AppError, failApp } from './errors.ts';

export const ISOLATED_SYSTEM_CODE = 'AQLAN_DENTAL_CENTER_V2_ISOLATED';
const MIGRATION_ADVISORY_LOCK_KEY = 84192001;

const MIGRATION_MANIFEST: readonly { readonly id: string; readonly relPath: string }[] = Object.freeze([
  { id: '0001_slice1_core', relPath: './sql/0001_slice1_core.sql' },
]);

export interface MigrationRunSummary {
  readonly applied: readonly string[];
  readonly skipped: readonly string[];
  readonly systemCode: string;
}

/**
 * Single authoritative schema migration runner.
 * - Serializes concurrent startups via `pg_advisory_lock`.
 * - Verifies target database identity (`app_system_identity`) before applying DDL.
 * - Enforces immutable SHA-256 checksums (CRLF-normalized) across OS platforms.
 * - Runtime request handlers NEVER invoke DDL.
 */
export async function runMigrations(pool: Pool): Promise<MigrationRunSummary> {
  const client = await pool.connect();
  let discard: Error | boolean = false;
  let locked = false;

  try {
    const dbCheck = await client.query<{ current_database: string }>('SELECT current_database()');
    const dbName = dbCheck.rows[0]?.current_database ?? '';
    if (!dbName || /(mini|prod|production|staging|live)/i.test(dbName)) {
      failApp('DATABASE_IDENTITY_MISMATCH', 500, `Forbidden database target: ${dbName}`);
    }

    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_ADVISORY_LOCK_KEY]);
    locked = true;

    await client.query('CREATE SCHEMA IF NOT EXISTS aqlan_app');
    await client.query(`
      CREATE TABLE IF NOT EXISTS aqlan_app.app_system_identity (
        singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton = TRUE),
        system_code TEXT NOT NULL,
        initialized_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const identityRows = await client.query<{ system_code: string }>(
      'SELECT system_code FROM aqlan_app.app_system_identity WHERE singleton = TRUE',
    );
    const existingCode = identityRows.rows[0]?.system_code;
    if (existingCode === undefined) {
      await client.query(
        'INSERT INTO aqlan_app.app_system_identity (singleton, system_code) VALUES (TRUE, $1)',
        [ISOLATED_SYSTEM_CODE],
      );
    } else if (existingCode !== ISOLATED_SYSTEM_CODE) {
      failApp('DATABASE_IDENTITY_MISMATCH', 500, `Unexpected system_code: ${existingCode}`);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS aqlan_app.app_schema_migrations (
        migration_id TEXT PRIMARY KEY,
        checksum_sha256 TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const appliedRows = await client.query<{ migration_id: string; checksum_sha256: string }>(
      'SELECT migration_id, checksum_sha256 FROM aqlan_app.app_schema_migrations ORDER BY migration_id ASC',
    );
    const appliedMap = new Map<string, string>();
    for (const r of appliedRows.rows) {
      appliedMap.set(r.migration_id, r.checksum_sha256);
    }

    const applied: string[] = [];
    const skipped: string[] = [];

    for (const entry of MIGRATION_MANIFEST) {
      const rawSql = await readFile(new URL(entry.relPath, import.meta.url), 'utf8');
      const normalizedSql = rawSql.replace(/\r\n/g, '\n');
      const checksum = sha256Hex(normalizedSql);

      const priorChecksum = appliedMap.get(entry.id);
      if (priorChecksum !== undefined) {
        if (priorChecksum !== checksum) {
          failApp(
            'MIGRATION_CHECKSUM_MISMATCH',
            500,
            `Migration ${entry.id} checksum mismatch: expected ${priorChecksum}, found ${checksum}`,
          );
        }
        skipped.push(entry.id);
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(normalizedSql);
        await client.query(
          'INSERT INTO aqlan_app.app_schema_migrations (migration_id, checksum_sha256) VALUES ($1, $2)',
          [entry.id, checksum],
        );
        await client.query('COMMIT');
        applied.push(entry.id);
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch (rbErr) {
          discard = rbErr instanceof Error ? rbErr : true;
        }
        throw err instanceof AppError
          ? err
          : new AppError('INTERNAL_ERROR', 500, err instanceof Error ? err.message : 'Migration failed');
      }
    }

    return { applied, skipped, systemCode: ISOLATED_SYSTEM_CODE };
  } finally {
    if (locked && !discard) {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_ADVISORY_LOCK_KEY]);
      } catch (unlockErr) {
        discard = unlockErr instanceof Error ? unlockErr : true;
      }
    }
    client.release(discard);
  }
}
