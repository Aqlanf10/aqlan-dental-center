import { createHash } from 'node:crypto';
import { createAccount, execute } from '../finance/account.ts';
import { canonical, identifier, validateCommand, fail } from './validation.ts';
import type { Command } from './validation.ts';
import type { TrustedIdentity } from './service.ts';
import type { QueryResultRow } from 'pg';

export const MAX_COMMANDS = 1000;
export type AccountBinding = { clinic_id: string; account_id: string; entity_id: string; patient_id: string; version: string };
export type AuditRecord = QueryResultRow & { idempotency_key: string; fingerprint: string; actor_id: string; user_id: string; person_id: string; command_type: string; reason: string; business_date: string; policy_version: string; result: unknown; committed_version: string };
export type SourceRecord = QueryResultRow & { source_kind: string; source_id: string; idempotency_key: string; entity_id: string };
export function commandFingerprint(who: TrustedIdentity, binding: AccountBinding, command: Command): string {
  return createHash('sha256').update(canonical({who, accountId: binding.account_id, entityId: binding.entity_id, patientId: binding.patient_id, command})).digest('hex');
}
export function sourceIds(command: Command): [string, string][] {
  switch (command.type) {
    case 'DRAFT_AGREEMENT': return [['agreement', command.payload.agreementId]];
    case 'APPROVE_AGREEMENT': return [['obligation', command.payload.obligationId]];
    case 'RECORD_RECEIPT': return [['receipt', command.payload.receiptId], ['cash', command.payload.cashMovementId], ...command.payload.allocations.map(a => ['allocation', a.id] as [string, string])];
  }
}
/** Treat JSONB as unknown. Rebuild every bounded supported transition, then compare
 * the WHOLE snapshot and normalized audit/source records. No typed JSON assertion.
 * This detects accidental/corrupt divergence, not a malicious owner rewriting all
 * mutually consistent records. Current authority/policy is checked separately.
 */
export function verifyStoredAccount(binding: AccountBinding, snapshot: unknown, audits: AuditRecord[], sources: SourceRecord[]) {
  try {
    for (const value of [binding.clinic_id, binding.account_id, binding.entity_id, binding.patient_id]) identifier(value);
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot) || !('history' in snapshot) || !Array.isArray(snapshot.history) || snapshot.history.length > MAX_COMMANDS || Buffer.byteLength(JSON.stringify(snapshot)) > 1048576) throw new Error('Invalid snapshot');
    const history: unknown[] = snapshot.history;
    if (audits.length !== history.length || Number(binding.version) !== history.length) throw new Error('Invalid audit count');
    let rebuilt = createAccount({id: binding.account_id, entityId: binding.entity_id, patientId: binding.patient_id});
    const expectedSources: SourceRecord[] = [];
    for (let index = 0; index < history.length; index++) {
      const item = history[index], audit = audits[index];
      if (!item || typeof item !== 'object' || Array.isArray(item) || !audit) throw new Error('Invalid history');
      const row = item as Record<string, unknown>;
      const actorId = identifier(row.actorId);
      const command = validateCommand({key:row.key, expectedVersion:index, type:row.type, reason:row.reason, onDate:row.onDate, payload:row.payload});
      if (row.version !== index + 1 || Number(audit.committed_version) !== index + 1 || audit.idempotency_key !== command.key || audit.actor_id !== actorId || audit.command_type !== command.type || audit.reason !== command.reason || audit.business_date !== command.onDate) throw new Error('Invalid audit correspondence');
      identifier(audit.user_id); identifier(audit.person_id); identifier(audit.policy_version);
      const who = {clinicId: binding.clinic_id, userId: audit.user_id, profileId: actorId, personId: audit.person_id};
      if (audit.fingerprint !== commandFingerprint(who, binding, command)) throw new Error('Invalid audit fingerprint');
      const transition = execute(rebuilt, {...command, actorId});
      if (transition.replayed || canonical(audit.result) !== canonical(transition.result)) throw new Error('Invalid result');
      rebuilt = transition.state;
      for (const [source_kind, source_id] of sourceIds(command)) expectedSources.push({source_kind, source_id, idempotency_key: command.key, entity_id: binding.entity_id});
    }
    const sorted = (rows: SourceRecord[]) => rows.map(row => canonical(row)).sort();
    if (canonical(rebuilt) !== canonical(snapshot) || canonical(sorted(sources)) !== canonical(sorted(expectedSources))) throw new Error('Invalid aggregate/source correspondence');
    return rebuilt;
  } catch { return fail('INTEGRITY_FAILURE', 500); }
}
