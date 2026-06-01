'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { DoctorDto, CreateWalkInVisitRequest } from '../../../types/api';
import { X, Stethoscope, Loader2 } from 'lucide-react';

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: () => void;
}

export default function NewSessionModal({ isOpen, onClose, patientId, onSuccess }: NewSessionModalProps) {
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    doctorId: '',
    chiefComplaint: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      api.get<DoctorDto[]>('/doctors').then(res => {
        setDoctors((res.data ?? []).filter(d => d.isActive));
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.doctorId) {
      setError('يرجى اختيار الطبيب');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const req: CreateWalkInVisitRequest = {
        patientId,
        doctorId: form.doctorId,
        chiefComplaint: form.chiefComplaint || null,
        notes: form.notes || null,
      };
      await api.post('/daily-visits/walk-in', req);
      setForm({ doctorId: '', chiefComplaint: '', notes: '' });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الجلسة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-600"><Stethoscope className="w-5 h-5" /></div>
            <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">جلسة سريرية جديدة</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب <span className="text-red-500">*</span></label>
            <select
              value={form.doctorId}
              onChange={e => setForm({ ...form, doctorId: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]"
            >
              <option value="">-- اختر الطبيب --</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>د. {d.fullName} - {d.specialty}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">الشكوى الرئيسية</label>
            <textarea
              value={form.chiefComplaint}
              onChange={e => setForm({ ...form, chiefComplaint: e.target.value })}
              rows={3}
              placeholder="مثال: ألم في الضرس العلوي..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="ملاحظات إضافية..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !form.doctorId}
              className="flex-1 rounded-lg bg-[#3d7ab5] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3d7ab5]/90 disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />}
              {saving ? 'جاري الإنشاء...' : 'بدء الجلسة'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-[Tajawal]">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
