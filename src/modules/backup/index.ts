import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Pool } from 'pg';
import { withReadOnly, withTransaction } from '../../platform/db.ts';
import { sha256Hex } from '../../platform/crypto.ts';
import { failApp } from '../../platform/errors.ts';
import { ISOLATED_SYSTEM_CODE, runMigrations } from '../../platform/migrations.ts';
import { assertModulePermission, type AuthenticatedActor } from '../governance/index.ts';

const BACKUP_TABLES_IN_FK_ORDER = Object.freeze([
  'app_clinics',
  'app_persons',
  'app_staff_users',
  'app_clinic_settings',
  'app_audit_events',
  'app_patients',
  'app_patient_file_history',
  'app_doctor_patient_grants',
  'app_patient_medical_history',
  'app_patient_portal_accounts',
  'app_attachments',
  'app_doctor_leaves',
  'app_appointments',
  'app_outbox_messages',
  'app_visits',
  'app_visit_procedures',
  'app_clinical_revisions',
  'app_invoices',
  'app_invoice_lines',
  'app_receipts',
  'app_installment_schedules',
  'app_installment_lines',
  'app_print_logs',
  'app_lab_orders',
  'app_inventory_items',
  'app_inventory_movements',
] as const);

const BACKUP_SEQUENCES = Object.freeze([
  'app_patient_file_seq',
  'app_invoice_no_seq',
  'app_receipt_no_seq',
  'app_lab_order_no_seq',
] as const);

export interface SequenceStateSnapshot {
  readonly name: (typeof BACKUP_SEQUENCES)[number];
  readonly lastValue: string;
  readonly isCalled: boolean;
}

export interface BackupAttachmentBlob {
  readonly attachmentId: string;
  readonly storageRelPath: string;
  readonly sha256Hex: string;
  readonly byteSize: number;
  readonly base64Data: string;
}

export interface ClinicBackupBundle {
  readonly formatVersion: 'aqlan-backup-v1';
  readonly systemCode: string;
  readonly createdAt: string;
  readonly createdByUserId: string;
  readonly clinicId: string;
  readonly sequences: readonly SequenceStateSnapshot[];
  /** Keyed by table name; values are raw PostgreSQL `jsonb_agg(to_jsonb(t))::text` strings */
  readonly tableJsonStrings: Readonly<Record<string, string>>;
  readonly rowCounts: Readonly<Record<string, number>>;
  readonly attachments: readonly BackupAttachmentBlob[];
  readonly manifestSha256: string;
}

function computeBundleDigest(payload: {
  formatVersion: string;
  systemCode: string;
  clinicId: string;
  sequences: readonly SequenceStateSnapshot[];
  tableJsonStrings: Readonly<Record<string, string>>;
  attachments: readonly BackupAttachmentBlob[];
}): string {
  const parts: string[] = [
    payload.formatVersion,
    payload.systemCode,
    payload.clinicId,
    JSON.stringify(payload.sequences),
  ];
  for (const tbl of BACKUP_TABLES_IN_FK_ORDER) {
    parts.push(`${tbl}:${payload.tableJsonStrings[tbl] ?? '[]'}`);
  }
  for (const att of payload.attachments) {
    parts.push(`att:${att.attachmentId}:${att.storageRelPath}:${att.sha256Hex}:${att.byteSize}`);
  }
  return sha256Hex(parts.join('\n'));
}

/**
 * Captures a single consistent `REPEATABLE READ` snapshot of all relational data,
 * exact sequence states (`last_value`, `is_called`), login governance accounts,
 * and verified attachment blobs.
 */
export async function createConsistentBackupBundle(
  pool: Pool,
  actor: AuthenticatedActor,
  attachmentsRootDir: string,
): Promise<ClinicBackupBundle> {
  assertModulePermission(actor, 'governance', 'export');

  const snapshot = await withReadOnly(pool, async tx => {
    const sequences: SequenceStateSnapshot[] = [];
    for (const seqName of BACKUP_SEQUENCES) {
      const seqRes = await tx.query<{ last_value: string; is_called: boolean }>(
        `SELECT last_value::text, is_called FROM aqlan_app.${seqName}`,
      );
      const row = seqRes.rows[0];
      if (!row) failApp('INTERNAL_ERROR', 500, `Sequence ${seqName} missing`);
      sequences.push({
        name: seqName,
        lastValue: row.last_value,
        isCalled: row.is_called,
      });
    }

    const tableJsonStrings: Record<string, string> = {};
    const rowCounts: Record<string, number> = {};
    for (const tbl of BACKUP_TABLES_IN_FK_ORDER) {
      const res = await tx.query<{ cnt: number; rows_json: string }>(
        `SELECT count(*)::int AS cnt,
                coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)::text AS rows_json
           FROM (SELECT * FROM aqlan_app.${tbl} WHERE clinic_id = $1) t`,
        [actor.clinicId],
      );
      tableJsonStrings[tbl] = res.rows[0]?.rows_json ?? '[]';
      rowCounts[tbl] = res.rows[0]?.cnt ?? 0;
    }

    const attMeta = await tx.query<{
      attachment_id: string;
      storage_rel_path: string;
      sha256_hex: string;
      byte_size: number;
    }>(
      `SELECT attachment_id, storage_rel_path, sha256_hex, byte_size
         FROM aqlan_app.app_attachments
        WHERE clinic_id = $1
        ORDER BY attachment_id ASC`,
      [actor.clinicId],
    );

    return { sequences, tableJsonStrings, rowCounts, attMeta: attMeta.rows };
  });

  const attachments: BackupAttachmentBlob[] = [];
  for (const m of snapshot.attMeta) {
    const bytes = await readFile(join(attachmentsRootDir, m.storage_rel_path));
    if (bytes.length !== m.byte_size || sha256Hex(bytes) !== m.sha256_hex) {
      failApp('INTERNAL_ERROR', 500, `Attachment ${m.attachment_id} failed integrity check during backup`);
    }
    attachments.push({
      attachmentId: m.attachment_id,
      storageRelPath: m.storage_rel_path,
      sha256Hex: m.sha256_hex,
      byteSize: m.byte_size,
      base64Data: bytes.toString('base64'),
    });
  }

  const manifestSha256 = computeBundleDigest({
    formatVersion: 'aqlan-backup-v1',
    systemCode: ISOLATED_SYSTEM_CODE,
    clinicId: actor.clinicId,
    sequences: snapshot.sequences,
    tableJsonStrings: snapshot.tableJsonStrings,
    attachments,
  });

  return Object.freeze({
    formatVersion: 'aqlan-backup-v1',
    systemCode: ISOLATED_SYSTEM_CODE,
    createdAt: new Date().toISOString(),
    createdByUserId: actor.userId,
    clinicId: actor.clinicId,
    sequences: Object.freeze(snapshot.sequences),
    tableJsonStrings: Object.freeze(snapshot.tableJsonStrings),
    rowCounts: Object.freeze(snapshot.rowCounts),
    attachments: Object.freeze(attachments),
    manifestSha256,
  });
}

/**
 * Restores a verified backup bundle into an isolated empty database.
 * - Never truncates or overwrites existing clinics/patients silently.
 * - Verifies manifest SHA-256 and primary-owner login governance before committing.
 * - Restores exact sequence floors so subsequent patients, invoices, receipts,
 *   and lab orders never collide.
 */
export async function restoreBackupToIsolatedDatabase(
  targetPool: Pool,
  bundle: ClinicBackupBundle,
  targetAttachmentsRootDir: string,
): Promise<{ restoredTables: number; restoredAttachments: number }> {
  if (bundle.formatVersion !== 'aqlan-backup-v1' || bundle.systemCode !== ISOLATED_SYSTEM_CODE) {
    failApp('INVALID_INPUT', 400, 'Incompatible backup format or systemCode');
  }

  const expectedDigest = computeBundleDigest({
    formatVersion: bundle.formatVersion,
    systemCode: bundle.systemCode,
    clinicId: bundle.clinicId,
    sequences: bundle.sequences,
    tableJsonStrings: bundle.tableJsonStrings,
    attachments: bundle.attachments,
  });
  if (expectedDigest !== bundle.manifestSha256) {
    failApp('INVALID_INPUT', 400, 'Backup manifest SHA-256 verification failed');
  }

  await runMigrations(targetPool);

  await withTransaction(targetPool, { isolationLevel: 'SERIALIZABLE' }, async tx => {
    const existingClinics = await tx.query<{ cnt: number }>(
      `SELECT count(*)::int AS cnt FROM aqlan_app.app_clinics`,
    );
    const existingPatients = await tx.query<{ cnt: number }>(
      `SELECT count(*)::int AS cnt FROM aqlan_app.app_patients`,
    );
    if ((existingClinics.rows[0]?.cnt ?? 0) > 0 || (existingPatients.rows[0]?.cnt ?? 0) > 0) {
      failApp(
        'INVALID_TRANSITION',
        409,
        'Refusing to restore into a non-empty database; isolated empty database required',
      );
    }

    for (const tbl of BACKUP_TABLES_IN_FK_ORDER) {
      const jsonStr = bundle.tableJsonStrings[tbl] ?? '[]';
      if (jsonStr !== '[]') {
        await tx.query(
          `INSERT INTO aqlan_app.${tbl}
           SELECT * FROM jsonb_populate_recordset(NULL::aqlan_app.${tbl}, $1::jsonb)`,
          [jsonStr],
        );
      }
    }

    // Verify primary owner account exists and is active so governance is never locked out post-restore
    const ownerCheck = await tx.query<{ cnt: number }>(
      `SELECT count(*)::int AS cnt
         FROM aqlan_app.app_staff_users
        WHERE clinic_id = $1 AND is_primary_owner = TRUE AND is_active = TRUE AND role = 'OWNER'`,
      [bundle.clinicId],
    );
    if ((ownerCheck.rows[0]?.cnt ?? 0) !== 1) {
      failApp('OWNER_LOCKOUT_PROTECTED', 409, 'Backup bundle lacks an active primary owner account');
    }

    // Restore exact sequence states + enforce collision-free floors against restored rows
    for (const seq of bundle.sequences) {
      if (!(BACKUP_SEQUENCES as readonly string[]).includes(seq.name)) {
        failApp('INVALID_INPUT', 400, `Unknown sequence in backup: ${seq.name}`);
      }
      await tx.query(`SELECT setval('aqlan_app.${seq.name}', $1::bigint, $2::boolean)`, [
        seq.lastValue,
        seq.isCalled,
      ]);
    }

    const maxFile = await tx.query<{ m: string | null }>(
      `SELECT max(file_number)::text AS m FROM aqlan_app.app_patients WHERE file_number >= 7000`,
    );
    if (maxFile.rows[0]?.m) {
      const maxVal = BigInt(maxFile.rows[0].m);
      const curSeq = await tx.query<{ last_value: string; is_called: boolean }>(
        `SELECT last_value::text, is_called FROM aqlan_app.app_patient_file_seq`,
      );
      const curLast = BigInt(curSeq.rows[0]?.last_value ?? '7000');
      const curCalled = curSeq.rows[0]?.is_called ?? false;
      if (maxVal > curLast || (maxVal === curLast && !curCalled)) {
        await tx.query(`SELECT setval('aqlan_app.app_patient_file_seq', $1::bigint, TRUE)`, [
          maxVal.toString(),
        ]);
      }
    }
  });

  // Write verified attachment binaries to isolated target attachment storage
  for (const att of bundle.attachments) {
    if (att.storageRelPath.includes('..') || att.storageRelPath.startsWith('/')) {
      failApp('INVALID_INPUT', 400, 'Unsafe attachment path in backup bundle');
    }
    const bytes = Buffer.from(att.base64Data, 'base64');
    if (bytes.length !== att.byteSize || sha256Hex(bytes) !== att.sha256Hex) {
      failApp('INVALID_INPUT', 400, `Attachment ${att.attachmentId} hash mismatch during restore`);
    }
    const fullTarget = join(targetAttachmentsRootDir, att.storageRelPath);
    await mkdir(dirname(fullTarget), { recursive: true });
    await writeFile(fullTarget, bytes);
  }

  return {
    restoredTables: BACKUP_TABLES_IN_FK_ORDER.length,
    restoredAttachments: bundle.attachments.length,
  };
}
