'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import type {
  OperationalExpenseDto,
  CreateOperationalExpenseRequest,
  PagedResult,
} from '@/types/api';
import {
  ExpenseCategoryLabels,
  ApprovalStatusLabels,
  ApprovalStatusColors,
  PaymentMethodLabels,
} from '@/types/api';

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA');
}

function ExpensesContent() {
  const [expenses, setExpenses] = useState<OperationalExpenseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<number | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    category: 0,
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 0,
    notes: '',
  });

  const pageSize = 20;

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/expenses?page=${page}&pageSize=${pageSize}`;
      if (categoryFilter !== '') url += `&category=${categoryFilter}`;
      if (statusFilter !== '') url += `&approvalStatus=${statusFilter}`;
      if (dateFrom) url += `&dateFrom=${dateFrom}`;
      if (dateTo) url += `&dateTo=${dateTo}`;
      const res = await api.get<PagedResult<OperationalExpenseDto>>(url);
      setExpenses(res.data?.items ?? []);
      setTotalCount(res.data?.totalCount ?? 0);
    } catch {
      // silent
    }
    setLoading(false);
  }, [page, categoryFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleCreate = async () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    setSaving(true);
    try {
      const req: CreateOperationalExpenseRequest = {
        category: form.category,
        description: form.description || null,
        amount: Number(form.amount),
        expenseDate: form.expenseDate,
        paymentMethod: form.paymentMethod,
        notes: form.notes || null,
      };
      await api.post('/expenses', req);
      setShowCreate(false);
      setForm({ category: 0, description: '', amount: '', expenseDate: new Date().toISOString().split('T')[0], paymentMethod: 0, notes: '' });
      loadExpenses();
    } catch {
      // silent
    }
    setSaving(false);
  };

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/expenses/${id}/approve`);
      loadExpenses();
    } catch {
      // silent
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.post(`/expenses/${id}/reject`);
      loadExpenses();
    } catch {
      // silent
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-[#1a3a5c]">المصروفات</h1>
        <p className="text-sm text-gray-500">إدارة المصروفات التشغيلية والاعتماد</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]"
        >
          <option value="">كل الفئات</option>
          {Object.entries(ExpenseCategoryLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]"
        >
          <option value="">كل الحالات</option>
          {Object.entries(ApprovalStatusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]"
          placeholder="من تاريخ"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]"
          placeholder="إلى تاريخ"
        />
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#f5922e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#e07d1a]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          مصروف جديد
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" />
        </div>
      ) : expenses.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-right font-medium text-gray-600">رقم المصروف</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الفئة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الوصف</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المبلغ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">طريقة الدفع</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">حالة الاعتماد</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#1a3a5c]">{exp.expenseNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{ExpenseCategoryLabels[exp.category] || exp.categoryDisplay}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-gray-500">{exp.description || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(exp.amount)}</td>
                  <td className="px-4 py-3 text-gray-700">{PaymentMethodLabels[exp.paymentMethod] || exp.paymentMethodDisplay}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ApprovalStatusColors[exp.approvalStatus] || 'bg-gray-100 text-gray-700'}`}>
                      {ApprovalStatusLabels[exp.approvalStatus] || exp.approvalStatusDisplay}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(exp.expenseDate)}</td>
                  <td className="px-4 py-3">
                    {exp.approvalStatus === 0 && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(exp.id)} className="rounded px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100">اعتماد</button>
                        <button onClick={() => handleReject(exp.id)} className="rounded px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100">رفض</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
          <p className="mt-3 text-sm text-gray-400">لا توجد مصروفات</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50">السابق</button>
          <span className="text-sm text-gray-600">صفحة {page} من {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50">التالي</button>
        </div>
      )}

      {/* Create Expense Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c]">مصروف جديد</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الفئة <span className="text-red-500">*</span></label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: Number(e.target.value) })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
                    {Object.entries(ExpenseCategoryLabels).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">المبلغ <span className="text-red-500">*</span></label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" min={0} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">طريقة الدفع <span className="text-red-500">*</span></label>
                  <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: Number(e.target.value) })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
                    {Object.entries(PaymentMethodLabels).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ المصروف</label>
                  <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الوصف</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف المصروف..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="ملاحظات إضافية..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCreate} disabled={saving || !form.amount} className="flex-1 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07d1a] disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : 'إنشاء المصروف'}
                </button>
                <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl font-[Tajawal]">
          <ExpensesContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
