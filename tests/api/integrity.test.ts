import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccount, execute } from '../../src/finance/account.ts';
import { verifyStoredAccount, commandFingerprint, sourceIds } from '../../src/persistence/integrity.ts';
import type { AuditRecord, SourceRecord } from '../../src/persistence/integrity.ts';
import { validateCommand } from '../../src/persistence/validation.ts';
function stored() {
  const binding = {clinic_id:'clinic',account_id:'account',entity_id:'entity',patient_id:'patient',version:'2'};
  const who = {clinicId:'clinic',userId:'user',profileId:'profile',personId:'person'};
  let state = createAccount({id:'account',entityId:'entity',patientId:'patient'});
  const audits: AuditRecord[] = [], sources: SourceRecord[] = [];
  for (const input of [
    {key:'draft',expectedVersion:0,type:'DRAFT_AGREEMENT',reason:'synthetic',onDate:'2026-10-19',payload:{agreementId:'agreement',currency:'SAR',minor:'1000',schedule:[{dueDate:'2026-10-19',minor:'1000'}]}},
    {key:'approve',expectedVersion:1,type:'APPROVE_AGREEMENT',reason:'synthetic',onDate:'2026-10-19',payload:{agreementId:'agreement',obligationId:'obligation'}}
  ]) {
    const command = validateCommand(input), next = execute(state,{...command,actorId:who.profileId}); state = next.state;
    audits.push({idempotency_key:command.key,fingerprint:commandFingerprint(who,binding,command),actor_id:who.profileId,user_id:who.userId,person_id:who.personId,command_type:command.type,reason:command.reason,business_date:command.onDate,policy_version:'synthetic-v1',result:next.result,committed_version:String(state.version)});
    for (const [source_kind,source_id] of sourceIds(command)) sources.push({source_kind,source_id,idempotency_key:command.key,entity_id:binding.entity_id});
  }
  return {binding,state,audits,sources};
}
test('stored state reconstructs exactly and fails closed on every financial/audit divergence', () => {
  const f = stored(); assert.deepEqual(verifyStoredAccount(f.binding,f.state,f.audits,f.sources),f.state);
  const corruptions = [
    (s: typeof f.state) => { if(s.obligations[0]) s.obligations[0].minor='999999'; },
    (s: typeof f.state) => { if(s.obligations[0]) s.obligations[0].agreementId='missing'; },
    (s: typeof f.state) => { if(s.agreements[0]?.schedule[0]) s.agreements[0].schedule[0].minor='1'; },
    (s: typeof f.state) => { s.idempotency=[]; },
    (s: typeof f.state) => { if(s.history[0]) s.history[0].reason='rewritten'; },
    (s: typeof f.state) => { s.receipts.push({id:'orphan',currency:'SAR',minor:'10'}); },
    (s: typeof f.state) => { s.patientId='other'; }
  ];
  for (const corrupt of corruptions) { const state = structuredClone(f.state); corrupt(state); assert.throws(() => verifyStoredAccount(f.binding,state,f.audits,f.sources),{code:'INTEGRITY_FAILURE'}); }
  assert.throws(() => verifyStoredAccount(f.binding,f.state,f.audits.slice(1),f.sources),{code:'INTEGRITY_FAILURE'});
  assert.throws(() => verifyStoredAccount(f.binding,f.state,f.audits,f.sources.slice(1)),{code:'INTEGRITY_FAILURE'});
  const audits = structuredClone(f.audits); if(audits[0]) audits[0].fingerprint='0'.repeat(64);
  assert.throws(() => verifyStoredAccount(f.binding,f.state,audits,f.sources),{code:'INTEGRITY_FAILURE'});
});
