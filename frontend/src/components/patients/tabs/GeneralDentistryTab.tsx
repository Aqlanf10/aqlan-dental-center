'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { GeneralTreatmentDto, CreateGeneralTreatmentRequest, DoctorDto } from '../../../types/api';
import { GeneralTreatmentTypeLabels } from '../../../types/api';
import { Plus, Trash2, X, Loader2 } from 'lucide-react';

interface GeneralDentistryTabProps {
  patientId: string;
}

const formatCurrency = (amount: number) =>
  `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;

const formatDate = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('ar-SA') : '—';

export default function GeneralDentistryTab({ patientId }: GeneralDentistryTabProps) {
  const [treatments, setTreatments] = useState<GeneralTreatmentDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    treatmentType: 2, toothNumber: '', materialUsed: '', anesthesiaType: '', cost: '', doctorId: '', notes: '',
  });

  useEffect(() => { fetchTreatments(); }, [patientId]);
  useEffect(() => {
    api.get<DoctorDto[]>('/doctors').then(res => setDoctors((res.data ?? []).filter(d => d.isActive))).catch(() => {});
  }, []);

  const fetchTreatments = async () => {
    try {
      setIsLoading(true); setError(null);
      const res = await api.get<{ items: GeneralTreatmentDto[]; totalCount: number }>(`/general?patientId=${patientId}`);
      const items = res.data?.items ?? (Array.isArray(res.data) ? res.data as unknown as GeneralTreatmentDto[] : []);
      setTreatments(items);
    } catch { setError('حدث خطأ أثناء تحميل العلاجات العامة'); }
    finally { setIsLoading(false); }
  };

  const handleAdd = async () => {
    setSaving(true); setFormError(null);
    try {
      const req: CreateGeneralTreatmentRequest = {
        patientId, treatmentType: form.treatmentType,
        toothNumber: form.toothNumber ? Number(form.toothNumber) : null,
        materialUsed: form.materialUsed || null, anesthesiaType: form.anesthesiaType || null,
        cost: form.cost ? Number(form.cost) : null, doctorId: form.doctorId || null,
        notes: form.notes || null,
      };
      await api.post('/general', req);
      setShowAdd(false);
      setForm({ treatmentType: 2, toothNumber: '', materialUsed: '', anesthesiaType: '', cost: '', doctorId: '', notes: '' });
      fetchTreatments();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'خطأ في الحفظ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العلاج؟')) return;
    try { await api.delete(`/general/${id}`); fetchTreatments(); } catch { /* silent */ }
  };

  if (isLoading) return <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" /></div>;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1a3a5c]">العلاجات العامة</h3>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 rounded-lg bg-[#f5922e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e07d1a] font-[Tajawal]">
          <Plus className="w-3.5 h-3.5" /> إضافة علاج
        </button>
      </div>

      {treatments.length === 0 && !showAdd && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <p className="mt-4 text-lg font-bold text-gray-400">لا توجد علاجات عامة مسجلة</p>
        </div>
      )}

      {treatments.map(t => {
        const typeLabel = GeneralTreatmentTypeLabels[t.treatmentType] || t.treatmentTypeDisplay || '—';
        const typeColor = 'bg-[#3d7ab5]/10 text-[#3d7ab5]';
        return (
          <div key={t.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm group">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${typeColor}`}>{typeLabel}</span>
                  {t.toothNumber != null && <span className="inline-flex items-center rounded-full bg-[#1a3a5c]/10 px-2 py-0.5 text-xs font-medium text-[#1a3a5c]">سن #{t.toothNumber}</span>}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  {t.materialUsed && <span>المادة: <span className="font-medium text-[#1a3a5c]">{t.materialUsed}</span></span>}
                  {t.anesthesiaType && <span>التخدير: <span className="font-medium text-[#1a3a5c]">{t.anesthesiaType}</span></span>}
                  {t.doctorName && <span>الطبيب: <span className="font-medium text-[#1a3a5c]">{t.doctorName}</span></span>}
                </div>
                {t.notes && <p className="text-xs text-gray-400 mt-1">{t.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-left space-y-1">
                  {t.cost != null && <p className="text-sm font-bold text-[#f5922e]">{formatCurrency(t.cost)}</p>}
                  <p className="text-xs text-gray-400">{formatDate(t.createdAt)}</p>
                </div>
                <button onClick={() => handleDelete(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1 rounded" title="حذف">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add Treatment Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">إضافة علاج عام</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {formError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع العلاج</label>
                <select value={form.treatmentType} onChange={e => setForm({...form, treatmentType: Number(e.target.value)})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]">
                  {Object.entries(GeneralTreatmentTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">رقم السن</label>
                  <input type="number" value={form.toothNumber} onChange={e => setForm({...form, toothNumber: e.target.value})} placeholder="مثال: 14" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">التكلفة</label>
                  <input type="number" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} placeholder="0.00" min={0} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">المادة المستخدمة</label>
                  <input type="text" value={form.materialUsed} onChange={e => setForm({...form, materialUsed: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع التخدير</label>
                  <input type="text" value={form.anesthesiaType} onChange={e => setForm({...form, anesthesiaType: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب</label>
                <select value={form.doctorId} onChange={e => setForm({...form, doctorId: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]">
                  <option value="">-- اختر --</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>د. {d.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleAdd} disabled={saving} className="flex-1 rounded-lg bg-[#3d7ab5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3d7ab5]/90 disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'جاري الحفظ...' : 'إضافة العلاج'}
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
