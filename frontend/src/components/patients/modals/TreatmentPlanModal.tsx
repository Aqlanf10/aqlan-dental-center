'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { AddTreatmentPlanStepRequest, DoctorDto } from '../../../types/api';
import { X, FilePlus, Loader2 } from 'lucide-react';

const PRIORITY_LABELS: Record<number, string> = { 0: 'منخفض', 1: 'متوسط', 2: 'عاجل', 3: 'طارئ' };

interface TreatmentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: () => void;
  editData?: { id: string; title: string; description: string | null; priority: number; notes: string | null; estimatedCost: number | null } | null;
}

export default function TreatmentPlanModal({ isOpen, onClose, patientId, onSuccess, editData }: TreatmentPlanModalProps) {
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!editData;
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 1,
    responsibleDoctorId: '',
    plannedDate: '',
    estimatedCost: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      api.get<DoctorDto[]>('/doctors').then(res => {
        setDoctors((res.data ?? []).filter(d => d.isActive));
      }).catch(() => {});
      if (editData) {
        setForm({
          title: editData.title,
          description: editData.description || '',
          priority: editData.priority,
          responsibleDoctorId: '',
          plannedDate: '',
          estimatedCost: editData.estimatedCost?.toString() || '',
          notes: editData.notes || '',
        });
      } else {
        setForm({ title: '', description: '', priority: 1, responsibleDoctorId: '', plannedDate: '', estimatedCost: '', notes: '' });
      }
    }
  }, [isOpen, editData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('يرجى إدخال عنوان الخطوة');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEditing && editData) {
        await api.put(`/general/treatment-plan-steps/${editData.id}`, {
          title: form.title,
          description: form.description || null,
          priority: form.priority,
          responsibleDoctorId: form.responsibleDoctorId || null,
          plannedDate: form.plannedDate || null,
          estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : null,
          notes: form.notes || null,
        });
      } else {
        const req: AddTreatmentPlanStepRequest = {
          patientId,
          title: form.title,
          description: form.description || null,
          priority: form.priority,
          responsibleDoctorId: form.responsibleDoctorId || null,
          plannedDate: form.plannedDate || null,
          estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : null,
          notes: form.notes || null,
        };
        await api.post('/general/treatment-plan-steps', req);
      }
      setForm({ title: '', description: '', priority: 1, responsibleDoctorId: '', plannedDate: '', estimatedCost: '', notes: '' });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ خطة العلاج');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-600"><FilePlus className="w-5 h-5" /></div>
            <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">{isEditing ? 'تعديل خطة العلاج' : 'إضافة خطوة علاجية'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">العنوان <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="مثال: حشوة سن 14" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">الأولوية</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]">
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">التكلفة التقديرية</label>
              <input type="number" value={form.estimatedCost} onChange={e => setForm({ ...form, estimatedCost: e.target.value })} placeholder="0.00" min={0} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب المسؤول</label>
              <select value={form.responsibleDoctorId} onChange={e => setForm({ ...form, responsibleDoctorId: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]">
                <option value="">-- اختر --</option>
                {doctors.map(d => <option key={d.id} value={d.id}>د. {d.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">التاريخ المخطط</label>
              <input type="date" value={form.plannedDate} onChange={e => setForm({ ...form, plannedDate: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5]" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">الوصف</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="وصف الخطوة..." className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving || !form.title.trim()} className="flex-1 rounded-lg bg-[#3d7ab5] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3d7ab5]/90 disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus className="w-4 h-4" />}
              {saving ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إضافة'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-[Tajawal]">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
