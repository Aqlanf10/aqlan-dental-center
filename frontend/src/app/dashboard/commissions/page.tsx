'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import type {
  DoctorCommissionPaymentDto,
  DoctorDto,
  PagedResult,
  PayCommissionRequest,
} from '@/types/api';
import {
  CommissionStatusLabels,
  CommissionStatusColors,
  PaymentMethodLabels,
} from '@/types/api';

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA');
}

type TabKey = 'commissions' | 'defaults';

function CommissionsContent() {
  const [commissions, setCommissions] = useState<DoctorCommissionPaymentDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [doctorFilter, setDoctorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | ''>('');
  const [activeTab, setActiveTab] = useState<TabKey>('commissions');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState(0);
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  const pageSize = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/commissions?page=${page}&pageSize=${pageSize}`;
      if (doctorFilter) url += `&doctorId=${doctorFilter}`;
      if (statusFilter !== '') url += `&status=${statusFilter}`;
      const [comRes, docRes] = await Promise.all([
        api.get<PagedResult<DoctorCommissionPaymentDto>>(url),
        api.get<DoctorDto[]>('/doctors').catch(() => ({ data: [] as DoctorDto[] })),
      ]);
      setCommissions(comRes.data?.items ?? []);
      setTotalCount(comRes.data?.totalCount ?? 0);
      setDoctors((docRes.data ?? []).filter((d: DoctorDto) => d.isActive));
    } catch {
      // silent
    }
    setLoading(false);
  }, [page, doctorFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleApprove = async () => {
    if (selectedIds.size === 0) return;
    try {
      await api.post('/commissions/approve', { commissionIds: Array.from(selectedIds) });
      setSelectedIds(new Set());
      loadData();
    } catch {
      // silent
    }
  };

  const handlePay = async () => {
    if (selectedIds.size === 0) return;
    setPaying(true);
    try {
      const req: PayCommissionRequest = {
        commissionIds: Array.from(selectedIds),
        paymentMethod: payMethod,
        notes: payNotes || null,
      };
      await api.post('/commissions/pay', req);
      setShowPayModal(false);
      setPayNotes('');
      setSelectedIds(new Set());
      loadData();
    } catch {
      // silent
    }
    setPaying(false);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const totalSelectedAmount = commissions
    .filter((c) => selectedIds.has(c.id))
    .reduce((sum, c) => sum + c.commissionAmount, 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-[#1a3a5c]">عمولات الأطباء</h1>
        <p className="text-sm text-gray-500">إدارة عمولات الأطباء والمدفوعات</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button onClick={() => setActiveTab('commissions')} className={`px-4 py-2.5 text-sm font-medium ${activeTab === 'commissions' ? 'text-[#1a3a5c] border-b-2 border-[#1a3a5c]' : 'text-gray-500 hover:text-[#1a3a5c]'}`}>العمولات</button>
        <button onClick={() => setActiveTab('defaults')} className={`px-4 py-2.5 text-sm font-medium ${activeTab === 'defaults' ? 'text-[#1a3a5c] border-b-2 border-[#1a3a5c]' : 'text-gray-500 hover:text-[#1a3a5c]'}`}>نسب العمولة الافتراضية</button>
      </div>

      {activeTab === 'commissions' && (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <select value={doctorFilter} onChange={(e) => { setDoctorFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
              <option value="">كل الأطباء</option>
              {doctors.map((d) => (<option key={d.id} value={d.id}>د. {d.fullName}</option>))}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
              <option value="">كل الحالات</option>
              {Object.entries(CommissionStatusLabels).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
            </select>
            {selectedIds.size > 0 && (
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-600">المحدد: {formatCurrency(totalSelectedAmount)}</span>
                <button onClick={handleApprove} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">اعتماد المحدد</button>
                <button onClick={() => setShowPayModal(true)} className="rounded-lg bg-[#3d7ab5] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2c6494]">صرف المحدد</button>
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" />
            </div>
          ) : commissions.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-right">
                      <input type="checkbox" checked={selectedIds.size === commissions.length && commissions.length > 0} onChange={() => { if (selectedIds.size === commissions.length) setSelectedIds(new Set()); else setSelectedIds(new Set(commissions.map((c) => c.id))); }} className="rounded border-gray-300" />
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">الطبيب</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">الخدمة</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">المريض</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">مبلغ العمولة</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">النسبة</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {commissions.map((c) => (
                    <tr key={c.id} className={`hover:bg-gray-50 ${selectedIds.has(c.id) ? 'bg-[#3d7ab5]/5' : ''}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-gray-300" />
                      </td>
                      <td className="px-4 py-3 font-medium text-[#1a3a5c]">د. {c.doctorName}</td>
                      <td className="px-4 py-3 text-gray-700">{c.serviceNameSnapshot || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{c.patientName || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{formatCurrency(c.commissionAmount)}</td>
                      <td className="px-4 py-3 text-gray-500">{c.commissionPercentage}%</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CommissionStatusColors[c.status] || 'bg-gray-100 text-gray-700'}`}>
                          {CommissionStatusLabels[c.status] || c.statusDisplay}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
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
              <p className="mt-3 text-sm text-gray-400">لا توجد عمولات</p>
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
        </>
      )}

      {activeTab === 'defaults' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-bold text-[#1a3a5c]">نسب العمولة الافتراضية حسب الخدمة</h3>
          <p className="text-sm text-gray-500 mb-4">يمكن تعيين نسبة عمولة افتراضية لكل خدمة سريرية. سيتم تطبيقها تلقائيًا عند إنشاء فاتورة.</p>
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-400">سيتم ربط نسب العمولة من صفحة إعدادات الخدمات السريرية</p>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPayModal(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c]">صرف العمولات</h2>
              <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">عدد العمولات: <span className="font-bold">{selectedIds.size}</span> | الإجمالي: <span className="font-bold text-[#1a3a5c]">{formatCurrency(totalSelectedAmount)}</span></p>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">طريقة الدفع <span className="text-red-500">*</span></label>
                <select value={payMethod} onChange={(e) => setPayMethod(Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
                  {Object.entries(PaymentMethodLabels).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea value={payNotes} onChange={(e) => setPayNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handlePay} disabled={paying} className="flex-1 rounded-lg bg-[#3d7ab5] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2c6494] disabled:opacity-50">
                  {paying ? 'جاري الصرف...' : 'صرف العمولات'}
                </button>
                <button onClick={() => setShowPayModal(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommissionsPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl font-[Tajawal]">
          <CommissionsContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
