'use client';

import React, { useState } from 'react';
import { api } from '../../../lib/api';
import type { AddPrescriptionRequest } from '../../../types/api';
import { X, Pill, Loader2 } from 'lucide-react';

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  visitId?: string | null;
  onSuccess: () => void;
}

export default function PrescriptionModal({ isOpen, onClose, visitId, onSuccess }: PrescriptionModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    medicationName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicationName.trim()) {
      setError('يرجى إدخال اسم الدواء');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // If we have a visit, add prescription to that visit
      if (visitId) {
        const req: AddPrescriptionRequest = {
          medicationName: form.medicationName,
          dosage: form.dosage || null,
          frequency: form.frequency || null,
          duration: form.duration || null,
          instructions: form.instructions || null,
        };
        await api.post(`/clinical-visits/${visitId}/prescriptions`, req);
      }
      setForm({ medicationName: '', dosage: '', frequency: '', duration: '', instructions: '' });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الوصفة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-600"><Pill className="w-5 h-5" /></div>
            <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">وصفة طبية جديدة</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">اسم الدواء <span className="text-red-500">*</span></label>
            <input type="text" value={form.medicationName} onChange={e => setForm({ ...form, medicationName: e.target.value })} placeholder="مثال: أموكسيسيلين 500 ملغ" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">الجرعة</label>
              <input type="text" value={form.dosage} onChange={e => setForm({ ...form, dosage: e.target.value })} placeholder="مثال: كبسولة واحدة" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">التكرار</label>
              <input type="text" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} placeholder="مثال: 3 مرات يومياً" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">المدة</label>
              <input type="text" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} placeholder="مثال: 7 أيام" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">التعليمات</label>
              <input type="text" value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} placeholder="مثال: بعد الأكل" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving || !form.medicationName.trim()} className="flex-1 rounded-lg bg-[#3d7ab5] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3d7ab5]/90 disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pill className="w-4 h-4" />}
              {saving ? 'جاري الحفظ...' : 'حفظ الوصفة'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-[Tajawal]">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
