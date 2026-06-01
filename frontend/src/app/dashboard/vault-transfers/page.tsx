'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Pagination from '@/components/common/Pagination';
import SearchInput from '@/components/common/SearchInput';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { api } from '@/lib/api';
import type {
  VaultTransferDto,
  CreateVaultTransferRequest,
  TreasuryDto,
  PagedResult,
} from '@/types/api';
import {
  TransferStatusLabels,
  TransferStatusColors,
} from '@/types/api';
import {
  Plus, ArrowLeftRight, CheckCircle, XCircle, Trash2,
  Building2, ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react';

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA');
}

function VaultTransfersContent() {
  const [transfers, setTransfers] = useState<VaultTransferDto[]>([]);
  const [treasuries, setTreasuries] = useState<TreasuryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VaultTransferDto | null>(null);

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [form, setForm] = useState({
    sourceTreasuryId: '',
    destinationTreasuryId: '',
    amount: '',
    transferDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const pageSize = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/vault-transfers?page=${page}&pageSize=${pageSize}`;
      if (statusFilter !== '') url += `&status=${statusFilter}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      const [transRes, tresRes] = await Promise.all([
        api.get<PagedResult<VaultTransferDto>>(url),
        api.get<TreasuryDto[]>('/treasuries').catch(() => ({ data: [] as TreasuryDto[] })),
      ]);
      setTransfers(transRes.data?.items ?? []);
      setTotalCount(transRes.data?.totalCount ?? 0);
      setTreasuries(tresRes.data ?? []);
    } catch {
      // silent
    }
    setLoading(false);
  }, [page, statusFilter, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setForm({ sourceTreasuryId: '', destinationTreasuryId: '', amount: '', transferDate: new Date().toISOString().split('T')[0], notes: '' });
    setError('');
  };

  const handleCreate = async () => {
    if (!form.sourceTreasuryId || !form.destinationTreasuryId || !form.amount || Number(form.amount) <= 0) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (form.sourceTreasuryId === form.destinationTreasuryId) {
      setError('لا يمكن التحويل من وإلى نفس الخزينة');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const req: CreateVaultTransferRequest = {
        sourceTreasuryId: form.sourceTreasuryId,
        destinationTreasuryId: form.destinationTreasuryId,
        amount: Number(form.amount),
        transferDate: form.transferDate,
        notes: form.notes || null,
      };
      await api.post('/vault-transfers', req);
      setShowCreate(false);
      resetForm();
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ';
      setError(msg);
    }
    setSaving(false);
  };

  const handleApprove = async (id: string) => {
    try { await api.post(`/vault-transfers/${id}/approve`); loadData(); } catch { /* silent */ }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      await api.post(`/vault-transfers/${rejectTarget}/reject`, { rejectionReason: rejectionReason || null });
      setRejectTarget(null);
      setRejectionReason('');
      loadData();
    } catch { /* silent */ }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/vault-transfers/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadData();
    } catch { /* silent */ }
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const pendingCount = transfers.filter(t => t.status === 0).length;
  const totalTransferAmount = transfers.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3a5c]">تحويلات الخزينة</h1>
          <p className="text-sm text-gray-500">إدارة التحويلات بين الخزائن والاعتماد</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#e07d1a]"
        >
          <Plus className="h-4 w-4" />
          تحويل جديد
        </button>
      </div>

      {/* Treasury Balance Cards */}
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a3a5c]/5 text-[#1a3a5c]">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">إجمالي التحويلات</p>
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
              <p className="text-xs text-gray-500">إجمالي المبلغ المحول</p>
              <p className="text-xl font-bold text-[#1a3a5c]">{formatCurrency(totalTransferAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:w-64">
          <SearchInput value={searchTerm} onChange={(val) => { setSearchTerm(val); setPage(1); }} placeholder="بحث برقم التحويل..." />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]"
        >
          <option value="">كل الحالات</option>
          {Object.entries(TransferStatusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" />
        </div>
      ) : transfers.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-right w-8"></th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">رقم التحويل</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">من ← إلى</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المبلغ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transfers.map((tr) => (
                <>
                  <tr key={tr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={() => setExpandedId(expandedId === tr.id ? null : tr.id)} className="text-gray-400 hover:text-[#3d7ab5]">
                        {expandedId === tr.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1a3a5c]">{tr.transferNumber}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <span className="text-[#1a3a5c]">{tr.sourceTreasuryName}</span>
                      <span className="mx-2 text-gray-400">←</span>
                      <span className="text-[#3d7ab5]">{tr.destinationTreasuryName}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{formatCurrency(tr.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TransferStatusColors[tr.status] || 'bg-gray-100 text-gray-700'}`}>
                        {TransferStatusLabels[tr.status] || tr.statusDisplay}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(tr.transferDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {tr.status === 0 && (
                          <>
                            <button onClick={() => handleApprove(tr.id)} className="rounded p-1.5 text-green-600 bg-green-50 hover:bg-green-100 transition-colors" title="اعتماد">
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button onClick={() => { setRejectTarget(tr.id); setRejectionReason(''); }} className="rounded p-1.5 text-red-600 bg-red-50 hover:bg-red-100 transition-colors" title="رفض">
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => setDeleteTarget(tr)} className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="حذف">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === tr.id && (
                    <tr key={`${tr.id}-detail`} className="bg-gray-50">
                      <td colSpan={7} className="px-8 py-3">
                        <div className="grid gap-3 sm:grid-cols-3 text-sm">
                          {tr.approvedByName && (
                            <div><span className="text-gray-500">اعتمد بواسطة:</span> <span className="font-medium text-[#1a3a5c]">{tr.approvedByName}</span></div>
                          )}
                          {tr.approvedAt && (
                            <div><span className="text-gray-500">تاريخ الاعتماد:</span> <span className="font-medium text-[#1a3a5c]">{formatDate(tr.approvedAt)}</span></div>
                          )}
                          {tr.rejectionReason && (
                            <div className="sm:col-span-3"><span className="text-gray-500">سبب الرفض:</span> <span className="font-medium text-red-600">{tr.rejectionReason}</span></div>
                          )}
                          {tr.notes && (
                            <div className="sm:col-span-3"><span className="text-gray-500">ملاحظات:</span> <span className="text-gray-700">{tr.notes}</span></div>
                          )}
                          {tr.createdBy && (
                            <div><span className="text-gray-500">أنشئ بواسطة:</span> <span className="text-gray-700">{tr.createdBy}</span></div>
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
          <ArrowLeftRight className="h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-bold text-[#1a3a5c]">لا توجد تحويلات</h3>
          <p className="mt-2 text-sm text-gray-500">ابدأ بإنشاء تحويل جديد بين الخزائن</p>
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Create Transfer Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setShowCreate(false); resetForm(); }}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c]">تحويل جديد</h2>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الخزينة المصدر <span className="text-red-500">*</span></label>
                <select value={form.sourceTreasuryId} onChange={(e) => setForm({ ...form, sourceTreasuryId: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
                  <option value="">-- اختر الخزينة --</option>
                  {treasuries.map((t) => (<option key={t.id} value={t.id}>{t.name} — {formatCurrency(t.balance)}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الخزينة الوجهة <span className="text-red-500">*</span></label>
                <select value={form.destinationTreasuryId} onChange={(e) => setForm({ ...form, destinationTreasuryId: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
                  <option value="">-- اختر الخزينة --</option>
                  {treasuries.filter((t) => t.id !== form.sourceTreasuryId).map((t) => (<option key={t.id} value={t.id}>{t.name} — {formatCurrency(t.balance)}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">المبلغ <span className="text-red-500">*</span></label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" min={0} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ التحويل</label>
                  <input type="date" value={form.transferDate} onChange={(e) => setForm({ ...form, transferDate: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="ملاحظات إضافية..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCreate} disabled={saving || !form.sourceTreasuryId || !form.destinationTreasuryId || !form.amount} className="flex-1 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07d1a] disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : 'إنشاء التحويل'}
                </button>
                <button onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="حذف التحويل"
        message={`هل أنت متأكد من حذف التحويل رقم ${deleteTarget?.transferNumber || ''}؟`}
        confirmLabel="حذف"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Reject Dialog */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setRejectTarget(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[#1a3a5c] mb-4">رفض التحويل</h2>
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

export default function VaultTransfersPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl font-[Tajawal]">
          <VaultTransfersContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
