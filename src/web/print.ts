import type { ClinicOperationalSettings } from '../modules/governance/index.ts';
import type { PatientRecord } from '../modules/patients/index.ts';
import type {
  InvoiceView,
  PatientStatementView,
  ReceiptView,
} from '../modules/billing/index.ts';
import type { LabOrderView } from '../modules/lab-inventory/index.ts';
import { bdiLtr, html, moneySpan, trustedHtml, type SafeHtml } from './html.ts';

export interface PrintShellMeta {
  readonly lang: 'ar' | 'en';
  readonly cspNonce: string;
  readonly pageSize: 'A4' | 'A6' | 'A5';
  readonly docTitleAr: string;
  readonly docTitleEn: string;
  readonly docRef: string;
  readonly copyOrdinal: number;
  readonly isReprint: boolean;
  readonly voidOrReversalBanner?: string | null;
  readonly settings: ClinicOperationalSettings;
}

function renderPrintLayout(meta: PrintShellMeta, bodyContent: SafeHtml): string {
  const isAr = meta.lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const pageRule =
    meta.pageSize === 'A6'
      ? '@page { size: 105mm 148mm; margin: 7mm 8mm; }'
      : meta.pageSize === 'A5'
        ? '@page { size: A5 portrait; margin: 10mm 12mm; }'
        : '@page { size: A4 portrait; margin: 12mm 14mm; }';

  const watermarkWidth = meta.pageSize === 'A6' ? '58mm' : meta.pageSize === 'A5' ? '85mm' : '118mm';
  const docTitle = isAr ? meta.docTitleAr : meta.docTitleEn;
  const copyBadge = meta.isReprint
    ? isAr
      ? `نسخة معاد طباعتها (#${meta.copyOrdinal})`
      : `REPRINT COPY (#${meta.copyOrdinal})`
    : isAr
      ? 'النسخة الأصلية'
      : 'ORIGINAL';

  const doc = html`<!DOCTYPE html>
<html lang="${meta.lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${docTitle} — ${meta.docRef}</title>
  <link rel="icon" href="/public/favicon.png" />
  <style nonce="${meta.cspNonce}">
    ${trustedHtml(pageRule)}
    :root {
      --navy-950: #0d2137;
      --navy-800: #1a3a5c;
      --orange-500: #f5922e;
      --ink-900: #111827;
      --ink-600: #4b5563;
      --line-light: #d5dde7;
      --line-strong: #1a3a5c;
      --wm-opacity: ${String(meta.settings.print.watermarkOpacity)};
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #eef2f7;
      color: var(--ink-900);
      font-family: "Cairo", "Tajawal", "Segoe UI", Tahoma, Arial, sans-serif;
      font-size: ${meta.pageSize === 'A6' ? '10.5px' : '12.5px'};
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .screen-toolbar {
      max-width: 210mm;
      margin: 12px auto 0;
      padding: 8px 14px;
      background: var(--navy-950);
      color: #fff;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .screen-toolbar button, .screen-toolbar a {
      background: var(--orange-500);
      color: #0d2137;
      font-weight: 700;
      border: none;
      border-radius: 4px;
      padding: 6px 14px;
      cursor: pointer;
      text-decoration: none;
      font-size: 12px;
    }
    .print-sheet {
      position: relative;
      background: #ffffff;
      width: ${meta.pageSize === 'A6' ? '105mm' : meta.pageSize === 'A5' ? '148mm' : '210mm'};
      min-height: ${meta.pageSize === 'A6' ? '148mm' : meta.pageSize === 'A5' ? '210mm' : '297mm'};
      margin: 12px auto 28px;
      padding: ${meta.pageSize === 'A6' ? '7mm 8mm' : '12mm 14mm'};
      box-shadow: 0 6px 24px rgba(13, 33, 55, 0.10);
      overflow: visible;
    }
    .print-watermark {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      user-select: none;
      z-index: 0;
    }
    .print-watermark img {
      width: ${watermarkWidth};
      max-width: 72%;
      height: auto;
      object-fit: contain;
      opacity: var(--wm-opacity);
    }
    .print-content {
      position: relative;
      z-index: 1;
    }
    .letterhead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--navy-800);
      position: relative;
    }
    .letterhead::after {
      content: "";
      position: absolute;
      bottom: -4px;
      inset-inline-start: 0;
      width: 38%;
      height: 2px;
      background: var(--orange-500);
    }
    .lh-side { flex: 1; }
    .lh-side.en { text-align: end; direction: ltr; }
    .lh-title {
      font-size: ${meta.pageSize === 'A6' ? '11.5px' : '15px'};
      font-weight: 800;
      color: var(--navy-950);
      margin: 0;
    }
    .lh-sub {
      font-size: ${meta.pageSize === 'A6' ? '9px' : '11px'};
      color: var(--ink-600);
      margin: 2px 0 0;
    }
    .lh-logo {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lh-logo img {
      height: ${meta.pageSize === 'A6' ? '34px' : '54px'};
      width: auto;
      object-fit: contain;
    }
    .doc-banner {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin: 12px 0 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--line-light);
    }
    .doc-banner h1 {
      font-size: ${meta.pageSize === 'A6' ? '13px' : '17px'};
      font-weight: 800;
      color: var(--navy-950);
      margin: 0;
    }
    .doc-badges {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
    }
    .copy-mark {
      padding: 2px 8px;
      border: 1px solid var(--line-strong);
      color: var(--navy-950);
      font-weight: 700;
      border-radius: 3px;
    }
    .copy-mark.reprint {
      border-color: #b45309;
      color: #92400e;
      background: #fffbeb;
    }
    .void-stamp {
      margin: 8px 0;
      padding: 6px 12px;
      border: 1.5px solid #b91c1c;
      color: #991b1b;
      background: #fef2f2;
      font-weight: 800;
      text-align: center;
      letter-spacing: 0.03em;
    }
    .meta-strip {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: ${meta.pageSize === 'A6' ? '10px' : '12px'};
    }
    .meta-strip td {
      padding: 4px 6px;
      border-bottom: 1px solid #e5ebf3;
      vertical-align: baseline;
    }
    .meta-label {
      color: var(--ink-600);
      font-weight: 600;
      width: 18%;
      white-space: nowrap;
    }
    .meta-val {
      color: var(--ink-900);
      font-weight: 700;
      width: 32%;
    }
    .section-heading {
      font-size: 13px;
      font-weight: 800;
      color: var(--navy-950);
      margin: 14px 0 6px;
      padding-bottom: 3px;
      border-bottom: 1px solid var(--navy-800);
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 12px;
      font-variant-numeric: tabular-nums;
    }
    table.data-table thead {
      display: table-header-group;
    }
    table.data-table tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    table.data-table th {
      text-align: start;
      padding: 6px 8px;
      font-size: ${meta.pageSize === 'A6' ? '9.5px' : '11.5px'};
      font-weight: 800;
      color: var(--navy-950);
      border-top: 1.5px solid var(--navy-800);
      border-bottom: 1.5px solid var(--navy-800);
      background: rgba(242, 246, 251, 0.72);
    }
    table.data-table td {
      padding: 5px 8px;
      border-bottom: 1px solid var(--line-light);
      font-size: ${meta.pageSize === 'A6' ? '9.5px' : '11.5px'};
      vertical-align: top;
    }
    table.data-table th.num, table.data-table td.num {
      text-align: end;
      white-space: nowrap;
    }
    .closing-block {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-top: 12px;
    }
    .totals-table {
      width: ${meta.pageSize === 'A6' ? '100%' : '54%'};
      margin-inline-start: auto;
      border-collapse: collapse;
      font-variant-numeric: tabular-nums;
    }
    .totals-table td {
      padding: 5px 8px;
      border-bottom: 1px solid var(--line-light);
    }
    .totals-table tr.grand td {
      font-weight: 800;
      font-size: ${meta.pageSize === 'A6' ? '11.5px' : '13.5px'};
      color: var(--navy-950);
      border-top: 1.5px solid var(--navy-800);
      border-bottom: 2px double var(--navy-800);
    }
    .terms-list {
      margin: 8px 0;
      padding-inline-start: 18px;
      font-size: 11px;
      color: #374151;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-top: ${meta.pageSize === 'A6' ? '14px' : '26px'};
      padding-top: 8px;
      font-size: ${meta.pageSize === 'A6' ? '9.5px' : '11.5px'};
    }
    .sig-col {
      flex: 1;
      text-align: center;
    }
    .sig-line {
      margin-top: ${meta.pageSize === 'A6' ? '18px' : '30px'};
      border-top: 1px dashed #6b7280;
      padding-top: 4px;
      color: var(--ink-600);
    }
    .tabular-ltr, .money-amount {
      font-variant-numeric: tabular-nums;
      unicode-bidi: isolate;
    }
    .currency-code {
      font-size: 0.88em;
      color: var(--ink-600);
      font-weight: 700;
    }
    @media print {
      html, body { background: #ffffff; }
      .screen-toolbar { display: none !important; }
      .print-sheet {
        width: 100%;
        min-height: auto;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
      .print-watermark {
        position: fixed;
        inset: 0;
      }
    }
  </style>
</head>
<body>
  <div class="screen-toolbar">
    <span>${docTitle} — ${bdiLtr(meta.docRef)}</span>
    <div>
      <button type="button" id="btn-print-trigger">${isAr ? 'طباعة رسمية / PDF' : 'Print / Save PDF'}</button>
    </div>
  </div>
  <main class="print-sheet">
    <div class="print-watermark" aria-hidden="true">
      <img src="/public/logo.png" alt="" />
    </div>
    <div class="print-content">
      <header class="letterhead">
        <div class="lh-side ar">
          <p class="lh-title">${meta.settings.print.clinicTitleAr}</p>
          <p class="lh-sub">${meta.settings.print.clinicAddressAr} · ${bdiLtr(meta.settings.print.clinicPhone)}</p>
        </div>
        <div class="lh-logo">
          <img src="/public/logo.png" alt="Aqlan Dental Center" />
        </div>
        ${
          meta.pageSize === 'A6'
            ? html``
            : html`<div class="lh-side en">
                <p class="lh-title">${meta.settings.print.clinicTitleEn}</p>
                <p class="lh-sub">${meta.settings.print.clinicAddressEn}</p>
              </div>`
        }
      </header>
      <div class="doc-banner">
        <h1>${docTitle}</h1>
        <div class="doc-badges">
          <span>${bdiLtr(meta.docRef)}</span>
          <span class="copy-mark ${meta.isReprint ? 'reprint' : ''}">${copyBadge}</span>
        </div>
      </div>
      ${meta.voidOrReversalBanner ? html`<div class="void-stamp">${meta.voidOrReversalBanner}</div>` : html``}
      ${bodyContent}
    </div>
  </main>
  <script nonce="${meta.cspNonce}">
    document.getElementById('btn-print-trigger')?.addEventListener('click', function () { window.print(); });
  </script>
</body>
</html>`;

  return doc.__html;
}

export function renderOfficialInvoiceA4(params: {
  lang: 'ar' | 'en';
  cspNonce: string;
  settings: ClinicOperationalSettings;
  patient: PatientRecord;
  invoice: InvoiceView;
  copyOrdinal: number;
  isReprint: boolean;
}): string {
  const { lang, invoice, patient } = params;
  const isAr = lang === 'ar';

  const rows = invoice.lines.map(
    (line, idx) => html`<tr>
      <td>${bdiLtr(idx + 1)}</td>
      <td>${isAr ? line.descriptionAr : line.descriptionEn}</td>
      <td>${line.fdiTooth ? bdiLtr(`#${line.fdiTooth}`) : '—'}</td>
      <td class="num">${bdiLtr(line.quantity)}</td>
      <td class="num">${moneySpan(line.unitPriceMinor, invoice.currency, lang)}</td>
      <td class="num">${moneySpan(line.lineTotalMinor, invoice.currency, lang)}</td>
    </tr>`,
  );

  const body = html`
    <table class="meta-strip">
      <tr>
        <td class="meta-label">${isAr ? 'اسم المريض:' : 'Patient:'}</td>
        <td class="meta-val">${patient.fullName}</td>
        <td class="meta-label">${isAr ? 'رقم الملف:' : 'File No:'}</td>
        <td class="meta-val">${bdiLtr(patient.fileNumber)}</td>
      </tr>
      <tr>
        <td class="meta-label">${isAr ? 'الطبيب المعالج:' : 'Doctor:'}</td>
        <td class="meta-val">${invoice.doctorName ?? patient.primaryDoctorName ?? '—'}</td>
        <td class="meta-label">${isAr ? 'تاريخ الإصدار:' : 'Issue Date:'}</td>
        <td class="meta-val">${bdiLtr(invoice.issuedDate)}</td>
      </tr>
    </table>

    <table class="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>${isAr ? 'البيان العلاجي' : 'Procedure / Description'}</th>
          <th>${isAr ? 'السن (FDI)' : 'Tooth'}</th>
          <th class="num">${isAr ? 'العدد' : 'Qty'}</th>
          <th class="num">${isAr ? 'سعر الوحدة' : 'Unit Fee'}</th>
          <th class="num">${isAr ? 'الإجمالي' : 'Line Total'}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="closing-block">
      <table class="totals-table">
        <tr>
          <td>${isAr ? 'إجمالي الفاتورة قبل الخصم' : 'Gross Total'}</td>
          <td class="num">${moneySpan(invoice.grossMinor, invoice.currency, lang)}</td>
        </tr>
        <tr>
          <td>${isAr ? 'الخصم الممنوح' : 'Discount'}</td>
          <td class="num">${moneySpan(invoice.discountMinor, invoice.currency, lang)}</td>
        </tr>
        <tr class="grand">
          <td>${isAr ? 'الصافي المعتمد' : 'Net Approved'}</td>
          <td class="num">${moneySpan(invoice.netMinor, invoice.currency, lang)}</td>
        </tr>
        <tr>
          <td>${isAr ? 'المسدد الفعلي' : 'Collected Paid'}</td>
          <td class="num">${moneySpan(invoice.paidMinor, invoice.currency, lang)}</td>
        </tr>
        <tr class="grand">
          <td>${isAr ? 'المتبقي المستحق' : 'Remaining Balance'}</td>
          <td class="num">${moneySpan(invoice.remainingMinor, invoice.currency, lang)}</td>
        </tr>
      </table>

      <div class="signatures">
        <div class="sig-col">
          <div class="sig-line">${isAr ? 'توقيع المحاسب / الاستقبال' : 'Cashier / Reception'}</div>
        </div>
        <div class="sig-col">
          <div class="sig-line">${isAr ? 'توقيع المريض / ولي الأمر' : 'Patient / Guardian'}</div>
        </div>
      </div>
    </div>
  `;

  return renderPrintLayout(
    {
      lang,
      cspNonce: params.cspNonce,
      pageSize: 'A4',
      docTitleAr: 'فاتورة علاجية رسمية',
      docTitleEn: 'OFFICIAL CLINICAL INVOICE',
      docRef: `INV-${invoice.invoiceNumber}`,
      copyOrdinal: params.copyOrdinal,
      isReprint: params.isReprint,
      voidOrReversalBanner:
        invoice.status === 'VOIDED'
          ? isAr
            ? `فاتورة ملغاة رسمياً — السبب: ${invoice.voidReason ?? ''}`
            : `VOIDED INVOICE — Reason: ${invoice.voidReason ?? ''}`
          : null,
      settings: params.settings,
    },
    body,
  );
}

export function renderOfficialReceiptA6(params: {
  lang: 'ar' | 'en';
  cspNonce: string;
  settings: ClinicOperationalSettings;
  patient: PatientRecord;
  receipt: ReceiptView;
  invoice: InvoiceView;
  copyOrdinal: number;
  isReprint: boolean;
}): string {
  const { lang, receipt, patient, invoice } = params;
  const isAr = lang === 'ar';

  const fxRow = receipt.fxSnapshot
    ? html`<tr>
        <td>${isAr ? 'مقابل الفاتورة (بسعر الصرف المعتمد)' : 'Allocated to Invoice (Governed FX)'}</td>
        <td class="num">${moneySpan(receipt.allocatedInvoiceMinor, receipt.invoiceCurrency, lang)}</td>
      </tr>`
    : html``;

  const body = html`
    <table class="meta-strip">
      <tr>
        <td class="meta-label">${isAr ? 'المريض:' : 'Patient:'}</td>
        <td class="meta-val">${patient.fullName} (${bdiLtr(`#${patient.fileNumber}`)})</td>
      </tr>
      <tr>
        <td class="meta-label">${isAr ? 'التاريخ:' : 'Date:'}</td>
        <td class="meta-val">${bdiLtr(receipt.receiptDate)} · ${bdiLtr(receipt.paymentMethod)}</td>
      </tr>
      <tr>
        <td class="meta-label">${isAr ? 'مرجع الفاتورة:' : 'Invoice Ref:'}</td>
        <td class="meta-val">${bdiLtr(`INV-${receipt.invoiceNumber}`)}</td>
      </tr>
      <tr>
        <td class="meta-label">${isAr ? 'البيان:' : 'Reason:'}</td>
        <td class="meta-val">${receipt.reason}</td>
      </tr>
    </table>

    <div class="closing-block">
      <table class="totals-table">
        <tr class="grand">
          <td>${isAr ? 'المبلغ المقبوض' : 'Amount Received'}</td>
          <td class="num">${moneySpan(receipt.paymentMinor, receipt.paymentCurrency, lang)}</td>
        </tr>
        ${fxRow}
        <tr>
          <td>${isAr ? 'المتبقي على الفاتورة بعد السند' : 'Invoice Remaining Balance'}</td>
          <td class="num">${moneySpan(invoice.remainingMinor, invoice.currency, lang)}</td>
        </tr>
      </table>

      <div class="signatures">
        <div class="sig-col">
          <div class="sig-line">${isAr ? 'أمين الصندوق' : 'Cashier'}: ${receipt.recordedByName}</div>
        </div>
        <div class="sig-col">
          <div class="sig-line">${isAr ? 'المستلم / المريض' : 'Patient'}</div>
        </div>
      </div>
    </div>
  `;

  return renderPrintLayout(
    {
      lang,
      cspNonce: params.cspNonce,
      pageSize: 'A6',
      docTitleAr: receipt.kind === 'REVERSAL' ? 'سند عكس قيد مالي' : 'سند قبض رسمي',
      docTitleEn: receipt.kind === 'REVERSAL' ? 'OFFICIAL RECEIPT REVERSAL' : 'OFFICIAL PAYMENT RECEIPT',
      docRef: `RCP-${receipt.receiptNumber}`,
      copyOrdinal: params.copyOrdinal,
      isReprint: params.isReprint,
      voidOrReversalBanner:
        receipt.kind === 'REVERSAL'
          ? isAr
            ? 'سند عكسي معتمد لإلغاء أثر سند سابق'
            : 'APPROVED REVERSAL VOUCHER'
          : null,
      settings: params.settings,
    },
    body,
  );
}

export function renderOfficialStatementAndScheduleA4(params: {
  lang: 'ar' | 'en';
  cspNonce: string;
  settings: ClinicOperationalSettings;
  statement: PatientStatementView;
  copyOrdinal: number;
  isReprint: boolean;
}): string {
  const { lang, statement } = params;
  const isAr = lang === 'ar';

  const summaryRows = statement.currencyBuckets.map(
    b => html`<tr>
      <td><strong>${bdiLtr(b.currency)}</strong></td>
      <td class="num">${moneySpan(b.openingBalanceMinor, b.currency, lang)}</td>
      <td class="num">${moneySpan(b.invoicedNetMinor, b.currency, lang)}</td>
      <td class="num">${moneySpan(b.collectedNetMinor, b.currency, lang)}</td>
      <td class="num"><strong>${moneySpan(b.outstandingMinor, b.currency, lang)}</strong></td>
    </tr>`,
  );

  const ledgerRows = [
    ...statement.invoices.map(
      inv => html`<tr>
        <td>${bdiLtr(inv.issuedDate)}</td>
        <td>${bdiLtr(`INV-${inv.invoiceNumber}`)}</td>
        <td>${isAr ? 'فاتورة علاجية' : 'Clinical Invoice'} (${bdiLtr(inv.status)})</td>
        <td class="num">${inv.status === 'VOIDED' ? '—' : moneySpan(inv.netMinor, inv.currency, lang)}</td>
        <td class="num">—</td>
      </tr>`,
    ),
    ...statement.receipts.map(
      rcp => html`<tr>
        <td>${bdiLtr(rcp.receiptDate)}</td>
        <td>${bdiLtr(`RCP-${rcp.receiptNumber}`)}</td>
        <td>${rcp.kind === 'REVERSAL' ? (isAr ? 'عكس سند قبض' : 'Receipt Reversal') : isAr ? 'سند قبض' : 'Payment Receipt'} — ${rcp.reason}</td>
        <td class="num">${rcp.kind === 'REVERSAL' ? moneySpan(rcp.allocatedInvoiceMinor, rcp.invoiceCurrency, lang) : '—'}</td>
        <td class="num">${rcp.kind === 'COLLECTION' ? moneySpan(rcp.allocatedInvoiceMinor, rcp.invoiceCurrency, lang) : '—'}</td>
      </tr>`,
    ),
  ];

  const schedulesHtml = statement.activeSchedules.map(sch => {
    const lineRows = sch.lines.map(
      l => html`<tr>
        <td>${bdiLtr(l.installmentNo)}</td>
        <td>${bdiLtr(l.dueDate)}</td>
        <td class="num">${moneySpan(l.amountMinor, sch.currency, lang)}</td>
        <td class="num">${moneySpan(l.paidMinor, sch.currency, lang)}</td>
        <td class="num">${moneySpan(l.remainingMinor, sch.currency, lang)}</td>
        <td>${l.lineStatus === 'PAID' ? (isAr ? 'مسدد' : 'Paid') : l.lineStatus === 'PARTIAL' ? (isAr ? 'جزئي' : 'Partial') : isAr ? 'مستحق' : 'Scheduled'}</td>
      </tr>`,
    );

    return html`
      <h2 class="section-heading">
        ${isAr ? 'اتفاقية وجدول الأقساط الشهري المعتمد — مرجع الفاتورة' : 'Approved Installment Agreement & Schedule — Invoice'}
        ${bdiLtr(`INV-${sch.invoiceNumber}`)}
      </h2>
      <table class="meta-strip">
        <tr>
          <td class="meta-label">${isAr ? 'إجمالي الاتفاق:' : 'Agreement Gross:'}</td>
          <td class="meta-val">${moneySpan(sch.invoiceGrossMinor, sch.currency, lang)}</td>
          <td class="meta-label">${isAr ? 'الخصم:' : 'Discount:'}</td>
          <td class="meta-val">${moneySpan(sch.invoiceDiscountMinor, sch.currency, lang)}</td>
        </tr>
        <tr>
          <td class="meta-label">${isAr ? 'صافي الاتفاق:' : 'Net Agreement:'}</td>
          <td class="meta-val">${moneySpan(sch.invoiceNetMinor, sch.currency, lang)}</td>
          <td class="meta-label">${isAr ? 'المسدد الفعلي حتى تاريخه:' : 'Total Collected to Date:'}</td>
          <td class="meta-val">${moneySpan(sch.currentInvoicePaidMinor, sch.currency, lang)}</td>
        </tr>
        <tr>
          <td class="meta-label">${isAr ? 'المتبقي المقسّط عند الجدولة:' : 'Financed Remaining:'}</td>
          <td class="meta-val">${moneySpan(sch.financedRemainingMinor, sch.currency, lang)}</td>
          <td class="meta-label">${isAr ? 'المتبقي الفعلي الحالي:' : 'Current Remaining:'}</td>
          <td class="meta-val">${moneySpan(sch.currentInvoiceRemainingMinor, sch.currency, lang)}</td>
        </tr>
      </table>

      <table class="data-table">
        <thead>
          <tr>
            <th>${isAr ? 'رقم القسط' : 'No.'}</th>
            <th>${isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
            <th class="num">${isAr ? 'قيمة القسط' : 'Installment'}</th>
            <th class="num">${isAr ? 'المسدد من القسط' : 'Paid'}</th>
            <th class="num">${isAr ? 'المتبقي من القسط' : 'Remaining'}</th>
            <th>${isAr ? 'الحالة' : 'Status'}</th>
          </tr>
        </thead>
        <tbody>${lineRows}</tbody>
      </table>
    `;
  });

  const body = html`
    <table class="meta-strip">
      <tr>
        <td class="meta-label">${isAr ? 'اسم المريض:' : 'Patient Name:'}</td>
        <td class="meta-val">${statement.fullName}</td>
        <td class="meta-label">${isAr ? 'رقم الملف:' : 'File Number:'}</td>
        <td class="meta-val">${bdiLtr(statement.fileNumber)}</td>
      </tr>
      <tr>
        <td class="meta-label">${isAr ? 'الطبيب المعالج:' : 'Primary Doctor:'}</td>
        <td class="meta-val">${statement.primaryDoctorName ?? '—'}</td>
        <td class="meta-label">${isAr ? 'تاريخ الكشف:' : 'Statement Date:'}</td>
        <td class="meta-val">${bdiLtr(statement.generatedOnDate)}</td>
      </tr>
    </table>

    <h2 class="section-heading">${isAr ? 'الملخص المالي حسب العملة' : 'Financial Summary by Currency'}</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>${isAr ? 'العملة' : 'Currency'}</th>
          <th class="num">${isAr ? 'رصيد افتتاحي' : 'Opening'}</th>
          <th class="num">${isAr ? 'صافي الفواتير' : 'Net Billed'}</th>
          <th class="num">${isAr ? 'صافي المسدد' : 'Net Collected'}</th>
          <th class="num">${isAr ? 'الرصيد المتبقي' : 'Outstanding'}</th>
        </tr>
      </thead>
      <tbody>${summaryRows}</tbody>
    </table>

    <h2 class="section-heading">${isAr ? 'سجل الفواتير وسندات القبض المعتمدة' : 'Approved Invoices & Receipts Ledger'}</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>${isAr ? 'التاريخ' : 'Date'}</th>
          <th>${isAr ? 'المرجع' : 'Reference'}</th>
          <th>${isAr ? 'البيان' : 'Description'}</th>
          <th class="num">${isAr ? 'مدين (علينا/عليه)' : 'Debit'}</th>
          <th class="num">${isAr ? 'دائن (مسدد)' : 'Credit'}</th>
        </tr>
      </thead>
      <tbody>${ledgerRows}</tbody>
    </table>

    ${schedulesHtml}

    <div class="closing-block">
      <ul class="terms-list">
        <li>${isAr ? 'يُحتسب جدول الأقساط حصراً من صافي الرصيد المتبقي بعد خصم السندات المعتمدة دون تكرار خصم الدفعة الأولى.' : 'Installments are computed strictly on the net remaining balance after approved receipts without double-deducting prior payments.'}</li>
        <li>${isAr ? 'لا يُعتد بأي سداد نقدي أو تحويلي إلا بموجب سند قبض رسمي صادر من النظام.' : 'Payments are recognized solely through official system-issued receipts.'}</li>
      </ul>
      <div class="signatures">
        <div class="sig-col">
          <div class="sig-line">${isAr ? 'إدارة الحسابات — مركز د. عقلان الكامل' : 'Accounts Department'}</div>
        </div>
        <div class="sig-col">
          <div class="sig-line">${isAr ? 'توقيع المريض / ولي الأمر بالمصادقة' : 'Patient / Guardian Acknowledgment'}</div>
        </div>
      </div>
    </div>
  `;

  return renderPrintLayout(
    {
      lang,
      cspNonce: params.cspNonce,
      pageSize: 'A4',
      docTitleAr: 'كشف حساب المريض واتفاقية الأقساط الرسمية',
      docTitleEn: 'OFFICIAL PATIENT STATEMENT & INSTALLMENT SCHEDULE',
      docRef: `STM-${statement.fileNumber}`,
      copyOrdinal: params.copyOrdinal,
      isReprint: params.isReprint,
      settings: params.settings,
    },
    body,
  );
}

export function renderOfficialLabSlipA5(params: {
  lang: 'ar' | 'en';
  cspNonce: string;
  settings: ClinicOperationalSettings;
  labOrder: LabOrderView;
  copyOrdinal: number;
  isReprint: boolean;
}): string {
  const { lang, labOrder } = params;
  const isAr = lang === 'ar';

  const body = html`
    <table class="meta-strip">
      <tr>
        <td class="meta-label">${isAr ? 'معرّف المريض للمعمل:' : 'Patient Lab Ref:'}</td>
        <td class="meta-val">${labOrder.patientDisplayLabel}</td>
        <td class="meta-label">${isAr ? 'المعمل الخارجي:' : 'External Lab:'}</td>
        <td class="meta-val">${labOrder.labName}</td>
      </tr>
      <tr>
        <td class="meta-label">${isAr ? 'الطبيب المعالج:' : 'Doctor:'}</td>
        <td class="meta-val">${labOrder.doctorName}</td>
        <td class="meta-label">${isAr ? 'درجة اللون:' : 'Shade:'}</td>
        <td class="meta-val">${bdiLtr(labOrder.shade)}</td>
      </tr>
      <tr>
        <td class="meta-label">${isAr ? 'تاريخ الإرسال:' : 'Sent Date:'}</td>
        <td class="meta-val">${bdiLtr(labOrder.orderedDate)}</td>
        <td class="meta-label">${isAr ? 'تاريخ التسليم المطلوب:' : 'Due Date:'}</td>
        <td class="meta-val">${bdiLtr(labOrder.dueDate)}</td>
      </tr>
    </table>

    <h2 class="section-heading">${isAr ? 'تفاصيل العمل المخبري المطلوب' : 'Requested Prosthetic / Orthodontic Work'}</h2>
    <p>${labOrder.workDescription}</p>

    <div class="closing-block">
      <div class="signatures">
        <div class="sig-col">
          <div class="sig-line">${isAr ? 'توقيع الطبيب المعالج' : 'Clinician Signature'}</div>
        </div>
        <div class="sig-col">
          <div class="sig-line">${isAr ? 'استلام مندوب المعمل' : 'Lab Representative'}</div>
        </div>
      </div>
    </div>
  `;

  return renderPrintLayout(
    {
      lang,
      cspNonce: params.cspNonce,
      pageSize: 'A5',
      docTitleAr: 'أمر عمل معمل خارجي',
      docTitleEn: 'EXTERNAL DENTAL LAB ORDER SLIP',
      docRef: `LAB-${labOrder.orderNumber}`,
      copyOrdinal: params.copyOrdinal,
      isReprint: params.isReprint,
      settings: params.settings,
    },
    body,
  );
}
