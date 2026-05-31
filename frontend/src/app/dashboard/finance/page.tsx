'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import type {
  PatientDto,
  DoctorDto,
  ContractDto,
  CreateContractRequest,
  InvoiceDto,
  CreateInvoiceRequest,
  PaymentDto,
  CreatePaymentRequest,
  FinanceDashboardDto,
  CashierSessionDto,
  PagedResult,
} from '@/types/api';
import {
  ContractStatusLabels,
  InvoiceStatusLabels,
  PaymentMethodLabels,
} from '@/types/api';

type TabKey = 'overview' | 'invoices' | 'payments' | 'contracts';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'نظرة عامة' },
  { key: 'invoices', label: 'الفواتير' },
  { key: 'payments', label: 'المدفوعات' },
  { key: 'contracts', label: 'العقود' },
];

const invoiceStatusColors: Record<number, string> = {
  0: 'bg-gray-100 text-gray-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-green-100 text-green-700',
  3: 'bg-red-100 text-red-700',
};

const contractStatusColors: Record<number, string> = {
  0: 'bg-green-100 text-green-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-red-100 text-red-700',
  3: 'bg-yellow-100 text-yellow-700',
};

const paymentMethodColors: Record<number, string> = {
  0: 'bg-green-100 text-green-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-purple-100 text-purple-700',
  3: 'bg-yellow-100 text-yellow-700',
  99: 'bg-gray-100 text-gray-700',
};

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA');
}

/* ─────────── Cashier Session Indicator ─────────── */
function CashierSessionIndicator({ session }: { session: CashierSessionDto | null }) {
  const isOpen = session && session.status === 0;
  return (
    <div className={`rounded-lg border p-4 ${isOpen ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isOpen ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-navy">جلسة الكاشير</p>
            {isOpen && session ? (
              <p className="text-xs text-green-600">
                مفتوحة — {session.cashierName} — منذ {formatDate(session.openingTime)} — رصيد الافتتاح: {formatCurrency(session.openingBalance)}
              </p>
            ) : (
              <p className="text-xs text-gray-500">لا توجد جلسة مفتوحة حاليًا</p>
            )}
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isOpen ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
          {isOpen ? 'مفتوحة' : 'مغلقة'}
        </span>
      </div>
    </div>
  );
}

/* ─────────── Overview Tab ─────────── */
function OverviewTab({
  dashboard,
  recentPayments,
  loading,
}: {
  dashboard: FinanceDashboardDto | null;
  recentPayments: PaymentDto[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="إيرادات اليوم"
          value={dashboard ? formatCurrency(dashboard.todayRevenue) : '--'}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          color="bg-green-50 text-green-700"
        />
        <StatCard
          title="إيرادات الشهر"
          value={dashboard ? formatCurrency(dashboard.monthRevenue) : '--'}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          title="فواتير معلقة"
          value={dashboard?.pendingInvoices?.toString() ?? '--'}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          color="bg-orange/5 text-orange"
        />
        <StatCard
          title="عقود متخلفة"
          value={dashboard?.overdueContracts?.toString() ?? '--'}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          }
          color="bg-red-50 text-red-700"
        />
        <StatCard
          title="عقود نشطة"
          value={dashboard?.activeContracts?.toString() ?? '--'}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
          color="bg-navy/5 text-navy"
        />
        <StatCard
          title="إجمالي المرضى"
          value={dashboard?.totalPatients?.toString() ?? '--'}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          color="bg-purple-50 text-purple-700"
        />
      </div>

      {/* Recent Payments */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-bold text-navy">آخر المدفوعات</h3>
        {recentPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-right font-medium text-gray-600">المريض</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">المبلغ</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">طريقة الدفع</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-navy">{p.patientName}</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentMethodColors[p.paymentMethod] || 'bg-gray-100 text-gray-700'}`}>
                        {PaymentMethodLabels[p.paymentMethod] || p.paymentMethodDisplay}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(p.paymentDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-3 text-sm text-gray-400">لا توجد مدفوعات حديثة</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── Stat Card Component ─────────── */
function StatCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-navy">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Invoices Tab ─────────── */
function InvoicesTab({
  invoices,
  patients,
  doctors,
  loading,
  onCreate,
}: {
  invoices: InvoiceDto[];
  patients: PatientDto[];
  doctors: DoctorDto[];
  loading: boolean;
  onCreate: (req: CreateInvoiceRequest) => Promise<void>;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | ''>('');

  // Form state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [lineItems, setLineItems] = useState([
    { serviceNameSnapshot: '', quantity: 1, unitPrice: 0, lineDiscountAmount: 0, description: '', doctorId: '', toothNumber: '' },
  ]);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = !searchTerm || inv.patientName.includes(searchTerm) || inv.invoiceNumber.includes(searchTerm);
    const matchesStatus = statusFilter === '' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { serviceNameSnapshot: '', quantity: 1, unitPrice: 0, lineDiscountAmount: 0, description: '', doctorId: '', toothNumber: '' }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: string, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleSave = async () => {
    if (!selectedPatientId || lineItems.some((l) => !l.serviceNameSnapshot)) return;
    setSaving(true);
    try {
      await onCreate({
        patientId: selectedPatientId,
        notes: invoiceNotes || null,
        lineItems: lineItems.map((l) => ({
          serviceNameSnapshot: l.serviceNameSnapshot,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineDiscountAmount: l.lineDiscountAmount || undefined,
          description: l.description || undefined,
          doctorId: l.doctorId || undefined,
          toothNumber: l.toothNumber || undefined,
        })),
      });
      setShowCreate(false);
      setSelectedPatientId('');
      setInvoiceNotes('');
      setLineItems([{ serviceNameSnapshot: '', quantity: 1, unitPrice: 0, lineDiscountAmount: 0, description: '', doctorId: '', toothNumber: '' }]);
    } catch {
      // silent
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو رقم الفاتورة..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange sm:w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value === '' ? '' : Number(e.target.value))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
          >
            <option value="">كل الحالات</option>
            {Object.entries(InvoiceStatusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          فاتورة جديدة
        </button>
      </div>

      {/* Invoice List */}
      {filteredInvoices.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-right font-medium text-gray-600">رقم الفاتورة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المريض</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المبلغ الإجمالي</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">البنود</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-navy">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{inv.patientName}</td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(inv.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${invoiceStatusColors[inv.status] || 'bg-gray-100 text-gray-700'}`}>
                      {InvoiceStatusLabels[inv.status] || inv.statusDisplay}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(inv.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.lineItems?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState message="لا توجد فواتير" />
      )}

      {/* Create Invoice Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">فاتورة جديدة</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Patient Select */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">المريض <span className="text-red-500">*</span></label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                >
                  <option value="">-- اختر المريض --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.patientNumber} - {p.fullName}</option>
                  ))}
                </select>
              </div>

              {/* Line Items */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">بنود الفاتورة <span className="text-red-500">*</span></label>
                  <button onClick={handleAddLineItem} className="text-xs font-medium text-orange hover:text-orange-600">
                    + إضافة بند
                  </button>
                </div>
                <div className="space-y-3">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">بند {idx + 1}</span>
                        {lineItems.length > 1 && (
                          <button onClick={() => handleRemoveLineItem(idx)} className="text-xs text-red-500 hover:text-red-700">حذف</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={item.serviceNameSnapshot}
                            onChange={(e) => handleLineItemChange(idx, 'serviceNameSnapshot', e.target.value)}
                            placeholder="اسم الخدمة *"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(idx, 'quantity', Number(e.target.value))}
                            placeholder="الكمية"
                            min={1}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleLineItemChange(idx, 'unitPrice', Number(e.target.value))}
                            placeholder="سعر الوحدة"
                            min={0}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                          />
                        </div>
                        <div>
                          <select
                            value={item.doctorId}
                            onChange={(e) => handleLineItemChange(idx, 'doctorId', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                          >
                            <option value="">-- الطبيب --</option>
                            {doctors.filter((d) => d.isActive).map((d) => (
                              <option key={d.id} value={d.id}>د. {d.fullName}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input
                            type="text"
                            value={item.toothNumber}
                            onChange={(e) => handleLineItemChange(idx, 'toothNumber', e.target.value)}
                            placeholder="رقم السن"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  rows={2}
                  placeholder="ملاحظات إضافية..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !selectedPatientId || lineItems.some((l) => !l.serviceNameSnapshot)}
                  className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : 'إنشاء الفاتورة'}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Payments Tab ─────────── */
function PaymentsTab({
  payments,
  patients,
  contracts,
  invoices,
  doctors,
  loading,
  onCreate,
}: {
  payments: PaymentDto[];
  patients: PatientDto[];
  contracts: ContractDto[];
  invoices: InvoiceDto[];
  doctors: DoctorDto[];
  loading: boolean;
  onCreate: (req: CreatePaymentRequest) => Promise<void>;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<number | ''>('');

  // Form state
  const [form, setForm] = useState({
    patientId: '',
    amount: '',
    paymentMethod: 0,
    contractId: '',
    invoiceId: '',
    doctorId: '',
    serviceDescription: '',
    notes: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  const filteredPayments = payments.filter((p) => {
    const matchesSearch = !searchTerm || p.patientName.includes(searchTerm) || (p.receiptNumber && p.receiptNumber.includes(searchTerm));
    const matchesMethod = methodFilter === '' || p.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const handleSave = async () => {
    if (!form.patientId || !form.amount || Number(form.amount) <= 0) return;
    setSaving(true);
    try {
      await onCreate({
        patientId: form.patientId,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        contractId: form.contractId || null,
        invoiceId: form.invoiceId || null,
        doctorId: form.doctorId || null,
        serviceDescription: form.serviceDescription || null,
        notes: form.notes || null,
      });
      setShowCreate(false);
      setForm({ patientId: '', amount: '', paymentMethod: 0, contractId: '', invoiceId: '', doctorId: '', serviceDescription: '', notes: '', paymentDate: new Date().toISOString().split('T')[0] });
    } catch {
      // silent
    }
    setSaving(false);
  };

  // Filter contracts/invoices for selected patient
  const patientContracts = contracts.filter((c) => c.patientId === form.patientId);
  const patientInvoices = invoices.filter((i) => i.patientId === form.patientId);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو رقم الإيصال..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange sm:w-64"
          />
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value === '' ? '' : Number(e.target.value))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
          >
            <option value="">كل طرق الدفع</option>
            {Object.entries(PaymentMethodLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          دفعة جديدة
        </button>
      </div>

      {/* Payments List */}
      {filteredPayments.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-right font-medium text-gray-600">المريض</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المبلغ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">طريقة الدفع</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الوصف</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الطبيب</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-navy">{p.patientName}</td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentMethodColors[p.paymentMethod] || 'bg-gray-100 text-gray-700'}`}>
                      {PaymentMethodLabels[p.paymentMethod] || p.paymentMethodDisplay}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-gray-500">{p.serviceDescription || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.doctorName || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(p.paymentDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState message="لا توجد مدفوعات" />
      )}

      {/* Create Payment Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">دفعة جديدة</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">المريض <span className="text-red-500">*</span></label>
                <select
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value, contractId: '', invoiceId: '' })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                >
                  <option value="">-- اختر المريض --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.patientNumber} - {p.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">المبلغ <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    min={0}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">طريقة الدفع <span className="text-red-500">*</span></label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm({ ...form, paymentMethod: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  >
                    {Object.entries(PaymentMethodLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">العقد</label>
                  <select
                    value={form.contractId}
                    onChange={(e) => setForm({ ...form, contractId: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                    disabled={!form.patientId}
                  >
                    <option value="">-- بدون عقد --</option>
                    {patientContracts.map((c) => (
                      <option key={c.id} value={c.id}>عقد {formatCurrency(c.totalAmount)} — {ContractStatusLabels[c.status] || c.statusDisplay}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الفاتورة</label>
                  <select
                    value={form.invoiceId}
                    onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                    disabled={!form.patientId}
                  >
                    <option value="">-- بدون فاتورة --</option>
                    {patientInvoices.map((i) => (
                      <option key={i.id} value={i.id}>فاتورة {i.invoiceNumber} — {formatCurrency(i.totalAmount)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب</label>
                <select
                  value={form.doctorId}
                  onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                >
                  <option value="">-- بدون طبيب --</option>
                  {doctors.filter((d) => d.isActive).map((d) => (
                    <option key={d.id} value={d.id}>د. {d.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">وصف الخدمة</label>
                <input
                  type="text"
                  value={form.serviceDescription}
                  onChange={(e) => setForm({ ...form, serviceDescription: e.target.value })}
                  placeholder="مثال: حشوة سن"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="ملاحظات إضافية..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.patientId || !form.amount}
                  className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Contracts Tab ─────────── */
function ContractsTab({
  contracts,
  patients,
  loading,
  onCreate,
}: {
  contracts: ContractDto[];
  patients: PatientDto[];
  loading: boolean;
  onCreate: (req: CreateContractRequest) => Promise<void>;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | ''>('');

  // Form state
  const [form, setForm] = useState({
    patientId: '',
    totalAmount: '',
    downPayment: '',
    installmentsCount: '',
    installmentAmount: '',
    specialty: '',
    startDate: '',
    discountAmount: '',
    discountReason: '',
    notes: '',
  });

  const filteredContracts = contracts.filter((c) => {
    const matchesSearch = !searchTerm || c.patientName.includes(searchTerm);
    const matchesStatus = statusFilter === '' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSave = async () => {
    if (!form.patientId || !form.totalAmount || !form.installmentsCount) return;
    setSaving(true);
    try {
      await onCreate({
        patientId: form.patientId,
        totalAmount: Number(form.totalAmount),
        downPayment: Number(form.downPayment) || 0,
        installmentsCount: Number(form.installmentsCount),
        installmentAmount: form.installmentAmount ? Number(form.installmentAmount) : null,
        specialty: form.specialty || null,
        startDate: form.startDate || null,
        discountAmount: form.discountAmount ? Number(form.discountAmount) : undefined,
        discountReason: form.discountReason || null,
        notes: form.notes || null,
      });
      setShowCreate(false);
      setForm({ patientId: '', totalAmount: '', downPayment: '', installmentsCount: '', installmentAmount: '', specialty: '', startDate: '', discountAmount: '', discountReason: '', notes: '' });
    } catch {
      // silent
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange sm:w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value === '' ? '' : Number(e.target.value))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
          >
            <option value="">كل الحالات</option>
            {Object.entries(ContractStatusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          عقد جديد
        </button>
      </div>

      {/* Contracts List */}
      {filteredContracts.length > 0 ? (
        <div className="space-y-3">
          {filteredContracts.map((c) => (
            <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-bold text-navy">{c.patientName}</h3>
                  {c.specialty && <p className="text-sm text-gray-500">التخصص: {c.specialty}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${contractStatusColors[c.status] || 'bg-gray-100 text-gray-700'}`}>
                      {ContractStatusLabels[c.status] || c.statusDisplay}
                    </span>
                    {c.installmentAmount && (
                      <span className="inline-flex items-center rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-medium text-navy">
                        قسط {formatCurrency(c.installmentAmount)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-navy">{formatCurrency(c.totalAmount)}</p>
                  <p className="text-xs text-gray-500">
                    دفعة مقدمة: {formatCurrency(c.downPayment)} | أقساط: {c.installmentsCount}
                  </p>
                  {c.discountAmount > 0 && (
                    <p className="text-xs text-green-600">
                      خصم: {formatCurrency(c.discountAmount)} {c.discountReason ? `(${c.discountReason})` : ''}
                    </p>
                  )}
                  {c.startDate && (
                    <p className="mt-1 text-xs text-gray-400">
                      تاريخ البدء: {formatDate(c.startDate)}
                    </p>
                  )}
                </div>
              </div>
              {c.notes && (
                <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-400">{c.notes}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="لا توجد عقود" />
      )}

      {/* Create Contract Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">عقد جديد</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">المريض <span className="text-red-500">*</span></label>
                <select
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                >
                  <option value="">-- اختر المريض --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.patientNumber} - {p.fullName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">التخصص</label>
                <input
                  type="text"
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  placeholder="مثال: تقويم أسنان"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">المبلغ الإجمالي <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={form.totalAmount}
                    onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                    placeholder="0.00"
                    min={0}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الدفعة المقدمة</label>
                  <input
                    type="number"
                    value={form.downPayment}
                    onChange={(e) => setForm({ ...form, downPayment: e.target.value })}
                    placeholder="0.00"
                    min={0}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">عدد الأقساط <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={form.installmentsCount}
                    onChange={(e) => setForm({ ...form, installmentsCount: e.target.value })}
                    placeholder="0"
                    min={1}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">قيمة القسط</label>
                  <input
                    type="number"
                    value={form.installmentAmount}
                    onChange={(e) => setForm({ ...form, installmentAmount: e.target.value })}
                    placeholder="تلقائي"
                    min={0}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ البدء</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">مبلغ الخصم</label>
                  <input
                    type="number"
                    value={form.discountAmount}
                    onChange={(e) => setForm({ ...form, discountAmount: e.target.value })}
                    placeholder="0.00"
                    min={0}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>

              {Number(form.discountAmount) > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">سبب الخصم</label>
                  <input
                    type="text"
                    value={form.discountReason}
                    onChange={(e) => setForm({ ...form, discountReason: e.target.value })}
                    placeholder="سبب الخصم..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="ملاحظات إضافية..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.patientId || !form.totalAmount || !form.installmentsCount}
                  className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : 'إنشاء العقد'}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Empty State ─────────── */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
      <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="mt-3 text-sm text-gray-500">{message}</p>
    </div>
  );
}

/* ─────────── Main Finance Content ─────────── */
function FinanceContent() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [dashboard, setDashboard] = useState<FinanceDashboardDto | null>(null);
  const [cashierSession, setCashierSession] = useState<CashierSessionDto | null>(null);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [contracts, setContracts] = useState<ContractDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState<Set<string>>(new Set());

  // Load initial data (patients, doctors, dashboard, cashier session)
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        api.get<PagedResult<PatientDto>>('/patients?page=1&pageSize=1000').catch(() => null),
        api.get<PagedResult<DoctorDto>>('/doctors?page=1&pageSize=100').catch(() => null),
      ]);
      if (patientsRes?.data) setPatients(patientsRes.data.items || []);
      if (doctorsRes?.data) setDoctors(doctorsRes.data.items || []);

      // Load dashboard & cashier session
      const [dashRes, sessionRes] = await Promise.all([
        api.get<FinanceDashboardDto>('/finance/dashboard').catch(() => null),
        api.get<CashierSessionDto>('/finance/cashier-session/current').catch(() => null),
      ]);
      if (dashRes?.data) setDashboard(dashRes.data);
      if (sessionRes?.data) setCashierSession(sessionRes.data);
    } catch {
      // silent
    }
    setLoading(false);
  };

  // Load tab-specific data
  const loadTabData = useCallback(async (tab: TabKey) => {
    if (dataLoaded.has(tab)) return;
    try {
      if (tab === 'overview') {
        const [paymentsRes] = await Promise.all([
          api.get<PagedResult<PaymentDto>>('/finance/payments?page=1&pageSize=10').catch(() => null),
        ]);
        if (paymentsRes?.data) setPayments(paymentsRes.data.items || []);
        setDataLoaded((prev) => new Set(prev).add('overview'));
      } else if (tab === 'invoices') {
        const res = await api.get<PagedResult<InvoiceDto>>('/finance/invoices?page=1&pageSize=50').catch(() => null);
        if (res?.data) setInvoices(res.data.items || []);
        setDataLoaded((prev) => new Set(prev).add('invoices'));
      } else if (tab === 'payments') {
        const res = await api.get<PagedResult<PaymentDto>>('/finance/payments?page=1&pageSize=50').catch(() => null);
        if (res?.data) setPayments(res.data.items || []);
        setDataLoaded((prev) => new Set(prev).add('payments'));
      } else if (tab === 'contracts') {
        const res = await api.get<PagedResult<ContractDto>>('/finance/contracts?page=1&pageSize=50').catch(() => null);
        if (res?.data) setContracts(res.data.items || []);
        setDataLoaded((prev) => new Set(prev).add('contracts'));
      }
    } catch {
      // silent
    }
  }, [dataLoaded]);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  // Create handlers
  const handleCreateInvoice = async (req: CreateInvoiceRequest): Promise<void> => {
    await api.post('/finance/invoices', req);
    setDataLoaded((prev) => {
      const next = new Set(prev);
      next.delete('invoices');
      return next;
    });
    loadTabData('invoices');
  };

  const handleCreatePayment = async (req: CreatePaymentRequest): Promise<void> => {
    await api.post('/finance/payments', req);
    setDataLoaded((prev) => {
      const next = new Set(prev);
      next.delete('payments');
      next.delete('overview');
      return next;
    });
    loadTabData('payments');
    loadTabData('overview');
  };

  const handleCreateContract = async (req: CreateContractRequest): Promise<void> => {
    await api.post('/finance/contracts', req);
    setDataLoaded((prev) => {
      const next = new Set(prev);
      next.delete('contracts');
      return next;
    });
    loadTabData('contracts');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">المالية</h1>
          <p className="text-sm text-gray-500">إدارة الفواتير والمدفوعات والعقود</p>
        </div>
      </div>

      {/* Cashier Session Indicator */}
      <CashierSessionIndicator session={cashierSession} />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          dashboard={dashboard}
          recentPayments={payments.slice(0, 10)}
          loading={loading && !dashboard}
        />
      )}
      {activeTab === 'invoices' && (
        <InvoicesTab
          invoices={invoices}
          patients={patients}
          doctors={doctors}
          loading={!dataLoaded.has('invoices')}
          onCreate={handleCreateInvoice}
        />
      )}
      {activeTab === 'payments' && (
        <PaymentsTab
          payments={payments}
          patients={patients}
          contracts={contracts}
          invoices={invoices}
          doctors={doctors}
          loading={!dataLoaded.has('payments')}
          onCreate={handleCreatePayment}
        />
      )}
      {activeTab === 'contracts' && (
        <ContractsTab
          contracts={contracts}
          patients={patients}
          loading={!dataLoaded.has('contracts')}
          onCreate={handleCreateContract}
        />
      )}
    </div>
  );
}

/* ─────────── Page Wrapper ─────────── */
export default function FinancePage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <FinanceContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
