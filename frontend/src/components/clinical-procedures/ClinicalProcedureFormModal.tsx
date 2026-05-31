'use client';

import { useState } from 'react';
import {
  ClinicalProcedureDto, CreateClinicalProcedureRequest, UpdateClinicalProcedureRequest,
  ClinicalProcedureTypeEnum, ClinicalProcedureStatusEnum,
} from '@/types/api';

const procedureTypeOptions = [
  { value: ClinicalProcedureTypeEnum.Consultation, label: 'استشارة' },
  { value: ClinicalProcedureTypeEnum.Filling, label: 'حشوة' },
  { value: ClinicalProcedureTypeEnum.Extraction, label: 'خلع' },
  { value: ClinicalProcedureTypeEnum.Scaling, label: 'تنظيف' },
  { value: ClinicalProcedureTypeEnum.RootCanal, label: 'علاج عصب' },
  { value: ClinicalProcedureTypeEnum.Crown, label: 'تلبيسة' },
  { value: ClinicalProcedureTypeEnum.Prosthodontic, label: 'تعويضات' },
  { value: ClinicalProcedureTypeEnum.Other, label: 'أخرى' },
];

const statusOptions = [
  { value: ClinicalProcedureStatusEnum.Planned, label: 'مخطط' },
  { value: ClinicalProcedureStatusEnum.InProgress, label: 'قيد التنفيذ' },
  { value: ClinicalProcedureStatusEnum.Completed, label: 'مكتمل' },
];

interface Props {
  procedure?: ClinicalProcedureDto | null;
  onSave: (data: CreateClinicalProcedureRequest | UpdateClinicalProcedureRequest) => void;
  onClose: () => void;
  saving: boolean;
}

export default function ClinicalProcedureFormModal({ procedure, onSave, onClose, saving }: Props) {
  const isEditing = !!procedure;

  const [form, setForm] = useState({
    procedureType: procedure?.procedureType ?? ClinicalProcedureTypeEnum.Filling,
    title: procedure?.title || '',
    toothNumber: procedure?.toothNumber || '',
    toothSurface: procedure?.toothSurface || '',
    description: procedure?.description || '',
    clinicalNotes: procedure?.clinicalNotes || '',
    status: procedure?.status ?? ClinicalProcedureStatusEnum.Planned,
  });

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (isEditing) {
      const req: UpdateClinicalProcedureRequest = {
        procedureType: form.procedureType,
        title: form.title,
        toothNumber: form.toothNumber || null,
        toothSurface: form.toothSurface || null,
        description: form.description || null,
        clinicalNotes: form.clinicalNotes || null,
      };
      onSave(req);
    } else {
      const req: CreateClinicalProcedureRequest = {
        procedureType: form.procedureType,
        title: form.title,
        toothNumber: form.toothNumber || null,
        toothSurface: form.toothSurface || null,
        description: form.description || null,
        clinicalNotes: form.clinicalNotes || null,
        status: form.status,
      };
      onSave(req);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold text-navy">{isEditing ? 'تعديل إجراء علاجي' : 'إضافة إجراء علاجي'}</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">نوع الإجراء *</label>
              <select value={form.procedureType} onChange={(e) => setForm({ ...form, procedureType: Number(e.target.value) })} className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-orange focus:outline-none">
                {procedureTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {!isEditing && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">الحالة</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })} className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-orange focus:outline-none">
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">العنوان *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: حشوة سن 36" className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-orange focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">رقم السن</label>
              <input value={form.toothNumber} onChange={(e) => setForm({ ...form, toothNumber: e.target.value })} placeholder="مثال: 36" className="w-full rounded-lg border border-gray-200 p-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">السطح</label>
              <input value={form.toothSurface} onChange={(e) => setForm({ ...form, toothSurface: e.target.value })} placeholder="مثال: إطباقي" className="w-full rounded-lg border border-gray-200 p-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">الوصف</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-200 p-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">الملاحظات السريرية</label>
            <textarea value={form.clinicalNotes} onChange={(e) => setForm({ ...form, clinicalNotes: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-200 p-2 text-sm" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">إلغاء</button>
          <button onClick={handleSave} disabled={saving || !form.title.trim()} className="rounded-lg bg-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50">
            {saving ? 'جارٍ الحفظ...' : isEditing ? 'تحديث' : 'إضافة'}
          </button>
        </div>
      </div>
    </div>
  );
}
