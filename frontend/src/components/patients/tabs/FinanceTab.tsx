'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/api';
import type {
  PatientFinanceSummaryDto, PaymentDto, ContractDto, InvoiceDto,
  PagedResult, CreatePaymentRequest, CreateContractRequest,
} from '../../../types/api';
import {
  ContractStatusLabels, InvoiceStatusLabels, PaymentMethodLabels,
} from '../../../types/api';
import { Plus, Wallet, FileText, Receipt, Loader2 } from 'lucide-react';

interface FinanceTabProps {
  patientId: string;
}

const formatCurrency = (amount: number) =>
  `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;

const formatDate = (date: string) => new Date(date).toLocaleDateString('ar-SA');

export default function FinanceTab({ patientId }: FinanceTabProps) {
  const [summary, setSummary] = useState<PatientFinanceSummaryDto | null>(null);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [contracts, setContracts] = useState<ContractDto[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'invoices' | 'payments' | 'contracts'>('overview');
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [showCreateContract, setShowCreateContract] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingContract, setSavingContract] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: '', paymentMethod: 0, contractId: '', serviceDescription: '', notes: '',
  });
  const [contractForm, setContractForm] = useState({
    totalAmount: '', downPayment: '', installmentsCount: '', installmentAmount: '',
    specialty: '', startDate: '', discountAmount: '', discountReason: '', notes: '',
  });

  const contractStatusColors: Record<number, string> = {
    0: 'bg-green-100 text-green-700', 1: 'bg-blue-100 text-blue-700',
    2: 'bg-red-100 text-red-700', 3: 'bg-yellow-100 text-yellow-700',
  };

  const invoiceStatusColors: Record<number, string> = {
    0: 'bg-gray-100 text-gray-700', 1: 'bg-blue-100 text-blue-700',
    2: 'bg-green-100 text-green-700', 3: 'bg-red-100 text-red-700',
  };

  const paymentMethodColors: Record<number, string> = {
    0: 'bg-green-100 text-green-700', 1: 'bg-blue-100 text-blue-700',
    2: 'bg-purple-100 text-purple-700', 3: 'bg-yellow-100 text-yellow-700',
    99: 'bg-gray-100 text-gray-700',
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, payRes, conRes, invRes] = await Promise.all([
        api.get<PatientFinanceSummaryDto>(`/finance/patients/${patientId}/summary`).catch(() => null),
        api.get<PagedResult<PaymentDto>>(`/finance/payments?patientId=${patientId}&pageSize=50`).catch(() => null),
        api.get<PagedResult<ContractDto>>(`/finance/contracts?patientId=${patientId}&pageSize=50`).catch(() => null),
        api.get<PagedResult<InvoiceDto>>(`/finance/invoices?patientId=${patientId}&pageSize=50`).catch(() => null),
      ]);
      if (sumRes?.data) setSummary(sumRes.data);
      if (payRes?.data) setPayments(payRes.data.items || []);
      if (conRes?.data) setContracts(conRes.data.items || []);
      if (invRes?.data) setInvoices(invRes.data.items || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [patientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreatePayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) return;
    setSavingPayment(true);
    try {
      const req: CreatePaymentRequest = {
        patientId, amount: Number(payForm.amount), paymentMethod: payForm.paymentMethod,
        contractId: payForm.contractId || null, serviceDescription: payForm.serviceDescription || null,
        notes: payForm.notes || null,
      };
      await api.post('/finance/payments', req);
      setShowCreatePayment(false);
      setPayForm({ amount: '', paymentMethod: 0, contractId: '', serviceDescription: '', notes: '' });
      loadData();
    } catch { /* silent */ }
    setSavingPayment(false);
  };

  const handleCreateContract = async () => {
    if (!contractForm.totalAmount || !contractForm.installmentsCount) return;
    setSavingContract(true);
    try {
      const req: CreateContractRequest = {
        patientId, totalAmount: Number(contractForm.totalAmount),
        downPayment: Number(contractForm.downPayment) || 0,
        installmentsCount: Number(contractForm.installmentsCount),
        installmentAmount: contractForm.installmentAmount ? Number(contractForm.installmentAmount) : null,
        specialty: contractForm.specialty || null, startDate: contractForm.startDate || null,
        discountAmount: contractForm.discountAmount ? Number(contractForm.discountAmount) : undefined,
        discountReason: contractForm.discountReason || null, notes: contractForm.notes || null,
      };
      await api.post('/finance/contracts', req);
      setShowCreateContract(false);
      setContractForm({ totalAmount: '', downPayment: '', installmentsCount: '', installmentAmount: '', specialty: '', startDate: '', discountAmount: '', discountReason: '', notes: '' });
      loadData();
    } catch { /* silent */ }
    setSavingContract(false);
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" />
      </div>
    );
  }

  const subTabs = [
    { id: 'overview' as const, label: 'نظرة عامة', icon: Wallet },
    { id: 'invoices' as const, label: 'الفواتير', icon: Receipt },
    { id: 'payments' as const, label: 'المدفوعات', icon: Wallet },
    { id: 'contracts' as const, label: 'العقود', icon: FileText },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Sub-tab navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {subTabs.map(st => (
          <button
            key={st.id}
            onClick={() => setActiveSubTab(st.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-sm font-medium transition-colors font-[Tajawal] ${
              activeSubTab === st.id
                ? 'text-[#3d7ab5] bg-[#3d7ab5]/5 border-b-2 border-[#3d7ab5]'
                : 'text-gray-500 hover:text-[#1a3a5c] hover:bg-gray-50'
            }`}
          >
            <st.icon className="w-4 h-4" />
            {st.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSubTab === 'overview' && summary && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-green-50 px-4 py-3">
              <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.totalPaid)}</p>
              <p className="text-xs font-medium text-green-600">الإجمالي المدفوع</p>
            </div>
            <div className="rounded-lg bg-red-50 px-4 py-3">
              <p className="text-2xl font-bold text-red-700">{formatCurrency(summary.totalOutstanding)}</p>
              <p className="text-xs font-medium text-red-600">المبلغ المستحق</p>
            </div>
            <div className="rounded-lg bg-[#1a3a5c]/5 px-4 py-3">
              <p className="text-2xl font-bold text-[#1a3a5c]">{formatCurrency(summary.totalContractAmount)}</p>
              <p className="text-xs font-medium text-[#1a3a5c]/70">إجمالي العقود ({summary.totalContracts})</p>
            </div>
            <div className="rounded-lg bg-yellow-50 px-4 py-3">
              <p className="text-2xl font-bold text-yellow-700">{summary.overdueContracts}</p>
              <p className="text-xs font-medium text-yellow-600">عقود متأخرة</p>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-bold text-[#1a3a5c]">آخر المدفوعات</h3>
            {payments.length > 0 ? (
              <div className="space-y-2">
                {payments.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[#1a3a5c]">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-gray-500">{p.serviceDescription || '—'}</p>
                    </div>
                    <div className="text-left">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${paymentMethodColors[p.paymentMethod] || 'bg-gray-100 text-gray-700'}`}>
                        {PaymentMethodLabels[p.paymentMethod] || p.paymentMethodDisplay}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(p.paymentDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">لا توجد مدفوعات</p>
            )}
          </div>
        </div>
      )}

      {/* Invoices */}
      {activeSubTab === 'invoices' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-[#1a3a5c]">الفواتير</h3>
          </div>
          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-3 py-2 text-right font-medium text-gray-600">رقم الفاتورة</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">الحالة</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">المبلغ الإجمالي</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-[#1a3a5c]">{inv.invoiceNumber}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${invoiceStatusColors[inv.status] || 'bg-gray-100 text-gray-700'}`}>
                          {InvoiceStatusLabels[inv.status] || inv.statusDisplay}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-[#1a3a5c]">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-3 py-2 text-gray-500">{formatDate(inv.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-gray-400">لا توجد فواتير مسجلة</p>
          )}
        </div>
      )}

      {/* Payments */}
      {activeSubTab === 'payments' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-[#1a3a5c]">المدفوعات</h3>
            <button
              onClick={() => setShowCreatePayment(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#f5922e] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#e07d1a] font-[Tajawal]"
            >
              <Plus className="w-3.5 h-3.5" /> دفعة جديدة
            </button>
          </div>
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-3 py-2 text-right font-medium text-gray-600">المبلغ</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">طريقة الدفع</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">الوصف</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-[#1a3a5c]">{formatCurrency(p.amount)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${paymentMethodColors[p.paymentMethod] || 'bg-gray-100 text-gray-700'}`}>
                          {PaymentMethodLabels[p.paymentMethod] || p.paymentMethodDisplay}
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-[200px] truncate text-gray-500">{p.serviceDescription || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{formatDate(p.paymentDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-gray-400">لا توجد مدفوعات مسجلة</p>
          )}
        </div>
      )}

      {/* Contracts */}
      {activeSubTab === 'contracts' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-[#1a3a5c]">العقود</h3>
            <button
              onClick={() => setShowCreateContract(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#f5922e] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#e07d1a] font-[Tajawal]"
            >
              <Plus className="w-3.5 h-3.5" /> عقد جديد
            </button>
          </div>
          {contracts.length > 0 ? (
            <div className="space-y-3">
              {contracts.map(c => (
                <div key={c.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${contractStatusColors[c.status] || 'bg-gray-100 text-gray-700'}`}>
                        {ContractStatusLabels[c.status] || c.statusDisplay}
                      </span>
                      {c.specialty && <span className="mr-2 text-xs text-gray-500">{c.specialty}</span>}
                    </div>
                    <p className="text-sm font-bold text-[#1a3a5c]">{formatCurrency(c.totalAmount)}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>دفعة مقدمة: {formatCurrency(c.downPayment)}</span>
                    <span>أقساط: {c.installmentsCount}</span>
                    {c.installmentAmount && <span>قسط: {formatCurrency(c.installmentAmount)}</span>}
                    {c.discountAmount > 0 && <span className="text-green-600">خصم: {formatCurrency(c.discountAmount)}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-gray-400">لا توجد عقود مسجلة</p>
          )}
        </div>
      )}

      {/* Create Payment Modal */}
      {showCreatePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreatePayment(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">دفعة جديدة</h2>
              <button onClick={() => setShowCreatePayment(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">المبلغ <span className="text-red-500">*</span></label>
                  <input type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} placeholder="0.00" min={0} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">طريقة الدفع <span className="text-red-500">*</span></label>
                  <select value={payForm.paymentMethod} onChange={e => setPayForm({ ...payForm, paymentMethod: Number(e.target.value) })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e] font-[Tajawal]">
                    {Object.entries(PaymentMethodLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">العقد</label>
                <select value={payForm.contractId} onChange={e => setPayForm({ ...payForm, contractId: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e] font-[Tajawal]">
                  <option value="">-- بدون عقد --</option>
                  {contracts.map(c => <option key={c.id} value={c.id}>عقد {formatCurrency(c.totalAmount)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">وصف الخدمة</label>
                <input type="text" value={payForm.serviceDescription} onChange={e => setPayForm({ ...payForm, serviceDescription: e.target.value })} placeholder="مثال: حشوة سن" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e] font-[Tajawal]" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} rows={2} placeholder="ملاحظات..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e] font-[Tajawal]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCreatePayment} disabled={savingPayment || !payForm.amount} className="flex-1 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07d1a] disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]">
                  {savingPayment && <Loader2 className="w-4 h-4 animate-spin" />}
                  {savingPayment ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
                </button>
                <button onClick={() => setShowCreatePayment(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-[Tajawal]">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Contract Modal */}
      {showCreateContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreateContract(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">عقد جديد</h2>
              <button onClick={() => setShowCreateContract(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">المبلغ الإجمالي <span className="text-red-500">*</span></label>
                <input type="number" value={contractForm.totalAmount} onChange={e => setContractForm({ ...contractForm, totalAmount: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">الدفعة المقدمة</label>
                  <input type="number" value={contractForm.downPayment} onChange={e => setContractForm({ ...contractForm, downPayment: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">عدد الأقساط <span className="text-red-500">*</span></label>
                  <input type="number" value={contractForm.installmentsCount} onChange={e => setContractForm({ ...contractForm, installmentsCount: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">مبلغ القسط</label>
                  <input type="number" value={contractForm.installmentAmount} onChange={e => setContractForm({ ...contractForm, installmentAmount: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">التخصص</label>
                  <input type="text" value={contractForm.specialty} onChange={e => setContractForm({ ...contractForm, specialty: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none font-[Tajawal]" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">تاريخ البدء</label>
                <input type="date" value={contractForm.startDate} onChange={e => setContractForm({ ...contractForm, startDate: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea value={contractForm.notes} onChange={e => setContractForm({ ...contractForm, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none font-[Tajawal]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCreateContract} disabled={savingContract || !contractForm.totalAmount || !contractForm.installmentsCount} className="flex-1 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07d1a] disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]">
                  {savingContract && <Loader2 className="w-4 h-4 animate-spin" />}
                  {savingContract ? 'جاري الحفظ...' : 'إنشاء العقد'}
                </button>
                <button onClick={() => setShowCreateContract(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-[Tajawal]">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
