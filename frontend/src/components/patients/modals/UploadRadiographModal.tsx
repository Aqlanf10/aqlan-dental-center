'use client';

import React, { useState } from 'react';

import { X, Camera, Loader2 } from 'lucide-react';
import { XrayTypeLabels } from '../../../types/api';

interface UploadRadiographModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: () => void;
}

export default function UploadRadiographModal({ isOpen, onClose, patientId, onSuccess }: UploadRadiographModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    xrayType: 0,
    description: '',
    takenDate: new Date().toISOString().split('T')[0],
    labName: '',
    doctorId: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      const fileInput = document.getElementById('radiograph-upload-file') as HTMLInputElement;
      if (fileInput?.files?.length) {
        formData.append('file', fileInput.files[0]);
      } else {
        setError('يرجى اختيار ملف الأشعة');
        setSaving(false);
        return;
      }
      formData.append('xrayType', String(form.xrayType));
      if (form.description) formData.append('description', form.description);
      if (form.takenDate) formData.append('takenDate', form.takenDate);
      if (form.labName) formData.append('labName', form.labName);
      if (form.doctorId) formData.append('doctorId', form.doctorId);

      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      await fetch(`${apiUrl}/patients/${patientId}/radiographs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      setForm({ xrayType: 0, description: '', takenDate: new Date().toISOString().split('T')[0], labName: '', doctorId: '' });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء رفع الأشعة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-violet-100 text-violet-600"><Camera className="w-5 h-5" /></div>
            <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">رفع أشعة</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">ملف الأشعة <span className="text-red-500">*</span></label>
            <input id="radiograph-upload-file" type="file" accept="image/*" className="w-full text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع الأشعة</label>
            <select value={form.xrayType} onChange={e => setForm({ ...form, xrayType: Number(e.target.value) })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]">
              {Object.entries(XrayTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">الوصف</label>
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ الالتقاط</label>
              <input type="date" value={form.takenDate} onChange={e => setForm({ ...form, takenDate: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5]" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">المخبر</label>
              <input type="text" value={form.labName} onChange={e => setForm({ ...form, labName: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07d1a] disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {saving ? 'جاري الرفع...' : 'رفع الأشعة'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-[Tajawal]">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
