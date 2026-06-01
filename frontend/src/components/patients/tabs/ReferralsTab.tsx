'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { ReferralDto, CreateReferralRequest, DoctorDto } from '../../../types/api';
import { ReferralStatusLabels, ReferralStatusColors } from '../../../types/api';
import { Plus, X, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface ReferralsTabProps {
  patientId: string;
}

const formatDate = (date: string | null) => date ? new Date(date).toLocaleDateString('ar-SA') : '—';

export default function ReferralsTab({ patientId }: ReferralsTabProps) {
  const [referrals, setReferrals] = useState<ReferralDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ fromDoctorId: '', toDoctorId: '', reason: '', notes: '' });

  useEffect(() => { fetchReferrals(); }, [patientId]);
  useEffect(() => {
    api.get<DoctorDto[]>('/doctors').then(res => setDoctors((res.data ?? []).filter(d => d.isActive))).catch(() => {});
  }, []);

  const fetchReferrals = async () => {
    try {
      setIsLoading(true); setError(null);
      const res = await api.get<ReferralDto[]>(`/referrals?patientId=${patientId}`);
      const items = Array.isArray(res.data) ? res.data : [];
      setReferrals(items);
    } catch { setError('حدث خطأ أثناء تحميل الإحالات'); }
    finally { setIsLoading(false); }
  };

  const handleAdd = async () => {
    if (!form.fromDoctorId || !form.toDoctorId) { setFormError('يرجى اختيار الأطباء'); return; }
    if (form.fromDoctorId === form.toDoctorId) { setFormError('لا يمكن إحالة المريض لنفس الطبيب'); return; }
    setSaving(true); setFormError(null);
    try {
      const req: CreateReferralRequest = {
        patientId, fromDoctorId: form.fromDoctorId, toDoctorId: form.toDoctorId,
        reason: form.reason || null, notes: form.notes || null,
      };
      await api.post('/referrals', req);
      setShowAdd(false);
      setForm({ fromDoctorId: '', toDoctorId: '', reason: '', notes: '' });
      fetchReferrals();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'خطأ في الحفظ'); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (refId: string, status: number) => {
    try { await api.patch(`/referrals/${refId}/status`, { status }); fetchReferrals(); } catch { /* silent */ }
  };

  if (isLoading) return <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" /></div>;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1a3a5c]">الإحالات</h3>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 rounded-lg bg-[#f5922e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e07d1a] font-[Tajawal]">
          <Plus className="w-3.5 h-3.5" /> إحالة جديدة
        </button>
      </div>

      {referrals.length === 0 && !showAdd && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          <p className="mt-4 text-lg font-bold text-gray-400">لا توجد إحالات مسجلة</p>
        </div>
      )}

      {referrals.map(r => {
        const statusColor = ReferralStatusColors[r.status] || 'bg-gray-100 text-gray-700';
        return (
          <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm">
                    <span className="font-medium text-[#1a3a5c]">{r.fromDoctorName}</span>
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    <span className="font-medium text-[#3d7ab5]">{r.toDoctorName}</span>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColor}`}>{ReferralStatusLabels[r.status]}</span>
                </div>
                {r.reason && <p className="text-sm text-gray-500">السبب: <span className="font-medium text-[#1a3a5c]">{r.reason}</span></p>}
                {r.notes && <p className="text-xs text-gray-400">{r.notes}</p>}
                {/* Status Actions */}
                {r.status === 0 && (
                  <div className="mt-2 flex gap-3">
                    <button onClick={() => handleUpdateStatus(r.id, 1)} className="text-xs text-green-600 hover:underline font-[Tajawal] flex items-center gap-1"><CheckCircle className="w-3 h-3" /> قبول</button>
                    <button onClick={() => handleUpdateStatus(r.id, 2)} className="text-xs text-red-500 hover:underline font-[Tajawal] flex items-center gap-1"><XCircle className="w-3 h-3" /> رفض</button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 whitespace-nowrap">{formatDate(r.createdAt)}</p>
            </div>
          </div>
        );
      })}

      {/* Add Referral Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">إحالة جديدة</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {formError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">من طبيب <span className="text-red-500">*</span></label>
                <select value={form.fromDoctorId} onChange={e => setForm({...form, fromDoctorId: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]">
                  <option value="">-- اختر --</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>د. {d.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">إلى طبيب <span className="text-red-500">*</span></label>
                <select value={form.toDoctorId} onChange={e => setForm({...form, toDoctorId: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]">
                  <option value="">-- اختر --</option>
                  {doctors.filter(d => d.id !== form.fromDoctorId).map(d => <option key={d.id} value={d.id}>د. {d.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">السبب</label>
                <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleAdd} disabled={saving || !form.fromDoctorId || !form.toDoctorId} className="flex-1 rounded-lg bg-[#3d7ab5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3d7ab5]/90 disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'جاري الحفظ...' : 'إنشاء إحالة'}
                </button>
                <button onClick={() => setShowAdd(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-[Tajawal]">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
