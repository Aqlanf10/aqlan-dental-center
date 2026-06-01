'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Pagination from '@/components/common/Pagination';
import SearchInput from '@/components/common/SearchInput';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { api } from '@/lib/api';
import type {
  OperationalExpenseDto,
  CreateOperationalExpenseRequest,
  PagedResult,
  TreasuryDto,
} from '@/types/api';
import {
  ExpenseCategoryLabels,
  ApprovalStatusLabels,
  ApprovalStatusColors,
  PaymentMethodLabels,
} from '@/types/api';
import {
  Plus, CheckCircle, XCircle, Edit3, Trash2,
  FileText, ChevronDown, ChevronUp, AlertCircle, Building2,
} from 'lucide-react';

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA');
}

function ExpensesContent() {
  const [expenses, setExpenses] = useState<OperationalExpenseDto[]>([]);
  const [treasuries, setTreasuries] = useState<TreasuryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<number | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OperationalExpenseDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<OperationalExpenseDto | null>(null);

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

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
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      const [expRes, tresRes] = await Promise.all([
        api.get<PagedResult<OperationalExpenseDto>>(url),
        api.get<TreasuryDto[]>('/treasuries').catch(() => ({ data: [] as TreasuryDto[] })),
      ]);
      setExpenses(expRes.data?.items ?? []);
      setTotalCount(expRes.data?.totalCount ?? 0);
      setTreasuries(tresRes.data ?? []);
    } catch {
      // silent
    }
    setLoading(false);
  }, [page, categoryFilter, statusFilter, dateFrom, dateTo, searchTerm]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const resetForm = () => {
    setForm({
      category: 0, description: '', amount: '',
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: 0, notes: '',
    });
    setEditingExpense(null);
    setError('');
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const openEdit = (exp: OperationalExpenseDto) => {
    setEditingExpense(exp);
    setForm({
      category: exp.category,
      description: exp.description || '',
      amount: String(exp.amount),
      expenseDate: exp.expenseDate.split('T')[0],
      paymentMethod: exp.paymentMethod,
      notes: exp.notes || '',
    });
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      setError('يرجى إدخال مبلغ صحيح');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingExpense) {
        const req: CreateOperationalExpenseRequest = {
          category: form.category,
          description: form.description || null,
          amount: Number(form.amount),
          expenseDate: form.expenseDate,
          paymentMethod: form.paymentMethod,
          notes: form.notes || null,
        };
        await api.put(`/expenses/${editingExpense.id}`, req);
      } else {
        const req: CreateOperationalExpenseRequest = {
          category: form.category,
          description: form.description || null,
          amount: Number(form.amount),
          expenseDate: form.expenseDate,
          paymentMethod: form.paymentMethod,
          notes: form.notes || null,
        };
        await api.post('/expenses', req);
      }
      setShowCreate(false);
      resetForm();
      loadExpenses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ';
      setError(msg);
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

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      await api.post(`/expenses/${rejectTarget}/reject`, { rejectionReason: rejectionReason || null });
      setRejectTarget(null);
      setRejectionReason('');
      loadExpenses();
    } catch {
      // silent
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/expenses/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadExpenses();
    } catch {
      // silent
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Stats
  const pendingCount = expenses.filter(e => e.approvalStatus === 0).length;
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3a5c]">المصروفات</h1>
          <p className="text-sm text-gray-500">إدارة المصروفات التشغيلية والاعتماد</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#e07d1a]"
        >
          <Plus className="h-4 w-4" />
          مصروف جديد
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a3a5c]/5 text-[#1a3a5c]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">إجمالي المصروفات</p>
              <p className="text-xl font-bold text-[#1a3a5c]">{totalCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-yellow-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">بانتظار الاعتماد</p>
              <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3d7ab5]/10 text-[#3d7ab5]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">إجمالي المبلغ</p>
              <p className="text-xl font-bold text-[#1a3a5c]">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="w-full sm:w-64">
          <SearchInput value={searchTerm} onChange={(val) => { setSearchTerm(val); setPage(1); }} placeholder="بحث بالوصف أو الرقم..." />
        </div>
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
      </div>

      {/* Treasury Cards */}
      {treasuries.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {treasuries.map((t) => (
            <div key={t.id} className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-500">{t.name}</p>
              <p className="mt-1 text-xl font-bold text-[#1a3a5c]">{formatCurrency(t.balance)}</p>
              <p className="text-xs text-gray-400">{t.typeDisplay}</p>
            </div>
          ))}
        </div>
      )}

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
                <th className="px-4 py-3 text-right font-medium text-gray-600 w-8"></th>
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
                <>
                  <tr key={exp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)} className="text-gray-400 hover:text-[#3d7ab5]">
                        {expandedId === exp.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1a3a5c]">{exp.expenseNumber}</td>
                    <td className="px-4 py-3 text-gray-700">{ExpenseCategoryLabels[exp.category] || exp.categoryDisplay}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-gray-500">{exp.description || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3 text-gray-700">{PaymentMethodLabels[exp.paymentMethod] || exp.paymentMethodDisplay}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ApprovalStatusColors[exp.approvalStatus] || 'bg-gray-100 text-gray-700'}`}>
                        {ApprovalStatusLabels[exp.approvalStatus] || exp.approvalStatusDisplay}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(exp.expenseDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {exp.approvalStatus === 0 && (
                          <>
                            <button onClick={() => handleApprove(exp.id)} className="rounded p-1.5 text-green-600 bg-green-50 hover:bg-green-100 transition-colors" title="اعتماد">
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button onClick={() => { setRejectTarget(exp.id); setRejectionReason(''); }} className="rounded p-1.5 text-red-600 bg-red-50 hover:bg-red-100 transition-colors" title="رفض">
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {exp.approvalStatus === 0 && (
                          <button onClick={() => openEdit(exp)} className="rounded p-1.5 text-[#3d7ab5] bg-[#3d7ab5]/5 hover:bg-[#3d7ab5]/10 transition-colors" title="تعديل">
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => setDeleteTarget(exp)} className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="حذف">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === exp.id && (
                    <tr key={`${exp.id}-detail`} className="bg-gray-50">
                      <td colSpan={9} className="px-8 py-3">
                        <div className="grid gap-3 sm:grid-cols-3 text-sm">
                          {exp.approvedByName && (
                            <div><span className="text-gray-500">اعتمد بواسطة:</span> <span className="font-medium text-[#1a3a5c]">{exp.approvedByName}</span></div>
                          )}
                          {exp.approvedAt && (
                            <div><span className="text-gray-500">تاريخ الاعتماد:</span> <span className="font-medium text-[#1a3a5c]">{formatDate(exp.approvedAt)}</span></div>
                          )}
                          {exp.rejectionReason && (
                            <div className="sm:col-span-3"><span className="text-gray-500">سبب الرفض:</span> <span className="font-medium text-red-600">{exp.rejectionReason}</span></div>
                          )}
                          {exp.notes && (
                            <div className="sm:col-span-3"><span className="text-gray-500">ملاحظات:</span> <span className="text-gray-700">{exp.notes}</span></div>
                          )}
                          {exp.createdBy && (
                            <div><span className="text-gray-500">أنشئ بواسطة:</span> <span className="text-gray-700">{exp.createdBy}</span></div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-bold text-[#1a3a5c]">لا توجد مصروفات</h3>
          <p className="mt-2 text-sm text-gray-500">ابدأ بإضافة مصروف جديد</p>
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setShowCreate(false); resetForm(); }}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c]">{editingExpense ? 'تعديل المصروف' : 'مصروف جديد'}</h2>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}
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
                <button onClick={handleSave} disabled={saving || !form.amount} className="flex-1 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07d1a] disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : editingExpense ? 'تحديث' : 'إنشاء المصروف'}
                </button>
                <button onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="حذف المصروف"
        message={`هل أنت متأكد من حذف المصروف رقم ${deleteTarget?.expenseNumber || ''}؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Reject Dialog */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRejectTarget(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1a3a5c] mb-4">رفض المصروف</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">سبب الرفض</label>
                <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} placeholder="أدخل سبب الرفض..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleReject} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors">رفض</button>
                <button onClick={() => setRejectTarget(null)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
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
