'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Pagination from '@/components/common/Pagination';
import SearchInput from '@/components/common/SearchInput';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { api } from '@/lib/api';
import type { ReferralDto, PatientDto, DoctorDto, CreateReferralRequest, UpdateReferralRequest } from '@/types/api';
import { ReferralStatusLabels, ReferralStatusColors } from '@/types/api';
import {
  Plus, ArrowLeftRight, CheckCircle, XCircle, Trash2,
  Filter, XCircle as XIcon,
} from 'lucide-react';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA');
}

function ReferralsContent() {
  const [referrals, setReferrals] = useState<ReferralDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ReferralDto | null>(null);

  const [form, setForm] = useState({
    patientId: '', fromDoctorId: '', toDoctorId: '', reason: '', notes: '',
  });

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter !== '' ? `&status=${statusFilter}` : '';
      const res = await api.get<{ items: ReferralDto[]; totalCount: number; totalPages: number }>(`/referrals?page=${page}&pageSize=${pageSize}${statusParam}`);
      setReferrals(res.data.items || []);
      setTotalCount(res.data.totalCount || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch { setReferrals([]); }
    setLoading(false);
  }, [statusFilter, page]);

  useEffect(() => { fetchReferrals(); }, [fetchReferrals]);

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, dRes] = await Promise.all([
          api.get<{ items: PatientDto[] }>('/patients?page=1&pageSize=1000'),
          api.get<{ items: DoctorDto[] }>('/doctors?page=1&pageSize=100'),
        ]);
        setPatients(pRes.data.items || []);
        setDoctors(dRes.data.items || []);
      } catch { /* silent */ }
    };
    load();
  }, []);

  const handleCreate = async () => {
    if (!form.patientId || !form.fromDoctorId || !form.toDoctorId) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (form.fromDoctorId === form.toDoctorId) {
      setError('لا يمكن إحالة المريض لنفس الطبيب');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const req: CreateReferralRequest = {
        patientId: form.patientId, fromDoctorId: form.fromDoctorId, toDoctorId: form.toDoctorId,
        reason: form.reason || null, notes: form.notes || null,
      };
      await api.post('/referrals', req);
      setShowCreate(false);
      setForm({ patientId: '', fromDoctorId: '', toDoctorId: '', reason: '', notes: '' });
      fetchReferrals();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ';
      setError(msg);
    }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      const req: UpdateReferralRequest = { status: newStatus };
      await api.put(`/referrals/${id}`, req);
      fetchReferrals();
    } catch { /* silent */ }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/referrals/${deleteTarget.id}`); setDeleteTarget(null); fetchReferrals(); } catch { /* silent */ }
  };

  const filteredReferrals = referrals.filter(r =>
    !searchTerm || r.patientName.includes(searchTerm) || r.fromDoctorName.includes(searchTerm) || r.toDoctorName.includes(searchTerm)
  );

  const pendingCount = referrals.filter(r => r.status === 0).length;
  const acceptedCount = referrals.filter(r => r.status === 1).length;
  const rejectedCount = referrals.filter(r => r.status === 2).length;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3a5c]">الإحالات</h1>
          <p className="text-sm text-gray-500">إدارة إحالات المرضى بين الأطباء</p>
        </div>
        <button onClick={() => { setForm({ patientId: '', fromDoctorId: '', toDoctorId: '', reason: '', notes: '' }); setError(''); setShowCreate(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#e07d1a]">
          <Plus className="h-4 w-4" /> إحالة جديدة
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a3a5c]/5 text-[#1a3a5c]"><ArrowLeftRight className="h-5 w-5" /></div>
            <div><p className="text-xs text-gray-500">إجمالي الإحالات</p><p className="text-xl font-bold text-[#1a3a5c]">{totalCount}</p></div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-yellow-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600"><Filter className="h-5 w-5" /></div>
            <div><p className="text-xs text-gray-500">قيد الانتظار</p><p className="text-xl font-bold text-yellow-600">{pendingCount}</p></div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-green-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600"><CheckCircle className="h-5 w-5" /></div>
            <div><p className="text-xs text-gray-500">مقبولة</p><p className="text-xl font-bold text-green-600">{acceptedCount}</p></div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-red-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600"><XCircle className="h-5 w-5" /></div>
            <div><p className="text-xs text-gray-500">مرفوضة</p><p className="text-xl font-bold text-red-600">{rejectedCount}</p></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:w-72">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="بحث بالمريض أو الطبيب..." />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
          <option value="">كل الحالات</option>
          {Object.entries(ReferralStatusLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" /></div>
      ) : filteredReferrals.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-right font-medium text-gray-600">المريض</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">من طبيب</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">إلى طبيب</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">السبب</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredReferrals.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-[#1a3a5c]">{r.patientName}</td>
                  <td className="px-4 py-3 text-gray-700">د. {r.fromDoctorName}</td>
                  <td className="px-4 py-3 text-gray-700">د. {r.toDoctorName}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-gray-500">{r.reason || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ReferralStatusColors[r.status] || 'bg-gray-100 text-gray-700'}`}>
                      {ReferralStatusLabels[r.status] || r.statusDisplay}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {r.status === 0 && (
                        <>
                          <button onClick={() => handleStatusChange(r.id, 1)} className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 transition-colors inline-flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> قبول</button>
                          <button onClick={() => handleStatusChange(r.id, 2)} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors inline-flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> رفض</button>
                        </>
                      )}
                      <button onClick={() => setDeleteTarget(r)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="حذف"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ArrowLeftRight className="h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-bold text-[#1a3a5c]">لا توجد إحالات</h3>
          <p className="mt-2 text-sm text-gray-500">ابدأ بإنشاء إحالة جديدة</p>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c]">إحالة جديدة</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><XIcon className="h-5 w-5" /></button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">المريض <span className="text-red-500">*</span></label>
                <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
                  <option value="">-- اختر المريض --</option>
                  {patients.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.patientNumber} - {p.fullName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب المُحيل <span className="text-red-500">*</span></label>
                  <select value={form.fromDoctorId} onChange={(e) => setForm({ ...form, fromDoctorId: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
                    <option value="">-- اختر --</option>
                    {doctors.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>د. {d.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب المُحال إليه <span className="text-red-500">*</span></label>
                  <select value={form.toDoctorId} onChange={(e) => setForm({ ...form, toDoctorId: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
                    <option value="">-- اختر --</option>
                    {doctors.filter(d => d.isActive && d.id !== form.fromDoctorId).map(d => <option key={d.id} value={d.id}>د. {d.fullName}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">سبب الإحالة</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} placeholder="سبب الإحالة..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="ملاحظات إضافية..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCreate} disabled={saving || !form.patientId || !form.fromDoctorId || !form.toDoctorId} className="flex-1 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07d1a] disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : 'إنشاء الإحالة'}
                </button>
                <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteTarget} title="حذف الإحالة" message="هل أنت متأكد من حذف هذه الإحالة؟" confirmLabel="حذف" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

export default function ReferralsPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl font-[Tajawal]">
          <ReferralsContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
