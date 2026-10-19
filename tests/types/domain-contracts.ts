/** Compile-only regression checks. No error suppression directives are needed. */
import type { FinanceCommand, AccountState, FxSnapshot } from '../../src/finance/types.ts';
import { createAccount, execute } from '../../src/finance/account.ts';
type Assert<T extends true> = T;
type NotAssignable<From, To> = From extends To ? false : true;
type Metadata = { key: string; expectedVersion: number; actorId: string; reason: string; onDate: string };
export type RejectNumericAmounts = Assert<NotAssignable<Metadata & {type:'DRAFT_AGREEMENT';payload:{agreementId:string;currency:'USD';minor:number;schedule:[]}}, FinanceCommand>>;
export type RejectUnknownCurrency = Assert<NotAssignable<Metadata & {type:'DRAFT_AGREEMENT';payload:{agreementId:string;currency:'EUR';minor:string;schedule:[]}}, FinanceCommand>>;
export type RejectWrongPayload = Assert<NotAssignable<Metadata & {type:'APPROVE_AGREEMENT';payload:{invoiceId:string;obligationId:string}}, FinanceCommand>>;
export type RejectMissingFxEvidence = Assert<NotAssignable<{sourceCurrency:'USD';targetCurrency:'YER';numerator:string;denominator:string;rounding:'DOWN'}, FxSnapshot>>;
export type AccountImplementationMatches = Assert<ReturnType<typeof createAccount> extends AccountState ? true : false>;
export type ExecuteInputMatches = Assert<Parameters<typeof execute>[1] extends FinanceCommand ? true : false>;
const draft: FinanceCommand = {type:'DRAFT_AGREEMENT',key:'key',expectedVersion:0,actorId:'actor',reason:'test',onDate:'2026-01-01',payload:{agreementId:'agreement',currency:'USD',minor:'100',schedule:[{dueDate:'2026-01-01',minor:'100'}]}};
export const checkedTransition = () => execute(createAccount({id:'account',patientId:'patient',entityId:'clinic'}), draft);

import type { Command as ClinicalCommand } from '../../src/clinical/types.ts';
import type { Grant, PermissionDecision } from '../../src/identity/index.ts';
import { executeClinical } from '../../src/clinical/index.ts';
export type RejectClinicalWrongPayload = Assert<NotAssignable<{type:'COMPLETE_PROCEDURE';key:string;expectedVersion:number;actorId:string;onDate:string;reason:string;patientId:string;clinicId:string;payload:{planId:string;caseId:string;visitId:string}}, ClinicalCommand>>;
export type ClinicalImplementationMatches = Assert<Parameters<typeof executeClinical>[1] extends ClinicalCommand ? true : false>;
export type RejectUnknownGrantEffect = Assert<NotAssignable<Omit<Grant, 'effect'> & {effect:'superuser'}, Grant>>;
export type RejectContradictoryDecision = Assert<NotAssignable<{allowed:true;reason:'EXPLICIT_DENY'}, PermissionDecision>>;

// Compile the real cross-domain workflow, including its readonly registry result.
import { emptyIdentityRegistry, registerPerson, attachProfile } from '../../src/identity/index.ts';
import { createClinicalRecord } from '../../src/clinical/index.ts';
export const checkedIdentityClinicalComposition = () => {
  const registered = registerPerson(emptyIdentityRegistry(), {personId: 'person', displayName: 'Synthetic person'});
  const registry = attachProfile(registered, {personId: 'person', profileId: 'doctor', kind: 'doctor'});
  const clinical = createClinicalRecord({patientId: 'patient', personId: 'person', clinicId: 'clinic'}, registry);
  return executeClinical(clinical, {type: 'CREATE_PLAN', key: 'plan-key', expectedVersion: 0, actorId: 'doctor', reason: 'Synthetic plan', onDate: '2026-01-01', patientId: 'patient', clinicId: 'clinic', payload: {planId: 'plan'}});
};
