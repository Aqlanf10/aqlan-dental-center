/** Domain shapes consumed by the checked clinical implementation. */
export type Service = 'ENDO' | 'RESTORATION' | 'ORTHO' | 'CONSULTATION';
export interface Target { tooth?: string; surfaces?: string[]; arch?: string }
export interface Note { text: string }
export interface Plan { id: string; patientId: string }
export interface Audit { actorId: string; onDate: string; reason: string; commandKey: string }
export interface CaseSnapshot { id: string; planId: string; patientId: string; service: Service; target: Target; baseline: Note; status: 'DRAFT' | 'APPROVED'; version: number; episodeId?: string; legacyReference?: string }
export interface Case extends CaseSnapshot { revisions: (CaseSnapshot & Audit)[] }
export interface VisitSnapshot { id: string; planId: string; caseId: string; patientId: string; kind: 'INITIAL' | 'FOLLOW_UP' | 'ADJUSTMENT'; delta: Note; baselineVersion: number; status: 'OPEN' | 'COMPLETED'; version: number }
export interface Visit extends VisitSnapshot { revisions: (VisitSnapshot & Audit)[] }
export interface CoverageReference { patientId: string; planId: string; caseId: string; obligationId: string; obligationLineId: string; agreementVersionId: string; service: Service; target: Target }
export type Coverage = { status: 'REVIEW_REQUIRED'; reference?: never } | { status: 'REFERENCED'; reference: CoverageReference };
export interface ProcedureSnapshot { id: string; planId: string; caseId: string; visitId: string; patientId: string; service: Service; target: Target; note: Note; coverage: Coverage; status: 'DRAFT' | 'APPROVED' | 'COMPLETED'; version: number; approvedBy?: string; completedBy?: string }
export interface Procedure extends ProcedureSnapshot { revisions: (ProcedureSnapshot & Audit)[] }
export interface CaseContext { planId: string; caseId: string }
export interface VisitContext extends CaseContext { visitId: string }
export interface ProcedureContext extends VisitContext { procedureId: string }
export interface DraftPayload extends ProcedureContext { target: Target; note: Note; coverage: Coverage }
export interface CommandMetadata { key: string; expectedVersion: number; actorId: string; onDate: string; reason: string; patientId: string; clinicId: string }
export interface Payloads {
 CREATE_PLAN: { planId: string };
 CREATE_CASE: CaseContext & { service: Service; target: Target; episodeId?: string; baseline: Note; legacyReference?: string };
 APPROVE_CASE: CaseContext;
 AMEND_CASE_BASELINE: CaseContext & { baseline: Note };
 OPEN_VISIT: VisitContext & { kind: VisitSnapshot['kind']; delta: Note };
 DRAFT_PROCEDURE: DraftPayload;
 REVISE_PROCEDURE_DRAFT: DraftPayload;
 APPROVE_PROCEDURE: ProcedureContext;
 COMPLETE_PROCEDURE: ProcedureContext;
 AMEND_PROCEDURE_NOTE: ProcedureContext & { note: Note };
 COMPLETE_VISIT: VisitContext;
}
export type Command = { [K in keyof Payloads]: CommandMetadata & { type: K; payload: Payloads[K] } }[keyof Payloads];
export type Result = { planId: string } | { caseId: string; version: number } | { visitId: string } | { procedureId: string; version: number };
export interface State { patientId: string; personId: string; clinicId: string; version: number; plans: Plan[]; cases: Case[]; visits: Visit[]; procedures: Procedure[]; history: (Omit<CommandMetadata, 'patientId' | 'clinicId' | 'expectedVersion'> & { version: number; type: Command['type']; result: Result })[]; idempotency: { key: string; fingerprint: string; result: Result }[] }
export interface IdentityRegistry { readonly persons: readonly { readonly personId: string }[] }
