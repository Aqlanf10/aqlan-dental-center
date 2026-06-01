'use client';

import React, { useState } from 'react';

import { X, Paperclip, Loader2 } from 'lucide-react';
import { DocumentTypeLabels } from '../../../types/api';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: () => void;
}

export default function UploadDocumentModal({ isOpen, onClose, patientId, onSuccess }: UploadDocumentModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    documentType: 0,
    title: '',
    description: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('يرجى إدخال عنوان المستند');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      const fileInput = document.getElementById('document-upload-file') as HTMLInputElement;
      if (fileInput?.files?.length) {
        formData.append('file', fileInput.files[0]);
      } else {
        setError('يرجى اختيار ملف المستند');
        setSaving(false);
        return;
      }
      formData.append('documentType', String(form.documentType));
      formData.append('title', form.title);
      if (form.description) formData.append('description', form.description);

      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      await fetch(`${apiUrl}/patients/${patientId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      setForm({ documentType: 0, title: '', description: '' });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء رفع المستند');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-violet-100 text-violet-600"><Paperclip className="w-5 h-5" /></div>
            <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">رفع مستند</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">الملف <span className="text-red-500">*</span></label>
            <input id="document-upload-file" type="file" className="w-full text-sm" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع المستند</label>
            <select value={form.documentType} onChange={e => setForm({ ...form, documentType: Number(e.target.value) })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]">
              {Object.entries(DocumentTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">العنوان <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="عنوان المستند..." className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">الوصف</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="وصف إضافي..." className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving || !form.title.trim()} className="flex-1 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07d1a] disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              {saving ? 'جاري الرفع...' : 'رفع المستند'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-[Tajawal]">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
