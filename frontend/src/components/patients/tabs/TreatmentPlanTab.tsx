'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { TreatmentPlanStepDto, AddTreatmentPlanStepRequest, DoctorDto } from '../../../types/api';
import { Plus, Trash2, CheckCircle, X, Loader2 } from 'lucide-react';

interface TreatmentPlanTabProps {
  patientId: string;
  canEdit: boolean;
}

const PRIORITY_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'منخفض', color: 'bg-green-100 text-green-700' },
  1: { label: 'متوسط', color: 'bg-yellow-100 text-yellow-700' },
  2: { label: 'عاجل', color: 'bg-[#f5922e]/10 text-[#f5922e]' },
  3: { label: 'طارئ', color: 'bg-red-100 text-red-700' },
};

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'مخطط', color: 'bg-blue-100 text-blue-700' },
  1: { label: 'قيد التنفيذ', color: 'bg-yellow-100 text-yellow-700' },
  2: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
  3: { label: 'تم تخطيه', color: 'bg-gray-100 text-gray-600' },
  4: { label: 'ملغي', color: 'bg-red-100 text-red-700' },
};

const formatCurrency = (amount: number) =>
  `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;

export default function TreatmentPlanTab({ patientId, canEdit }: TreatmentPlanTabProps) {
  const [steps, setSteps] = useState<TreatmentPlanStepDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', priority: 1, responsibleDoctorId: '',
    plannedDate: '', estimatedCost: '', notes: '',
  });

  useEffect(() => { fetchSteps(); }, [patientId]);
  useEffect(() => {
    api.get<DoctorDto[]>('/doctors').then(res => setDoctors((res.data ?? []).filter(d => d.isActive))).catch(() => {});
  }, []);

  const fetchSteps = async () => {
    try {
      setIsLoading(true); setError(null);
      let res;
      try { res = await api.get<{ items: TreatmentPlanStepDto[]; totalCount: number }>(`/general/treatment-plan-steps?patientId=${patientId}`); }
      catch { res = await api.get<{ items: TreatmentPlanStepDto[]; totalCount: number }>(`/patients/${patientId}/treatment-plan-steps`); }
      const items = res.data?.items ?? [];
      setSteps(items);
    } catch { setError('حدث خطأ أثناء تحميل خطة العلاج'); }
    finally { setIsLoading(false); }
  };

  const handleAdd = async () => {
    if (!form.title.trim()) { setFormError('يرجى إدخال العنوان'); return; }
    setSaving(true); setFormError(null);
    try {
      const req: AddTreatmentPlanStepRequest = {
        patientId, title: form.title, description: form.description || null,
        priority: form.priority, responsibleDoctorId: form.responsibleDoctorId || null,
        plannedDate: form.plannedDate || null, estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : null,
        notes: form.notes || null,
      };
      await api.post('/general/treatment-plan-steps', req);
      setShowAdd(false);
      setForm({ title: '', description: '', priority: 1, responsibleDoctorId: '', plannedDate: '', estimatedCost: '', notes: '' });
      fetchSteps();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'خطأ في الحفظ'); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (stepId: string, status: number) => {
    try {
      await api.patch(`/general/treatment-plan-steps/${stepId}/status`, { status });
      fetchSteps();
    } catch { /* silent */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخطوة؟')) return;
    try { await api.delete(`/general/treatment-plan-steps/${id}`); fetchSteps(); } catch { /* silent */ }
  };

  if (isLoading) return <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" /></div>;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1a3a5c]">خطة العلاج</h3>
        {canEdit && (
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 rounded-lg bg-[#f5922e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e07d1a] font-[Tajawal]">
            <Plus className="w-3.5 h-3.5" /> إضافة خطوة
          </button>
        )}
      </div>

      {steps.length === 0 && !showAdd && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="mt-4 text-lg font-bold text-gray-400">لا توجد خطوات علاجية مسجلة</p>
        </div>
      )}

      {steps.sort((a, b) => a.sequenceNumber - b.sequenceNumber).map(s => {
        const priority = PRIORITY_MAP[s.priority] ?? { label: '—', color: 'bg-gray-100 text-gray-700' };
        const status = STATUS_MAP[s.status] ?? { label: '—', color: 'bg-gray-100 text-gray-700' };
        return (
          <div key={s.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm group">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a3a5c]/10 text-sm font-bold text-[#1a3a5c]">{s.sequenceNumber}</span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[#1a3a5c]">{s.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status.color}`}>{status.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${priority.color}`}>{priority.label}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    {s.department && <span>القسم: <span className="font-medium text-[#1a3a5c]">{s.department}</span></span>}
                    {s.toothArea && <span>المنطقة: <span className="font-medium text-[#1a3a5c]">{s.toothArea}</span></span>}
                    {s.responsibleDoctorName && <span>الطبيب: <span className="font-medium text-[#1a3a5c]">{s.responsibleDoctorName}</span></span>}
                  </div>
                  {s.notes && <p className="text-xs text-gray-400 mt-1">{s.notes}</p>}
                  {/* Status action buttons */}
                  {canEdit && s.status !== 2 && s.status !== 4 && (
                    <div className="mt-2 flex gap-2">
                      {s.status === 0 && (
                        <button onClick={() => handleUpdateStatus(s.id, 1)} className="text-xs text-[#3d7ab5] hover:underline font-[Tajawal]">بدء التنفيذ</button>
                      )}
                      {s.status === 1 && (
                        <button onClick={() => handleUpdateStatus(s.id, 2)} className="text-xs text-green-600 hover:underline font-[Tajawal] flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> إكمال
                        </button>
                      )}
                      <button onClick={() => handleUpdateStatus(s.id, 4)} className="text-xs text-red-500 hover:underline font-[Tajawal]">إلغاء</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {s.estimatedCost != null && <p className="text-sm font-bold text-[#f5922e] whitespace-nowrap">{formatCurrency(s.estimatedCost)}</p>}
                {canEdit && (
                  <button onClick={() => handleDelete(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1 rounded" title="حذف">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Add Step Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">إضافة خطوة علاجية</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {formError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">العنوان <span className="text-red-500">*</span></label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="مثال: حشوة سن 14" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الأولوية</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: Number(e.target.value)})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]">
                    {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">التكلفة التقديرية</label>
                  <input type="number" value={form.estimatedCost} onChange={e => setForm({...form, estimatedCost: e.target.value})} placeholder="0.00" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب المسؤول</label>
                <select value={form.responsibleDoctorId} onChange={e => setForm({...form, responsibleDoctorId: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]">
                  <option value="">-- اختر --</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>د. {d.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleAdd} disabled={saving || !form.title.trim()} className="flex-1 rounded-lg bg-[#3d7ab5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3d7ab5]/90 disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'جاري الحفظ...' : 'إضافة'}
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
