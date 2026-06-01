'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { SurgeryCaseDto, CreateSurgeryCaseRequest, DoctorDto } from '../../../types/api';
import { SurgeryCaseStatusLabels, SurgeryCaseStatusColors } from '../../../types/api';
import { Plus, X, Loader2, CheckCircle } from 'lucide-react';

interface SurgeryTabProps {
  patientId: string;
}

const formatDate = (date: string | null) => date ? new Date(date).toLocaleDateString('ar-SA') : '—';

export default function SurgeryTab({ patientId }: SurgeryTabProps) {
  const [cases, setCases] = useState<SurgeryCaseDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    surgeryType: '', teethInvolved: '', doctorId: '', surgeryDate: '',
    anesthesiaType: '', preopNotes: '', notes: '',
  });

  useEffect(() => { fetchCases(); }, [patientId]);
  useEffect(() => {
    api.get<DoctorDto[]>('/doctors').then(res => setDoctors((res.data ?? []).filter(d => d.isActive))).catch(() => {});
  }, []);

  const fetchCases = async () => {
    try {
      setIsLoading(true); setError(null);
      const res = await api.get<SurgeryCaseDto[]>(`/surgery?patientId=${patientId}`);
      const items = Array.isArray(res.data) ? res.data : [];
      setCases(items);
    } catch { setError('حدث خطأ أثناء تحميل حالات الجراحة'); }
    finally { setIsLoading(false); }
  };

  const handleAdd = async () => {
    if (!form.surgeryType.trim()) { setFormError('يرجى إدخال نوع الجراحة'); return; }
    setSaving(true); setFormError(null);
    try {
      const req: CreateSurgeryCaseRequest = {
        patientId, surgeryType: form.surgeryType,
        teethInvolved: form.teethInvolved || null, doctorId: form.doctorId || null,
        surgeryDate: form.surgeryDate || null, anesthesiaType: form.anesthesiaType || null,
        preopNotes: form.preopNotes || null, notes: form.notes || null,
      };
      await api.post('/surgery', req);
      setShowAdd(false);
      setForm({ surgeryType: '', teethInvolved: '', doctorId: '', surgeryDate: '', anesthesiaType: '', preopNotes: '', notes: '' });
      fetchCases();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'خطأ في الحفظ'); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (caseId: string, status: number) => {
    try { await api.patch(`/surgery/${caseId}/status`, { status }); fetchCases(); } catch { /* silent */ }
  };

  if (isLoading) return <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" /></div>;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1a3a5c]">حالات الجراحة</h3>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 rounded-lg bg-[#f5922e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e07d1a] font-[Tajawal]">
          <Plus className="w-3.5 h-3.5" /> إضافة حالة
        </button>
      </div>

      {cases.length === 0 && !showAdd && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <p className="mt-4 text-lg font-bold text-gray-400">لا توجد حالات جراحة مسجلة</p>
        </div>
      )}

      {cases.map(c => {
        const statusLabel = SurgeryCaseStatusLabels[c.status] || c.statusDisplay;
        const statusColor = SurgeryCaseStatusColors[c.status] || 'bg-gray-100 text-gray-700';
        return (
          <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm group">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[#1a3a5c]">حالة #{c.caseNumber}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColor}`}>{statusLabel}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span>نوع الجراحة: <span className="font-medium text-[#1a3a5c]">{c.surgeryType}</span></span>
                  {c.teethInvolved && <span>الأسنان: <span className="font-medium text-[#1a3a5c]">{c.teethInvolved}</span></span>}
                  {c.doctorName && <span>الطبيب: <span className="font-medium text-[#1a3a5c]">{c.doctorName}</span></span>}
                  {c.anesthesiaType && <span>التخدير: <span className="font-medium text-[#1a3a5c]">{c.anesthesiaType}</span></span>}
                </div>
                {/* Status actions */}
                <div className="mt-2 flex gap-3">
                  {c.status === 0 && <button onClick={() => handleUpdateStatus(c.id, 1)} className="text-xs text-[#3d7ab5] hover:underline font-[Tajawal]">بدء الجراحة</button>}
                  {c.status === 1 && <button onClick={() => handleUpdateStatus(c.id, 2)} className="text-xs text-green-600 hover:underline font-[Tajawal] flex items-center gap-1"><CheckCircle className="w-3 h-3" /> إكمال</button>}
                  {(c.status === 0 || c.status === 1) && <button onClick={() => handleUpdateStatus(c.id, 3)} className="text-xs text-red-500 hover:underline font-[Tajawal]">إلغاء</button>}
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm text-gray-500">{formatDate(c.surgeryDate)}</p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add Case Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">إضافة حالة جراحية</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {formError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع الجراحة <span className="text-red-500">*</span></label>
                <input type="text" value={form.surgeryType} onChange={e => setForm({...form, surgeryType: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الأسنان المتضمنة</label>
                  <input type="text" value={form.teethInvolved} onChange={e => setForm({...form, teethInvolved: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب</label>
                  <select value={form.doctorId} onChange={e => setForm({...form, doctorId: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]">
                    <option value="">-- اختر --</option>
                    {doctors.map(d => <option key={d.id} value={d.id}>د. {d.fullName}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ الجراحة</label>
                  <input type="date" value={form.surgeryDate} onChange={e => setForm({...form, surgeryDate: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع التخدير</label>
                  <input type="text" value={form.anesthesiaType} onChange={e => setForm({...form, anesthesiaType: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleAdd} disabled={saving || !form.surgeryType.trim()} className="flex-1 rounded-lg bg-[#3d7ab5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3d7ab5]/90 disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]">
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
