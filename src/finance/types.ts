/** Contracts checked against the executable TypeScript domain, not declaration shims. */
export type Currency = 'YER' | 'SAR' | 'USD';
export type Rounding = 'DOWN' | 'HALF_UP' | 'HALF_EVEN';
export interface FxSnapshot { sourceCurrency: Currency; targetCurrency: Currency; numerator: string; denominator: string; rounding: Rounding; capturedAt: string; source: string; approvedBy: string }
export interface ScheduleLine { dueDate: string; minor: string }
export interface Agreement { id: string; currency: Currency; minor: string; schedule: ScheduleLine[]; status: 'DRAFT' | 'APPROVED' }
export interface Obligation { id: string; agreementId: string; currency: Currency; minor: string; schedule: ScheduleLine[] }
export interface Invoice { id: string; obligationId: string; currency: Currency; minor: string }
export interface Receipt { id: string; currency: Currency; minor: string }
export interface AllocationInput { id: string; obligationId: string; sourceMinor: string; fx?: FxSnapshot }
export interface Allocation extends AllocationInput { receiptId: string; targetMinor: string; sourceCurrency: Currency; targetCurrency: Currency }
export interface ReleaseInput { id: string; allocationId: string; sourceMinor: string }
export interface Release extends ReleaseInput { refundId: string; targetMinor: string }
export interface Refund { id: string; receiptId: string; minor: string; currency: Currency; kind: 'REFUND_RECEIPT' | 'REVERSE_RECEIPT'; releasePolicy: 'ORIGINAL_ALLOCATION_CUMULATIVE_FLOOR' }
export interface CashMovement { id: string; receiptId: string; currency: Currency; minor: string; direction: 'IN' | 'OUT'; refundId?: string }
export interface CommandMetadata { key: string; expectedVersion: number; actorId: string; reason: string; onDate: string }
export interface RefundPayload { refundId: string; cashMovementId: string; receiptId: string; currency: Currency; minor: string; releases: ReleaseInput[]; releasePolicy: 'ORIGINAL_ALLOCATION_CUMULATIVE_FLOOR' }
export type FinanceCommand = CommandMetadata & (
 | { type: 'DRAFT_AGREEMENT'; payload: { agreementId: string; currency: Currency; minor: string; schedule: ScheduleLine[] } }
 | { type: 'APPROVE_AGREEMENT'; payload: { agreementId: string; obligationId: string } }
 | { type: 'ISSUE_INVOICE'; payload: { invoiceId: string; obligationId: string } }
 | { type: 'RECORD_RECEIPT'; payload: { receiptId: string; cashMovementId: string; currency: Currency; minor: string; allocations: AllocationInput[] } }
 | { type: 'REFUND_RECEIPT' | 'REVERSE_RECEIPT'; payload: RefundPayload }
);
export type FinanceResult = { agreementId: string } | { obligationId: string } | { invoiceId: string } | { receiptId: string } | { refundId: string };
export interface HistoryEntry { version: number; key: string; type: FinanceCommand['type']; actorId: string; reason: string; onDate: string; payload: FinanceCommand['payload']; result: FinanceResult }
export interface AccountState { id: string; patientId: string; entityId: string; version: number; agreements: Agreement[]; obligations: Obligation[]; invoices: Invoice[]; receipts: Receipt[]; allocations: Allocation[]; releases: Release[]; refunds: Refund[]; cash: CashMovement[]; history: HistoryEntry[]; idempotency: { key: string; fingerprint: string; result: FinanceResult }[] }
export interface ExecutionResult { state: AccountState; result: FinanceResult; replayed: boolean }
