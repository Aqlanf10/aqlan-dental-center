'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { PatientDocumentDto } from '@/types/api';
import { DocumentTypeLabels } from '@/types/api';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA');
}

interface DocumentsTabProps {
  patientId: string;
  canEdit: boolean;
}

export default function DocumentsTab({ patientId, canEdit }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<PatientDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [docTypeFilter, setDocTypeFilter] = useState<number | ''>('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    documentType: 0,
    title: '',
    description: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/patients/${patientId}/documents`;
      if (docTypeFilter !== '') url += `?documentType=${docTypeFilter}`;
      const res = await api.get<PatientDocumentDto[]>(url).catch(() => ({ data: [] as PatientDocumentDto[] }));
      setDocuments(res.data ?? []);
    } catch {
      // silent
    }
    setLoading(false);
  }, [patientId, docTypeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpload = async () => {
    if (!form.title) return;
    setUploading(true);
    try {
      const formData = new FormData();
      const fileInput = document.getElementById('document-file') as HTMLInputElement;
      if (fileInput?.files?.length) {
        formData.append('file', fileInput.files[0]);
      }
      formData.append('documentType', String(form.documentType));
      formData.append('title', form.title);
      if (form.description) formData.append('description', form.description);

      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/patients/${patientId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      setShowUpload(false);
      setForm({ documentType: 0, title: '', description: '' });
      loadData();
    } catch {
      // silent
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستند؟')) return;
    try {
      await api.delete(`/patients/${patientId}/documents/${id}`);
      loadData();
    } catch {
      // silent
    }
  };

  const filteredDocs = docTypeFilter !== ''
    ? documents.filter((d) => d.documentType === docTypeFilter)
    : documents;

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select
          value={docTypeFilter}
          onChange={(e) => setDocTypeFilter(e.target.value === '' ? '' : Number(e.target.value))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]"
        >
          <option value="">كل أنواع المستندات</option>
          {Object.entries(DocumentTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        {canEdit && (
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#f5922e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#e07d1a]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            رفع مستند
          </button>
        )}
      </div>

      {/* Document List */}
      {filteredDocs.length > 0 ? (
        <div className="space-y-2">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#3d7ab5]/10">
                  <svg className="h-5 w-5 text-[#3d7ab5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1a3a5c] truncate">{doc.title}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium">
                      {DocumentTypeLabels[doc.documentType] || doc.documentTypeDisplay}
                    </span>
                    <span>{formatDate(doc.uploadedAt)}</span>
                    {doc.isSigned ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        موقّع
                      </span>
                    ) : (
                      <span className="text-yellow-600">غير موقّع</span>
                    )}
                  </div>
                  {doc.description && <p className="mt-0.5 text-xs text-gray-400 truncate">{doc.description}</p>}
                </div>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-3 text-sm text-gray-400">لا توجد مستندات</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowUpload(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c]">رفع مستند</h2>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الملف <span className="text-red-500">*</span></label>
                <input id="document-file" type="file" className="w-full text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع المستند</label>
                <select value={form.documentType} onChange={(e) => setForm({ ...form, documentType: Number(e.target.value) })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
                  {Object.entries(DocumentTypeLabels).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">العنوان <span className="text-red-500">*</span></label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" placeholder="عنوان المستند..." />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الوصف</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" placeholder="وصف إضافي..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleUpload} disabled={uploading || !form.title} className="flex-1 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07d1a] disabled:opacity-50">
                  {uploading ? 'جاري الرفع...' : 'رفع المستند'}
                </button>
                <button onClick={() => setShowUpload(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
