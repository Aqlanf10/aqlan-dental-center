import type { DbExecutor } from '../../platform/db.ts';
import { addCalendarMonths, assertIsoDate } from '../../platform/clock.ts';
import { newEntityId } from '../../platform/crypto.ts';
import { failApp } from '../../platform/errors.ts';
import { convertMinor, CURRENCIES, currency, parseMoney } from '../../finance/money.ts';
import type { Currency, FxSnapshot } from '../../finance/types.ts';
import {
  assertModulePermission,
  getClinicSettings,
  recordAuditEvent,
  type AuthenticatedActor,
  type ClinicOperationalSettings,
} from '../governance/index.ts';
import { assertPatientAccess, getPatientById } from '../patients/index.ts';

export interface InvoiceLineView {
  readonly lineId: string;
  readonly visitProcedureId: string | null;
  readonly descriptionAr: string;
  readonly descriptionEn: string;
  readonly fdiTooth: string | null;
  readonly quantity: number;
  readonly unitPriceMinor: string;
  readonly lineTotalMinor: string;
}

export interface InvoiceView {
  readonly invoiceId: string;
  readonly invoiceNumber: number;
  readonly patientId: string;
  readonly visitId: string | null;
  readonly doctorUserId: string | null;
  readonly doctorName: string | null;
  readonly issuedDate: string;
  readonly currency: Currency;
  readonly grossMinor: string;
  readonly discountMinor: string;
  readonly netMinor: string;
  readonly paidMinor: string;
  readonly remainingMinor: string;
  readonly status: 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'VOIDED';
  readonly voidReason: string | null;
  readonly notes: string;
  readonly lines: readonly InvoiceLineView[];
  readonly version: number;
}

export interface ReceiptView {
  readonly receiptId: string;
  readonly receiptNumber: number;
  readonly invoiceId: string;
  readonly invoiceNumber: number;
  readonly patientId: string;
  readonly kind: 'COLLECTION' | 'REVERSAL';
  readonly reversesReceiptId: string | null;
  readonly receiptDate: string;
  readonly paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER';
  readonly paymentCurrency: Currency;
  readonly paymentMinor: string;
  readonly invoiceCurrency: Currency;
  readonly allocatedInvoiceMinor: string;
  readonly fxSnapshot: FxSnapshot | null;
  readonly reason: string;
  readonly recordedByName: string;
  readonly recordedAt: string;
}

export interface InstallmentLineView {
  readonly installmentNo: number;
  readonly dueDate: string;
  readonly amountMinor: string;
  readonly paidMinor: string;
  readonly remainingMinor: string;
  readonly lineStatus: 'PAID' | 'PARTIAL' | 'PENDING';
}

export interface InstallmentScheduleView {
  readonly scheduleId: string;
  readonly invoiceId: string;
  readonly invoiceNumber: number;
  readonly patientId: string;
  readonly currency: Currency;
  readonly invoiceGrossMinor: string;
  readonly invoiceDiscountMinor: string;
  readonly invoiceNetMinor: string;
  readonly paidAtCreationMinor: string;
  readonly currentInvoicePaidMinor: string;
  readonly currentInvoiceRemainingMinor: string;
  readonly financedRemainingMinor: string;
  readonly monthsCount: number;
  readonly startDueDate: string;
  readonly status: 'ACTIVE' | 'SUPERSEDED' | 'CANCELLED';
  readonly notes: string;
  readonly lines: readonly InstallmentLineView[];
}

export interface CurrencySummaryBucket {
  readonly currency: Currency;
  readonly openingBalanceMinor: string;
  readonly invoicedNetMinor: string;
  readonly collectedNetMinor: string;
  readonly outstandingMinor: string;
}

export interface PatientStatementView {
  readonly patientId: string;
  readonly fileNumber: number;
  readonly fullName: string;
  readonly phone: string;
  readonly primaryDoctorName: string | null;
  readonly generatedOnDate: string;
  readonly currencyBuckets: readonly CurrencySummaryBucket[];
  readonly invoices: readonly InvoiceView[];
  readonly receipts: readonly ReceiptView[];
  readonly activeSchedules: readonly InstallmentScheduleView[];
}

export function formatMinorPlainDecimal(minor: string, code: Currency): string {
  const val = BigInt(minor);
  const neg = val < 0n;
  const abs = neg ? -val : val;
  const prec = CURRENCIES[code];
  const scale = 10n ** BigInt(prec);
  const whole = abs / scale;
  const frac = (abs % scale).toString().padStart(prec, '0');
  return `${neg ? '-' : ''}${whole.toString()}.${frac}`;
}

function resolveGovernedFxPair(
  settings: ClinicOperationalSettings,
  sourceCurrency: Currency,
  targetCurrency: Currency,
): { numerator: string; denominator: string } {
  const fx = settings.finance.fxRates;
  if (sourceCurrency === 'SAR' && targetCurrency === 'YER') return fx.SAR_TO_YER;
  if (sourceCurrency === 'YER' && targetCurrency === 'SAR') {
    return { numerator: fx.SAR_TO_YER.denominator, denominator: fx.SAR_TO_YER.numerator };
  }
  if (sourceCurrency === 'USD' && targetCurrency === 'YER') return fx.USD_TO_YER;
  if (sourceCurrency === 'YER' && targetCurrency === 'USD') {
    return { numerator: fx.USD_TO_YER.denominator, denominator: fx.USD_TO_YER.numerator };
  }
  if (sourceCurrency === 'USD' && targetCurrency === 'SAR') return fx.USD_TO_SAR;
  if (sourceCurrency === 'SAR' && targetCurrency === 'USD') {
    return { numerator: fx.USD_TO_SAR.denominator, denominator: fx.USD_TO_SAR.numerator };
  }
  failApp('CURRENCY_MISMATCH', 400, `Unsupported FX conversion ${sourceCurrency} -> ${targetCurrency}`);
}

export async function issueInvoice(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    patientId: string;
    visitId?: string | null;
    doctorUserId?: string | null;
    issuedDate: string;
    currency?: Currency;
    discountDecimal?: string;
    notes?: string;
    visitProcedureIds?: readonly string[];
    manualLines?: readonly {
      descriptionAr: string;
      descriptionEn: string;
      fdiTooth?: string | null;
      quantity?: number;
      unitPriceDecimal: string;
    }[];
  },
  clinicToday: string,
): Promise<InvoiceView> {
  assertModulePermission(actor, 'billing', 'create');
  await assertPatientAccess(tx, actor, input.patientId, clinicToday);

  const issuedDate = assertIsoDate(input.issuedDate);
  const { settings } = await getClinicSettings(tx, actor.clinicId);
  const invCurrency: Currency = input.currency ? currency(input.currency) : settings.finance.defaultCurrency;

  interface PreparedLine {
    visitProcedureId: string | null;
    descriptionAr: string;
    descriptionEn: string;
    fdiTooth: string | null;
    quantity: number;
    unitPriceMinor: bigint;
    lineTotalMinor: bigint;
  }

  const preparedLines: PreparedLine[] = [];

  if (input.visitProcedureIds && input.visitProcedureIds.length > 0) {
    const uniqueProcIds = [...new Set(input.visitProcedureIds)];
    if (uniqueProcIds.length !== input.visitProcedureIds.length) {
      failApp('DUPLICATE_BILLING', 409, 'Duplicate procedure ID in the same invoice request');
    }

    for (const procId of uniqueProcIds) {
      const procRes = await tx.query<{
        procedure_id: string;
        patient_id: string;
        procedure_name_ar: string;
        procedure_name_en: string;
        fdi_tooth: string | null;
        currency: Currency;
        fee_minor: string;
        status: string;
      }>(
        `SELECT procedure_id, patient_id, procedure_name_ar, procedure_name_en,
                fdi_tooth, currency, fee_minor::text, status
           FROM app_visit_procedures
          WHERE clinic_id = $1 AND procedure_id = $2
          FOR UPDATE`,
        [actor.clinicId, procId],
      );
      const proc = procRes.rows[0];
      if (!proc || proc.patient_id !== input.patientId) {
        failApp('NOT_FOUND', 404, `Procedure ${procId} not found for patient`);
      }
      if (proc.status === 'CANCELLED') {
        failApp('INVALID_TRANSITION', 409, 'Cancelled clinical procedure cannot be billed');
      }
      if (proc.currency !== invCurrency) {
        failApp('CURRENCY_MISMATCH', 409, 'Procedure currency differs from invoice currency');
      }

      const activeBilled = await tx.query(
        `SELECT 1 FROM app_invoice_lines
          WHERE clinic_id = $1 AND visit_procedure_id = $2 AND is_active_billing = TRUE`,
        [actor.clinicId, procId],
      );
      if (activeBilled.rows[0] !== undefined) {
        failApp('DUPLICATE_BILLING', 409, `Procedure ${procId} is already billed`);
      }

      const fee = BigInt(proc.fee_minor);
      preparedLines.push({
        visitProcedureId: proc.procedure_id,
        descriptionAr: proc.procedure_name_ar,
        descriptionEn: proc.procedure_name_en,
        fdiTooth: proc.fdi_tooth,
        quantity: 1,
        unitPriceMinor: fee,
        lineTotalMinor: fee,
      });
    }
  }

  if (input.manualLines && input.manualLines.length > 0) {
    for (const ml of input.manualLines) {
      const descAr = typeof ml.descriptionAr === 'string' ? ml.descriptionAr.trim() : '';
      const descEn = typeof ml.descriptionEn === 'string' ? ml.descriptionEn.trim() : '';
      if (!descAr || !descEn) {
        failApp('INVALID_INPUT', 400, 'Invoice line requires descriptionAr and descriptionEn');
      }
      const qty = ml.quantity ?? 1;
      if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
        failApp('INVALID_INPUT', 400, 'Line quantity must be 1..100');
      }
      let unitMinor: bigint;
      try {
        unitMinor = BigInt(parseMoney(ml.unitPriceDecimal, invCurrency).minor);
      } catch {
        failApp('INVALID_INPUT', 400, 'Invalid unitPriceDecimal');
      }
      preparedLines.push({
        visitProcedureId: null,
        descriptionAr: descAr,
        descriptionEn: descEn,
        fdiTooth: ml.fdiTooth ?? null,
        quantity: qty,
        unitPriceMinor: unitMinor,
        lineTotalMinor: unitMinor * BigInt(qty),
      });
    }
  }

  if (preparedLines.length === 0) {
    failApp('INVALID_INPUT', 400, 'Invoice must contain at least one procedure or line item');
  }

  const grossMinor = preparedLines.reduce((acc, l) => acc + l.lineTotalMinor, 0n);
  if (grossMinor <= 0n) {
    failApp('INVALID_INPUT', 400, 'Invoice gross total must be strictly positive');
  }

  let discountMinor = 0n;
  if (input.discountDecimal !== undefined && input.discountDecimal.trim() !== '') {
    try {
      discountMinor = BigInt(parseMoney(input.discountDecimal.trim(), invCurrency).minor);
    } catch {
      failApp('INVALID_INPUT', 400, 'Invalid discountDecimal');
    }
  }
  if (discountMinor < 0n || discountMinor >= grossMinor) {
    failApp('INVALID_INPUT', 400, 'Discount must be >= 0 and strictly less than gross total');
  }
  const netMinor = grossMinor - discountMinor;

  const seqRes = await tx.query<{ n: string }>(`SELECT nextval('aqlan_app.app_invoice_no_seq')::text AS n`);
  const invoiceNumber = Number(seqRes.rows[0]?.n ?? '1001');
  const invoiceId = newEntityId('inv');
  const notes = typeof input.notes === 'string' ? input.notes.trim().slice(0, 500) : '';

  const patRow = await tx.query<{ primary_doctor_user_id: string | null }>(
    `SELECT primary_doctor_user_id FROM app_patients WHERE clinic_id = $1 AND patient_id = $2`,
    [actor.clinicId, input.patientId],
  );
  const doctorUserId = input.doctorUserId ?? patRow.rows[0]?.primary_doctor_user_id ?? null;

  await tx.query(
    `INSERT INTO app_invoices
       (invoice_id, clinic_id, invoice_number, patient_id, visit_id, doctor_user_id,
        issued_date, currency, gross_minor, discount_minor, net_minor, paid_minor,
        status, notes, issued_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9::bigint, $10::bigint, $11::bigint, 0, 'ISSUED', $12, $13)`,
    [
      invoiceId,
      actor.clinicId,
      invoiceNumber,
      input.patientId,
      input.visitId ?? null,
      doctorUserId,
      issuedDate,
      invCurrency,
      grossMinor.toString(),
      discountMinor.toString(),
      netMinor.toString(),
      notes,
      actor.userId,
    ],
  );

  for (const line of preparedLines) {
    try {
      await tx.query(
        `INSERT INTO app_invoice_lines
           (line_id, clinic_id, invoice_id, patient_id, visit_procedure_id,
            description_ar, description_en, fdi_tooth, quantity,
            unit_price_minor, line_total_minor, is_active_billing)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::bigint, $11::bigint, TRUE)`,
        [
          newEntityId('inl'),
          actor.clinicId,
          invoiceId,
          input.patientId,
          line.visitProcedureId,
          line.descriptionAr,
          line.descriptionEn,
          line.fdiTooth,
          line.quantity,
          line.unitPriceMinor.toString(),
          line.lineTotalMinor.toString(),
        ],
      );
    } catch (err) {
      const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
      if (code === '23505') {
        failApp('DUPLICATE_BILLING', 409, 'Clinical procedure already billed concurrently');
      }
      throw err;
    }
  }

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'BILLING',
    action: 'ISSUE_INVOICE',
    entityType: 'invoice',
    entityId: invoiceId,
    reason: notes || 'Issue patient invoice',
    afterSnapshot: {
      invoiceNumber,
      currency: invCurrency,
      grossMinor: grossMinor.toString(),
      discountMinor: discountMinor.toString(),
      netMinor: netMinor.toString(),
    },
  });

  return getInvoiceById(tx, actor, invoiceId, clinicToday);
}

export async function getInvoiceById(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  invoiceId: string,
  clinicToday: string,
): Promise<InvoiceView> {
  assertModulePermission(actor, 'billing', 'view');
  const res = await tx.query<{
    invoice_id: string;
    invoice_number: string;
    patient_id: string;
    visit_id: string | null;
    doctor_user_id: string | null;
    doctor_name: string | null;
    issued_date: string;
    currency: Currency;
    gross_minor: string;
    discount_minor: string;
    net_minor: string;
    paid_minor: string;
    status: 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'VOIDED';
    void_reason: string | null;
    notes: string;
    version: number;
  }>(
    `SELECT i.invoice_id, i.invoice_number::text, i.patient_id, i.visit_id,
            i.doctor_user_id, d.display_name AS doctor_name,
            i.issued_date::text AS issued_date, i.currency,
            i.gross_minor::text, i.discount_minor::text, i.net_minor::text, i.paid_minor::text,
            i.status, i.void_reason, i.notes, i.version
       FROM app_invoices i
       LEFT JOIN app_staff_users d ON d.user_id = i.doctor_user_id
      WHERE i.clinic_id = $1 AND i.invoice_id = $2`,
    [actor.clinicId, invoiceId],
  );
  const inv = res.rows[0];
  if (!inv) failApp('NOT_FOUND', 404, 'Invoice not found');
  await assertPatientAccess(tx, actor, inv.patient_id, clinicToday);

  const linesRes = await tx.query<{
    line_id: string;
    visit_procedure_id: string | null;
    description_ar: string;
    description_en: string;
    fdi_tooth: string | null;
    quantity: number;
    unit_price_minor: string;
    line_total_minor: string;
  }>(
    `SELECT line_id, visit_procedure_id, description_ar, description_en,
            fdi_tooth, quantity, unit_price_minor::text, line_total_minor::text
       FROM app_invoice_lines
      WHERE clinic_id = $1 AND invoice_id = $2
      ORDER BY line_id ASC`,
    [actor.clinicId, invoiceId],
  );

  const remainingMinor =
    inv.status === 'VOIDED'
      ? '0'
      : (BigInt(inv.net_minor) - BigInt(inv.paid_minor)).toString();

  return {
    invoiceId: inv.invoice_id,
    invoiceNumber: Number(inv.invoice_number),
    patientId: inv.patient_id,
    visitId: inv.visit_id,
    doctorUserId: inv.doctor_user_id,
    doctorName: inv.doctor_name,
    issuedDate: inv.issued_date.slice(0, 10),
    currency: inv.currency,
    grossMinor: inv.gross_minor,
    discountMinor: inv.discount_minor,
    netMinor: inv.net_minor,
    paidMinor: inv.paid_minor,
    remainingMinor,
    status: inv.status,
    voidReason: inv.void_reason,
    notes: inv.notes,
    lines: linesRes.rows.map(l => ({
      lineId: l.line_id,
      visitProcedureId: l.visit_procedure_id,
      descriptionAr: l.description_ar,
      descriptionEn: l.description_en,
      fdiTooth: l.fdi_tooth,
      quantity: l.quantity,
      unitPriceMinor: l.unit_price_minor,
      lineTotalMinor: l.line_total_minor,
    })),
    version: inv.version,
  };
}

export async function recordReceipt(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    invoiceId: string;
    receiptDate: string;
    paymentMethod: 'CASH' | 'CARD' | 'BANK_TRANSFER';
    paymentCurrency?: Currency;
    amountDecimal: string;
    reason: string;
    now: Date;
  },
  clinicToday: string,
): Promise<ReceiptView> {
  assertModulePermission(actor, 'billing', 'create');

  const receiptDate = assertIsoDate(input.receiptDate);
  if (!['CASH', 'CARD', 'BANK_TRANSFER'].includes(input.paymentMethod)) {
    failApp('INVALID_INPUT', 400, 'Invalid paymentMethod');
  }
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (!reason) {
    failApp('INVALID_INPUT', 400, 'Receipt note/reason is required');
  }

  const locked = await tx.query<{
    invoice_id: string;
    invoice_number: string;
    patient_id: string;
    currency: Currency;
    net_minor: string;
    paid_minor: string;
    status: string;
  }>(
    `SELECT invoice_id, invoice_number::text, patient_id, currency,
            net_minor::text, paid_minor::text, status
       FROM app_invoices
      WHERE clinic_id = $1 AND invoice_id = $2
      FOR UPDATE`,
    [actor.clinicId, input.invoiceId],
  );
  const inv = locked.rows[0];
  if (!inv) failApp('NOT_FOUND', 404, 'Invoice not found');
  await assertPatientAccess(tx, actor, inv.patient_id, clinicToday);

  if (inv.status === 'VOIDED') {
    failApp('INVALID_TRANSITION', 409, 'Cannot collect receipt against a VOIDED invoice');
  }

  const payCurr: Currency = input.paymentCurrency ? currency(input.paymentCurrency) : inv.currency;
  let payMinorStr: string;
  try {
    payMinorStr = parseMoney(input.amountDecimal, payCurr).minor;
  } catch {
    failApp('INVALID_INPUT', 400, 'Invalid payment amountDecimal');
  }
  const payMinor = BigInt(payMinorStr);
  if (payMinor <= 0n) {
    failApp('INVALID_INPUT', 400, 'Receipt amount must be strictly positive');
  }

  const { settings } = await getClinicSettings(tx, actor.clinicId);
  let allocatedMinorStr = payMinorStr;
  let fxSnapshot: FxSnapshot | null = null;

  if (payCurr !== inv.currency) {
    const pair = resolveGovernedFxPair(settings, payCurr, inv.currency);
    fxSnapshot = {
      sourceCurrency: payCurr,
      targetCurrency: inv.currency,
      numerator: pair.numerator,
      denominator: pair.denominator,
      rounding: 'HALF_UP',
      capturedAt: input.now.toISOString(),
      source: 'CLINIC_GOVERNED_SETTINGS',
      approvedBy: actor.userId,
    };
    allocatedMinorStr = convertMinor(payMinorStr, fxSnapshot);
  }

  const allocatedBig = BigInt(allocatedMinorStr);
  if (allocatedBig <= 0n) {
    failApp('INVALID_INPUT', 400, 'Converted allocation must be strictly positive');
  }

  const netBig = BigInt(inv.net_minor);
  const paidBefore = BigInt(inv.paid_minor);
  const remainingBefore = netBig - paidBefore;
  if (allocatedBig > remainingBefore) {
    failApp('OVERPAYMENT', 409, 'Receipt exceeds remaining invoice balance');
  }

  const paidAfter = paidBefore + allocatedBig;
  const nextStatus = paidAfter === netBig ? 'PAID' : 'PARTIALLY_PAID';

  const seqRes = await tx.query<{ n: string }>(`SELECT nextval('aqlan_app.app_receipt_no_seq')::text AS n`);
  const receiptNumber = Number(seqRes.rows[0]?.n ?? '5001');
  const receiptId = newEntityId('rcp');

  await tx.query(
    `INSERT INTO app_receipts
       (receipt_id, clinic_id, receipt_number, invoice_id, patient_id, kind,
        reverses_receipt_id, receipt_date, payment_method, payment_currency,
        payment_minor, invoice_currency, allocated_invoice_minor, fx_snapshot, reason, recorded_by)
     VALUES ($1, $2, $3, $4, $5, 'COLLECTION', NULL, $6::date, $7, $8, $9::bigint, $10, $11::bigint, $12::jsonb, $13, $14)`,
    [
      receiptId,
      actor.clinicId,
      receiptNumber,
      inv.invoice_id,
      inv.patient_id,
      receiptDate,
      input.paymentMethod,
      payCurr,
      payMinorStr,
      inv.currency,
      allocatedMinorStr,
      fxSnapshot ? JSON.stringify(fxSnapshot) : null,
      reason,
      actor.userId,
    ],
  );

  await tx.query(
    `UPDATE app_invoices
        SET paid_minor = $3::bigint, status = $4, version = version + 1, updated_at = now()
      WHERE clinic_id = $1 AND invoice_id = $2`,
    [actor.clinicId, inv.invoice_id, paidAfter.toString(), nextStatus],
  );

  await tx.query(
    `INSERT INTO app_outbox_messages
       (message_id, clinic_id, channel, template_key, recipient_patient_id, payload, status)
     VALUES ($1, $2, $3, 'RECEIPT_ISSUED', $4, $5::jsonb, $6)`,
    [
      newEntityId('obx'),
      actor.clinicId,
      settings.comms.defaultChannel,
      inv.patient_id,
      JSON.stringify({ receiptId, receiptNumber, paymentCurrency: payCurr, paymentMinor: payMinorStr }),
      settings.comms.outboxEnabled ? 'QUEUED' : 'SUPPRESSED',
    ],
  );

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'BILLING',
    action: 'RECORD_RECEIPT',
    entityType: 'receipt',
    entityId: receiptId,
    reason,
    afterSnapshot: {
      receiptNumber,
      invoiceId: inv.invoice_id,
      paymentCurrency: payCurr,
      paymentMinor: payMinorStr,
      allocatedInvoiceMinor: allocatedMinorStr,
      fxSnapshot,
    },
  });

  return getReceiptById(tx, actor, receiptId, clinicToday);
}

export async function reverseReceipt(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: { receiptId: string; reversalDate: string; reason: string },
  clinicToday: string,
): Promise<ReceiptView> {
  assertModulePermission(actor, 'billing', 'cancel');
  assertModulePermission(actor, 'billing', 'approve');
  const reversalDate = assertIsoDate(input.reversalDate);
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (!reason) failApp('INVALID_INPUT', 400, 'Reversal reason is required');

  const origRes = await tx.query<{
    receipt_id: string;
    invoice_id: string;
    patient_id: string;
    kind: string;
    payment_method: 'CASH' | 'CARD' | 'BANK_TRANSFER';
    payment_currency: Currency;
    payment_minor: string;
    invoice_currency: Currency;
    allocated_invoice_minor: string;
    fx_snapshot: FxSnapshot | null;
  }>(
    `SELECT receipt_id, invoice_id, patient_id, kind, payment_method,
            payment_currency, payment_minor::text, invoice_currency,
            allocated_invoice_minor::text, fx_snapshot
       FROM app_receipts
      WHERE clinic_id = $1 AND receipt_id = $2`,
    [actor.clinicId, input.receiptId],
  );
  const orig = origRes.rows[0];
  if (!orig) failApp('NOT_FOUND', 404, 'Receipt not found');
  await assertPatientAccess(tx, actor, orig.patient_id, clinicToday);

  if (orig.kind !== 'COLLECTION') {
    failApp('INVALID_TRANSITION', 409, 'Only COLLECTION receipts can be reversed');
  }

  const invRes = await tx.query<{ paid_minor: string; net_minor: string; status: string }>(
    `SELECT paid_minor::text, net_minor::text, status
       FROM app_invoices
      WHERE clinic_id = $1 AND invoice_id = $2
      FOR UPDATE`,
    [actor.clinicId, orig.invoice_id],
  );
  const inv = invRes.rows[0];
  if (!inv) failApp('NOT_FOUND', 404);

  const alreadyReversed = await tx.query(
    `SELECT 1 FROM app_receipts WHERE clinic_id = $1 AND reverses_receipt_id = $2`,
    [actor.clinicId, orig.receipt_id],
  );
  if (alreadyReversed.rows[0] !== undefined) {
    failApp('INVALID_TRANSITION', 409, 'Receipt has already been reversed');
  }

  const paidAfter = BigInt(inv.paid_minor) - BigInt(orig.allocated_invoice_minor);
  if (paidAfter < 0n) {
    failApp('INTERNAL_ERROR', 500, 'Negative paid_minor prevented');
  }
  const nextStatus = paidAfter === 0n ? 'ISSUED' : 'PARTIALLY_PAID';

  const seqRes = await tx.query<{ n: string }>(`SELECT nextval('aqlan_app.app_receipt_no_seq')::text AS n`);
  const reversalReceiptNumber = Number(seqRes.rows[0]?.n ?? '5001');
  const reversalId = newEntityId('rcp');

  await tx.query(
    `INSERT INTO app_receipts
       (receipt_id, clinic_id, receipt_number, invoice_id, patient_id, kind,
        reverses_receipt_id, receipt_date, payment_method, payment_currency,
        payment_minor, invoice_currency, allocated_invoice_minor, fx_snapshot, reason, recorded_by)
     VALUES ($1, $2, $3, $4, $5, 'REVERSAL', $6, $7::date, $8, $9, $10::bigint, $11, $12::bigint, $13::jsonb, $14, $15)`,
    [
      reversalId,
      actor.clinicId,
      reversalReceiptNumber,
      orig.invoice_id,
      orig.patient_id,
      orig.receipt_id,
      reversalDate,
      orig.payment_method,
      orig.payment_currency,
      orig.payment_minor,
      orig.invoice_currency,
      orig.allocated_invoice_minor,
      orig.fx_snapshot ? JSON.stringify(orig.fx_snapshot) : null,
      reason,
      actor.userId,
    ],
  );

  await tx.query(
    `UPDATE app_invoices
        SET paid_minor = $3::bigint, status = $4, version = version + 1, updated_at = now()
      WHERE clinic_id = $1 AND invoice_id = $2`,
    [actor.clinicId, orig.invoice_id, paidAfter.toString(), nextStatus],
  );

  // If paidAfter dropped below an active schedule's paid_at_creation_minor, supersede it cleanly
  await tx.query(
    `UPDATE app_installment_schedules
        SET status = 'SUPERSEDED',
            cancelled_at = now(),
            cancel_reason = 'Superseded automatically due to receipt reversal'
      WHERE clinic_id = $1
        AND invoice_id = $2
        AND status = 'ACTIVE'
        AND paid_at_creation_minor > $3::bigint`,
    [actor.clinicId, orig.invoice_id, paidAfter.toString()],
  );

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'BILLING',
    action: 'REVERSE_RECEIPT',
    entityType: 'receipt',
    entityId: reversalId,
    reason,
    beforeSnapshot: { reversedReceiptId: orig.receipt_id, allocatedMinor: orig.allocated_invoice_minor },
    afterSnapshot: { invoicePaidAfterMinor: paidAfter.toString(), invoiceStatus: nextStatus },
  });

  return getReceiptById(tx, actor, reversalId, clinicToday);
}

export async function voidInvoice(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: { invoiceId: string; expectedVersion: number; reason: string },
  clinicToday: string,
): Promise<InvoiceView> {
  assertModulePermission(actor, 'billing', 'cancel');
  assertModulePermission(actor, 'billing', 'approve');
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (!reason) failApp('INVALID_INPUT', 400, 'Void reason is required');

  const locked = await tx.query<{
    patient_id: string;
    paid_minor: string;
    status: string;
    version: number;
  }>(
    `SELECT patient_id, paid_minor::text, status, version
       FROM app_invoices
      WHERE clinic_id = $1 AND invoice_id = $2
      FOR UPDATE`,
    [actor.clinicId, input.invoiceId],
  );
  const inv = locked.rows[0];
  if (!inv) failApp('NOT_FOUND', 404);
  await assertPatientAccess(tx, actor, inv.patient_id, clinicToday);
  if (inv.version !== input.expectedVersion) {
    failApp('STALE_VERSION', 409, 'Invoice version conflict');
  }
  if (inv.status === 'VOIDED') {
    failApp('INVALID_TRANSITION', 409, 'Invoice is already VOIDED');
  }
  if (BigInt(inv.paid_minor) > 0n) {
    failApp('INVALID_TRANSITION', 409, 'Reverse collected receipts before voiding invoice');
  }

  await tx.query(
    `UPDATE app_invoices
        SET status = 'VOIDED',
            void_reason = $3,
            voided_by = $4,
            voided_at = now(),
            version = version + 1,
            updated_at = now()
      WHERE clinic_id = $1 AND invoice_id = $2`,
    [actor.clinicId, input.invoiceId, reason, actor.userId],
  );

  await tx.query(
    `UPDATE app_invoice_lines
        SET is_active_billing = FALSE
      WHERE clinic_id = $1 AND invoice_id = $2`,
    [actor.clinicId, input.invoiceId],
  );

  await tx.query(
    `UPDATE app_installment_schedules
        SET status = 'CANCELLED', cancelled_at = now(), cancel_reason = $3
      WHERE clinic_id = $1 AND invoice_id = $2 AND status = 'ACTIVE'`,
    [actor.clinicId, input.invoiceId, `Invoice voided: ${reason}`],
  );

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'BILLING',
    action: 'VOID_INVOICE',
    entityType: 'invoice',
    entityId: input.invoiceId,
    reason,
    beforeSnapshot: { status: inv.status },
    afterSnapshot: { status: 'VOIDED' },
  });

  return getInvoiceById(tx, actor, input.invoiceId, clinicToday);
}

export async function getReceiptById(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  receiptId: string,
  clinicToday: string,
): Promise<ReceiptView> {
  assertModulePermission(actor, 'billing', 'view');
  const res = await tx.query<{
    receipt_id: string;
    receipt_number: string;
    invoice_id: string;
    invoice_number: string;
    patient_id: string;
    kind: 'COLLECTION' | 'REVERSAL';
    reverses_receipt_id: string | null;
    receipt_date: string;
    payment_method: 'CASH' | 'CARD' | 'BANK_TRANSFER';
    payment_currency: Currency;
    payment_minor: string;
    invoice_currency: Currency;
    allocated_invoice_minor: string;
    fx_snapshot: FxSnapshot | null;
    reason: string;
    staff_name: string;
    recorded_at: Date;
  }>(
    `SELECT r.receipt_id, r.receipt_number::text, r.invoice_id, i.invoice_number::text,
            r.patient_id, r.kind, r.reverses_receipt_id, r.receipt_date::text AS receipt_date,
            r.payment_method, r.payment_currency, r.payment_minor::text,
            r.invoice_currency, r.allocated_invoice_minor::text, r.fx_snapshot,
            r.reason, u.display_name AS staff_name, r.recorded_at
       FROM app_receipts r
       JOIN app_invoices i ON i.invoice_id = r.invoice_id
       JOIN app_staff_users u ON u.user_id = r.recorded_by
      WHERE r.clinic_id = $1 AND r.receipt_id = $2`,
    [actor.clinicId, receiptId],
  );
  const r = res.rows[0];
  if (!r) failApp('NOT_FOUND', 404, 'Receipt not found');
  await assertPatientAccess(tx, actor, r.patient_id, clinicToday);

  return {
    receiptId: r.receipt_id,
    receiptNumber: Number(r.receipt_number),
    invoiceId: r.invoice_id,
    invoiceNumber: Number(r.invoice_number),
    patientId: r.patient_id,
    kind: r.kind,
    reversesReceiptId: r.reverses_receipt_id,
    receiptDate: r.receipt_date.slice(0, 10),
    paymentMethod: r.payment_method,
    paymentCurrency: r.payment_currency,
    paymentMinor: r.payment_minor,
    invoiceCurrency: r.invoice_currency,
    allocatedInvoiceMinor: r.allocated_invoice_minor,
    fxSnapshot: r.fx_snapshot,
    reason: r.reason,
    recordedByName: r.staff_name,
    recordedAt: r.recorded_at.toISOString(),
  };
}

/**
 * Generates an installment schedule strictly from the TRUE remaining invoice balance:
 *   financed_remaining_minor = invoice.net_minor - invoice.paid_minor
 * Paid receipts are NEVER deducted a second time and NEVER duplicated as unpaid lines.
 */
export async function createInstallmentSchedule(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    invoiceId: string;
    monthsCount: number;
    startDueDate: string;
    notes?: string;
  },
  clinicToday: string,
): Promise<InstallmentScheduleView> {
  assertModulePermission(actor, 'billing', 'create');
  const startDueDate = assertIsoDate(input.startDueDate);
  const monthsCount = Number(input.monthsCount);
  if (!Number.isInteger(monthsCount) || monthsCount < 1 || monthsCount > 60) {
    failApp('INVALID_INPUT', 400, 'monthsCount must be an integer between 1 and 60');
  }

  const locked = await tx.query<{
    invoice_id: string;
    patient_id: string;
    currency: Currency;
    net_minor: string;
    paid_minor: string;
    status: string;
  }>(
    `SELECT invoice_id, patient_id, currency, net_minor::text, paid_minor::text, status
       FROM app_invoices
      WHERE clinic_id = $1 AND invoice_id = $2
      FOR UPDATE`,
    [actor.clinicId, input.invoiceId],
  );
  const inv = locked.rows[0];
  if (!inv) failApp('NOT_FOUND', 404, 'Invoice not found');
  await assertPatientAccess(tx, actor, inv.patient_id, clinicToday);

  if (inv.status === 'VOIDED' || inv.status === 'PAID') {
    failApp('INVALID_TRANSITION', 409, 'Installments require an active unpaid or partially-paid invoice');
  }

  const netBig = BigInt(inv.net_minor);
  const paidBig = BigInt(inv.paid_minor);
  const remainingBig = netBig - paidBig;
  if (remainingBig <= 0n) {
    failApp('INVALID_TRANSITION', 409, 'No remaining balance to finance');
  }

  const monthsBig = BigInt(monthsCount);
  const basePerMonth = remainingBig / monthsBig;
  const remainder = remainingBig % monthsBig;
  if (basePerMonth <= 0n) {
    failApp('INVALID_INPUT', 400, 'Remaining balance is smaller than the requested number of installments');
  }

  // Supersede any existing ACTIVE schedule on this invoice cleanly
  await tx.query(
    `UPDATE app_installment_schedules
        SET status = 'SUPERSEDED', cancelled_at = now(), cancel_reason = 'Replaced by new installment schedule'
      WHERE clinic_id = $1 AND invoice_id = $2 AND status = 'ACTIVE'`,
    [actor.clinicId, inv.invoice_id],
  );

  const scheduleId = newEntityId('sch');
  const notes = typeof input.notes === 'string' ? input.notes.trim().slice(0, 500) : '';

  await tx.query(
    `INSERT INTO app_installment_schedules
       (schedule_id, clinic_id, invoice_id, patient_id, currency,
        invoice_net_minor, paid_at_creation_minor, financed_remaining_minor,
        months_count, start_due_date, status, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6::bigint, $7::bigint, $8::bigint, $9, $10::date, 'ACTIVE', $11, $12)`,
    [
      scheduleId,
      actor.clinicId,
      inv.invoice_id,
      inv.patient_id,
      inv.currency,
      netBig.toString(),
      paidBig.toString(),
      remainingBig.toString(),
      monthsCount,
      startDueDate,
      notes,
      actor.userId,
    ],
  );

  for (let i = 0; i < monthsCount; i++) {
    const dueDate = addCalendarMonths(startDueDate, i);
    const lineAmount = i === monthsCount - 1 ? basePerMonth + remainder : basePerMonth;
    await tx.query(
      `INSERT INTO app_installment_lines
         (installment_line_id, schedule_id, clinic_id, installment_no, due_date, amount_minor)
       VALUES ($1, $2, $3, $4, $5::date, $6::bigint)`,
      [
        newEntityId('isl'),
        scheduleId,
        actor.clinicId,
        i + 1,
        dueDate,
        lineAmount.toString(),
      ],
    );
  }

  await recordAuditEvent(tx, {
    clinicId: actor.clinicId,
    actorUserId: actor.userId,
    category: 'BILLING',
    action: 'CREATE_INSTALLMENT_SCHEDULE',
    entityType: 'installment_schedule',
    entityId: scheduleId,
    reason: notes || `Create ${monthsCount}-month installment schedule`,
    afterSnapshot: {
      invoiceId: inv.invoice_id,
      invoiceNetMinor: netBig.toString(),
      paidAtCreationMinor: paidBig.toString(),
      financedRemainingMinor: remainingBig.toString(),
      monthsCount,
      basePerMonthMinor: basePerMonth.toString(),
    },
  });

  return getInstallmentScheduleById(tx, actor, scheduleId, clinicToday);
}

export async function getInstallmentScheduleById(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  scheduleId: string,
  clinicToday: string,
): Promise<InstallmentScheduleView> {
  assertModulePermission(actor, 'billing', 'view');
  const res = await tx.query<{
    schedule_id: string;
    invoice_id: string;
    invoice_number: string;
    patient_id: string;
    currency: Currency;
    gross_minor: string;
    discount_minor: string;
    invoice_net_minor: string;
    paid_at_creation_minor: string;
    current_paid_minor: string;
    invoice_status: string;
    financed_remaining_minor: string;
    months_count: number;
    start_due_date: string;
    status: 'ACTIVE' | 'SUPERSEDED' | 'CANCELLED';
    notes: string;
  }>(
    `SELECT s.schedule_id, s.invoice_id, i.invoice_number::text, s.patient_id,
            s.currency, i.gross_minor::text, i.discount_minor::text,
            s.invoice_net_minor::text, s.paid_at_creation_minor::text,
            i.paid_minor::text AS current_paid_minor, i.status AS invoice_status,
            s.financed_remaining_minor::text, s.months_count,
            s.start_due_date::text AS start_due_date, s.status, s.notes
       FROM app_installment_schedules s
       JOIN app_invoices i ON i.invoice_id = s.invoice_id
      WHERE s.clinic_id = $1 AND s.schedule_id = $2`,
    [actor.clinicId, scheduleId],
  );
  const s = res.rows[0];
  if (!s) failApp('NOT_FOUND', 404, 'Installment schedule not found');
  await assertPatientAccess(tx, actor, s.patient_id, clinicToday);

  const linesRes = await tx.query<{
    installment_no: number;
    due_date: string;
    amount_minor: string;
  }>(
    `SELECT installment_no, due_date::text AS due_date, amount_minor::text
       FROM app_installment_lines
      WHERE clinic_id = $1 AND schedule_id = $2
      ORDER BY installment_no ASC`,
    [actor.clinicId, scheduleId],
  );

  // Subsequent receipts collected AFTER schedule creation allocate FIFO across installment lines
  const currentPaidBig = BigInt(s.current_paid_minor);
  const paidAtCreationBig = BigInt(s.paid_at_creation_minor);
  let subsequentPool = currentPaidBig > paidAtCreationBig ? currentPaidBig - paidAtCreationBig : 0n;

  const computedLines: InstallmentLineView[] = linesRes.rows.map(line => {
    const amt = BigInt(line.amount_minor);
    const allocated = subsequentPool >= amt ? amt : subsequentPool;
    subsequentPool -= allocated;
    const rem = amt - allocated;
    const lineStatus: 'PAID' | 'PARTIAL' | 'PENDING' =
      rem === 0n ? 'PAID' : allocated > 0n ? 'PARTIAL' : 'PENDING';
    return {
      installmentNo: line.installment_no,
      dueDate: line.due_date.slice(0, 10),
      amountMinor: amt.toString(),
      paidMinor: allocated.toString(),
      remainingMinor: rem.toString(),
      lineStatus,
    };
  });

  const currentRemaining =
    s.invoice_status === 'VOIDED'
      ? 0n
      : BigInt(s.invoice_net_minor) - currentPaidBig;

  return {
    scheduleId: s.schedule_id,
    invoiceId: s.invoice_id,
    invoiceNumber: Number(s.invoice_number),
    patientId: s.patient_id,
    currency: s.currency,
    invoiceGrossMinor: s.gross_minor,
    invoiceDiscountMinor: s.discount_minor,
    invoiceNetMinor: s.invoice_net_minor,
    paidAtCreationMinor: s.paid_at_creation_minor,
    currentInvoicePaidMinor: s.current_paid_minor,
    currentInvoiceRemainingMinor: currentRemaining.toString(),
    financedRemainingMinor: s.financed_remaining_minor,
    monthsCount: s.months_count,
    startDueDate: s.start_due_date.slice(0, 10),
    status: s.status,
    notes: s.notes,
    lines: computedLines,
  };
}

export async function getPatientStatement(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  patientId: string,
  clinicToday: string,
): Promise<PatientStatementView> {
  assertModulePermission(actor, 'billing', 'view');
  const patient = await getPatientById(tx, actor, patientId, clinicToday);

  const invIdsRes = await tx.query<{ invoice_id: string }>(
    `SELECT invoice_id FROM app_invoices
      WHERE clinic_id = $1 AND patient_id = $2
      ORDER BY issued_date ASC, invoice_number ASC`,
    [actor.clinicId, patientId],
  );
  const invoices: InvoiceView[] = [];
  for (const r of invIdsRes.rows) {
    invoices.push(await getInvoiceById(tx, actor, r.invoice_id, clinicToday));
  }

  const rcpIdsRes = await tx.query<{ receipt_id: string }>(
    `SELECT receipt_id FROM app_receipts
      WHERE clinic_id = $1 AND patient_id = $2
      ORDER BY receipt_date ASC, receipt_number ASC`,
    [actor.clinicId, patientId],
  );
  const receipts: ReceiptView[] = [];
  for (const r of rcpIdsRes.rows) {
    receipts.push(await getReceiptById(tx, actor, r.receipt_id, clinicToday));
  }

  const schIdsRes = await tx.query<{ schedule_id: string }>(
    `SELECT schedule_id FROM app_installment_schedules
      WHERE clinic_id = $1 AND patient_id = $2 AND status = 'ACTIVE'
      ORDER BY created_at ASC`,
    [actor.clinicId, patientId],
  );
  const activeSchedules: InstallmentScheduleView[] = [];
  for (const r of schIdsRes.rows) {
    activeSchedules.push(await getInstallmentScheduleById(tx, actor, r.schedule_id, clinicToday));
  }

  // Group financial totals strictly per currency — never mix currencies silently!
  const bucketMap = new Map<
    Currency,
    { opening: bigint; invoiced: bigint; collected: bigint }
  >();
  const ensureBucket = (c: Currency) => {
    let b = bucketMap.get(c);
    if (!b) {
      b = { opening: 0n, invoiced: 0n, collected: 0n };
      bucketMap.set(c, b);
    }
    return b;
  };

  if (BigInt(patient.openingBalanceMinor) > 0n) {
    ensureBucket(patient.openingBalanceCurrency).opening += BigInt(patient.openingBalanceMinor);
  }
  for (const inv of invoices) {
    if (inv.status !== 'VOIDED') {
      const b = ensureBucket(inv.currency);
      b.invoiced += BigInt(inv.netMinor);
      b.collected += BigInt(inv.paidMinor);
    }
  }
  if (bucketMap.size === 0) {
    ensureBucket(patient.openingBalanceCurrency);
  }

  const currencyBuckets: CurrencySummaryBucket[] = [...bucketMap.entries()].map(([curr, b]) => ({
    currency: curr,
    openingBalanceMinor: b.opening.toString(),
    invoicedNetMinor: b.invoiced.toString(),
    collectedNetMinor: b.collected.toString(),
    outstandingMinor: (b.opening + b.invoiced - b.collected).toString(),
  }));

  return {
    patientId: patient.patientId,
    fileNumber: patient.fileNumber,
    fullName: patient.fullName,
    phone: patient.phone,
    primaryDoctorName: patient.primaryDoctorName,
    generatedOnDate: clinicToday,
    currencyBuckets,
    invoices,
    receipts,
    activeSchedules,
  };
}

export async function recordPrintLog(
  tx: DbExecutor,
  actor: AuthenticatedActor,
  input: {
    docType: 'INVOICE_A4' | 'RECEIPT_A6' | 'STATEMENT_A4' | 'LAB_ORDER_A5';
    entityId: string;
    patientId: string | null;
  },
): Promise<{ copyOrdinal: number; isReprint: boolean }> {
  const prior = await tx.query<{ cnt: string }>(
    `SELECT count(*)::text AS cnt
       FROM app_print_logs
      WHERE clinic_id = $1 AND doc_type = $2 AND entity_id = $3`,
    [actor.clinicId, input.docType, input.entityId],
  );
  const copyOrdinal = Number(prior.rows[0]?.cnt ?? '0') + 1;
  const isReprint = copyOrdinal > 1;

  await tx.query(
    `INSERT INTO app_print_logs
       (print_id, clinic_id, doc_type, entity_id, patient_id, copy_ordinal, is_reprint, printed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      newEntityId('prt'),
      actor.clinicId,
      input.docType,
      input.entityId,
      input.patientId,
      copyOrdinal,
      isReprint,
      actor.userId,
    ],
  );

  return { copyOrdinal, isReprint };
}
