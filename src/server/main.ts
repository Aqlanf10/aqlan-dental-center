import { join } from 'node:path';
import pg from 'pg';
import { parseIsolatedDatabaseConfig, withTransaction } from '../platform/db.ts';
import { runMigrations } from '../platform/migrations.ts';
import { ensureClinicBootstrap } from '../modules/governance/index.ts';
import { createClinicHttpServer } from './app.ts';

const poolConfig = parseIsolatedDatabaseConfig(
  process.env.AQLAN_DATABASE_URL,
  process.env.AQLAN_ISOLATED_DB,
);
const pool = new pg.Pool(poolConfig);

const clinicId = process.env.AQLAN_CLINIC_ID?.trim() || 'clinic-aqlan-main';
const ownerUsername = process.env.AQLAN_BOOTSTRAP_OWNER_USER?.trim() || 'owner';
const ownerDisplayName =
  process.env.AQLAN_BOOTSTRAP_OWNER_NAME?.trim() || 'د. عقلان الكامل';
const ownerPassword = process.env.AQLAN_BOOTSTRAP_OWNER_PASSWORD;
if (!ownerPassword || ownerPassword.length < 8) {
  await pool.end();
  throw new Error('AQLAN_BOOTSTRAP_OWNER_PASSWORD (min 8 chars) is required for isolated startup');
}

const attachmentsRootDir =
  process.env.AQLAN_ATTACHMENTS_DIR?.trim() || join(process.cwd(), '.isolated-attachments');
const port = Number(process.env.AQLAN_PORT ?? '3210');

await runMigrations(pool);
await withTransaction(pool, {}, tx =>
  ensureClinicBootstrap(tx, {
    clinicId,
    ownerUsername,
    ownerDisplayName,
    ownerPassword,
  }),
);

const server = createClinicHttpServer({
  pool,
  clinicId,
  attachmentsRootDir,
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Aqlan Dental Center (isolated) listening on http://127.0.0.1:${port}`);
});

const shutdown = async () => {
  server.close();
  await pool.end();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
