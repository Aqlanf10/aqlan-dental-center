'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ClinicalPhotoDto, DoctorDto } from '@/types/api';
import { ClinicalPhotoCategoryLabels } from '@/types/api';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA');
}

interface ClinicalPhotosTabProps {
  patientId: string;
  canEdit: boolean;
}

export default function ClinicalPhotosTab({ patientId, canEdit }: ClinicalPhotosTabProps) {
  const [photos, setPhotos] = useState<ClinicalPhotoDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    category: 0,
    description: '',
    takenDate: new Date().toISOString().split('T')[0],
    doctorId: '',
  });

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/patients/${patientId}/clinical-photos`;
      if (categoryFilter !== '') url += `?category=${categoryFilter}`;
      const [photoRes, docRes] = await Promise.all([
        api.get<ClinicalPhotoDto[]>(url).catch(() => ({ data: [] as ClinicalPhotoDto[] })),
        api.get<DoctorDto[]>('/doctors').catch(() => ({ data: [] as DoctorDto[] })),
      ]);
      setPhotos(photoRes.data ?? []);
      setDoctors((docRes.data ?? []).filter((d: DoctorDto) => d.isActive));
    } catch {
      // silent
    }
    setLoading(false);
  }, [patientId, categoryFilter]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const handleUpload = async () => {
    setUploading(true);
    try {
      const formData = new FormData();
      const fileInput = document.getElementById('photo-file') as HTMLInputElement;
      if (fileInput?.files?.length) {
        formData.append('file', fileInput.files[0]);
      }
      formData.append('category', String(form.category));
      if (form.description) formData.append('description', form.description);
      if (form.takenDate) formData.append('takenDate', form.takenDate);
      if (form.doctorId) formData.append('doctorId', form.doctorId);

      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/patients/${patientId}/clinical-photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      setShowUpload(false);
      setForm({ category: 0, description: '', takenDate: new Date().toISOString().split('T')[0], doctorId: '' });
      loadPhotos();
    } catch {
      // silent
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الصورة؟')) return;
    try {
      await api.delete(`/patients/${patientId}/clinical-photos/${id}`);
      loadPhotos();
    } catch {
      // silent
    }
  };

  const filteredPhotos = categoryFilter !== ''
    ? photos.filter((p) => p.category === categoryFilter)
    : photos;

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
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value === '' ? '' : Number(e.target.value))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]"
        >
          <option value="">كل الفئات</option>
          {Object.entries(ClinicalPhotoCategoryLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        {canEdit && (
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#f5922e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#e07d1a]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            رفع صورة
          </button>
        )}
      </div>

      {/* Photo Grid */}
      {filteredPhotos.length > 0 ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className="group relative rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                {photo.thumbnailPath ? (
                  <img src={photo.thumbnailPath} alt={photo.description || photo.fileName} className="h-full w-full object-cover" />
                ) : (
                  <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#3d7ab5]/10 px-2 py-0.5 text-xs font-medium text-[#3d7ab5]">
                    {ClinicalPhotoCategoryLabels[photo.category] || photo.categoryDisplay}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(photo.takenDate)}</span>
                </div>
                {photo.description && <p className="mt-1 text-xs text-gray-500 truncate">{photo.description}</p>}
                {photo.doctorName && <p className="mt-0.5 text-xs text-gray-400">د. {photo.doctorName}</p>}
              </div>
              {canEdit && (
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/80 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-3 text-sm text-gray-400">لا توجد صور سريرية</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowUpload(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c]">رفع صورة سريرية</h2>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الصورة <span className="text-red-500">*</span></label>
                <input id="photo-file" type="file" accept="image/*" className="w-full text-sm" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الفئة</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: Number(e.target.value) })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
                  {Object.entries(ClinicalPhotoCategoryLabels).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الوصف</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ الالتقاط</label>
                  <input type="date" value={form.takenDate} onChange={(e) => setForm({ ...form, takenDate: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب</label>
                  <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
                    <option value="">-- اختر --</option>
                    {doctors.map((d) => (<option key={d.id} value={d.id}>د. {d.fullName}</option>))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleUpload} disabled={uploading} className="flex-1 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07d1a] disabled:opacity-50">
                  {uploading ? 'جاري الرفع...' : 'رفع الصورة'}
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
