'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
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
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

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
  }, [page, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!form.sourceTreasuryId || !form.destinationTreasuryId || !form.amount || Number(form.amount) <= 0) return;
    if (form.sourceTreasuryId === form.destinationTreasuryId) return;
    setSaving(true);
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
      setForm({ sourceTreasuryId: '', destinationTreasuryId: '', amount: '', transferDate: new Date().toISOString().split('T')[0], notes: '' });
      loadData();
    } catch {
      // silent
    }
    setSaving(false);
  };

  const handleApprove = async (id: string) => {
    try { await api.post(`/vault-transfers/${id}/approve`); loadData(); } catch { /* silent */ }
  };

  const handleReject = async (id: string) => {
    try { await api.post(`/vault-transfers/${id}/reject`); loadData(); } catch { /* silent */ }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-[#1a3a5c]">تحويلات الخزينة</h1>
        <p className="text-sm text-gray-500">إدارة التحويلات بين الخزائن والاعتماد</p>
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

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#f5922e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#e07d1a]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          تحويل جديد
        </button>
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
                <tr key={tr.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#1a3a5c]">{tr.transferNumber}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="text-[#1a3a5c]">{tr.sourceTreasuryName}</span>
                    <span className="mx-2 text-gray-400">←</span>
                    <span className="text-[#3d7ab5]">{tr.destinationTreasuryName}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(tr.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TransferStatusColors[tr.status] || 'bg-gray-100 text-gray-700'}`}>
                      {TransferStatusLabels[tr.status] || tr.statusDisplay}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(tr.transferDate)}</td>
                  <td className="px-4 py-3">
                    {tr.status === 0 && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(tr.id)} className="rounded px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100">اعتماد</button>
                        <button onClick={() => handleReject(tr.id)} className="rounded px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100">رفض</button>
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <p className="mt-3 text-sm text-gray-400">لا توجد تحويلات</p>
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

      {/* Create Transfer Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c]">تحويل جديد</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
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
                <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
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
