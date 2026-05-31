'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Pagination from '@/components/common/Pagination';
import { api } from '@/lib/api';
import type { ReferralDto, PatientDto, DoctorDto, CreateReferralRequest, UpdateReferralRequest } from '@/types/api';
import { ReferralStatusLabels, ReferralStatusColors } from '@/types/api';

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
  const [searchTerm, setSearchTerm] = useState('');

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
    if (!form.patientId || !form.fromDoctorId || !form.toDoctorId) return;
    setSaving(true);
    try {
      const req: CreateReferralRequest = {
        patientId: form.patientId, fromDoctorId: form.fromDoctorId, toDoctorId: form.toDoctorId,
        reason: form.reason || null, notes: form.notes || null,
      };
      await api.post('/referrals', req);
      setShowCreate(false);
      setForm({ patientId: '', fromDoctorId: '', toDoctorId: '', reason: '', notes: '' });
      fetchReferrals();
    } catch { /* error */ }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      const req: UpdateReferralRequest = { status: newStatus };
      await api.put(`/referrals/${id}`, req);
      fetchReferrals();
    } catch { /* error */ }
  };

  const filteredReferrals = referrals.filter(r =>
    !searchTerm || r.patientName.includes(searchTerm) || r.fromDoctorName.includes(searchTerm) || r.toDoctorName.includes(searchTerm)
  );

  // Stats
  const pendingCount = referrals.filter(r => r.status === 0).length;
  const acceptedCount = referrals.filter(r => r.status === 1).length;
  const rejectedCount = referrals.filter(r => r.status === 2).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">الإحالات</h1>
          <p className="text-sm text-gray-500">إدارة إحالات المرضى بين الأطباء</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          إحالة جديدة
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy/5 text-navy">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">إجمالي الإحالات</p>
              <p className="text-xl font-bold text-navy">{totalCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-yellow-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">قيد الانتظار</p>
              <p className="text-xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-green-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">مقبولة</p>
              <p className="text-xl font-bold text-green-600">{acceptedCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-red-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">مرفوضة</p>
              <p className="text-xl font-bold text-red-600">{rejectedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث بالمريض أو الطبيب..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange sm:w-72"
        />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange">
          <option value="">كل الحالات</option>
          {Object.entries(ReferralStatusLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" /></div>
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
                  <td className="px-4 py-3 font-medium text-navy">{r.patientName}</td>
                  <td className="px-4 py-3 text-gray-700">د. {r.fromDoctorName}</td>
                  <td className="px-4 py-3 text-gray-700">د. {r.toDoctorName}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-gray-500">{r.reason || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(r.createdAt).toLocaleDateString('ar-SA')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ReferralStatusColors[r.status] || 'bg-gray-100 text-gray-700'}`}>
                      {ReferralStatusLabels[r.status] || r.statusDisplay}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 0 && (
                      <div className="flex gap-2">
                        <button onClick={() => handleStatusChange(r.id, 1)} className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 transition-colors">قبول</button>
                        <button onClick={() => handleStatusChange(r.id, 2)} className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors">رفض</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          <p className="mt-3 text-sm text-gray-500">لا توجد إحالات</p>
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">إحالة جديدة</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">المريض <span className="text-red-500">*</span></label>
                <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange">
                  <option value="">-- اختر المريض --</option>
                  {patients.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.patientNumber} - {p.fullName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب المُحيل <span className="text-red-500">*</span></label>
                  <select value={form.fromDoctorId} onChange={(e) => setForm({ ...form, fromDoctorId: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange">
                    <option value="">-- اختر --</option>
                    {doctors.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>د. {d.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب المُحال إليه <span className="text-red-500">*</span></label>
                  <select value={form.toDoctorId} onChange={(e) => setForm({ ...form, toDoctorId: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange">
                    <option value="">-- اختر --</option>
                    {doctors.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>د. {d.fullName}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">سبب الإحالة</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} placeholder="سبب الإحالة..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="ملاحظات إضافية..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCreate} disabled={saving || !form.patientId || !form.fromDoctorId || !form.toDoctorId}
                  className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : 'إنشاء الإحالة'}
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

export default function ReferralsPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <ReferralsContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
