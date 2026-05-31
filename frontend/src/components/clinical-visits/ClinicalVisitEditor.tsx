'use client';

import { useState } from 'react';
import {
  ClinicalVisitDto, PrescriptionDto, UpdateClinicalVisitRequest,
  CompleteClinicalVisitRequest, AddPrescriptionRequest, UpdatePrescriptionRequest,
  ClinicalVisitStatusEnum,
} from '@/types/api';
import { api } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthContext';
import ClinicalVisitStatusBadge from './ClinicalVisitStatusBadge';
import ClinicalProcedureList from '../clinical-procedures/ClinicalProcedureList';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'حدث خطأ غير متوقع';
}

interface Props {
  visit: ClinicalVisitDto;
  onClose: () => void;
  onUpdated: () => void;
}

export default function ClinicalVisitEditor({ visit: initialVisit, onClose, onUpdated }: Props) {
  const { user } = useAuth();
  const userRole = user?.role || '';
  const canEdit = ['Admin', 'Doctor'].includes(userRole);
  const canCancel = ['Admin', 'Doctor'].includes(userRole);

  const [visit, setVisit] = useState<ClinicalVisitDto>(initialVisit);
  const [saving, setSaving] = useState(false);
  const [showRxModal, setShowRxModal] = useState(false);
  const [editingRx, setEditingRx] = useState<PrescriptionDto | null>(null);
  const [rxForm, setRxForm] = useState<AddPrescriptionRequest>({ medicationName: '' });

  const isActive = visit.status === ClinicalVisitStatusEnum.Open || visit.status === ClinicalVisitStatusEnum.InProgress;

  const [form, setForm] = useState<UpdateClinicalVisitRequest>({
    chiefComplaint: initialVisit.chiefComplaint || '',
    clinicalFindings: initialVisit.clinicalFindings || '',
    diagnosis: initialVisit.diagnosis || '',
    treatmentNotes: initialVisit.treatmentNotes || '',
    doctorRecommendations: initialVisit.doctorRecommendations || '',
    nextVisitRecommended: initialVisit.nextVisitRecommended,
    nextVisitDate: initialVisit.nextVisitDate || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put<ClinicalVisitDto>(`/clinical-visits/${visit.id}`, form);
      setVisit(res.data);
      onUpdated();
    } catch (err) { alert(getErrorMessage(err)); }
    setSaving(false);
  };

  const handleComplete = async () => {
    if (!confirm('هل أنت متأكد من إكمال الزيارة السريرية؟')) return;
    setSaving(true);
    try {
      const req: CompleteClinicalVisitRequest = {
        diagnosis: form.diagnosis || null,
        treatmentNotes: form.treatmentNotes || null,
        doctorRecommendations: form.doctorRecommendations || null,
        nextVisitRecommended: form.nextVisitRecommended || null,
        nextVisitDate: form.nextVisitDate || null,
      };
      const res = await api.post<ClinicalVisitDto>(`/clinical-visits/${visit.id}/complete`, req);
      setVisit(res.data);
      onUpdated();
    } catch (err) { alert(getErrorMessage(err)); }
    setSaving(false);
  };

  const handleCancel = async () => {
    if (!confirm('هل أنت متأكد من إلغاء الزيارة السريرية؟')) return;
    setSaving(true);
    try {
      const res = await api.post<ClinicalVisitDto>(`/clinical-visits/${visit.id}/cancel`);
      setVisit(res.data);
      onUpdated();
    } catch (err) { alert(getErrorMessage(err)); }
    setSaving(false);
  };

  const handleAddRx = async () => {
    if (!rxForm.medicationName.trim()) return;
    setSaving(true);
    try {
      if (editingRx) {
        const updateReq: UpdatePrescriptionRequest = { ...rxForm, medicationName: rxForm.medicationName };
        await api.put(`/clinical-visits/prescriptions/${editingRx.id}`, updateReq);
      } else {
        await api.post(`/clinical-visits/${visit.id}/prescriptions`, rxForm);
      }
      const refreshed = await api.get<ClinicalVisitDto>(`/clinical-visits/${visit.id}`);
      setVisit(refreshed.data);
      setShowRxModal(false);
      setEditingRx(null);
      setRxForm({ medicationName: '' });
      onUpdated();
    } catch (err) { alert(getErrorMessage(err)); }
    setSaving(false);
  };

  const handleDeleteRx = async (rxId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الوصفة؟')) return;
    try {
      await api.delete(`/clinical-visits/prescriptions/${rxId}`);
      const refreshed = await api.get<ClinicalVisitDto>(`/clinical-visits/${visit.id}`);
      setVisit(refreshed.data);
      onUpdated();
    } catch (err) { alert(getErrorMessage(err)); }
  };

  const openEditRx = (rx: PrescriptionDto) => {
    setEditingRx(rx);
    setRxForm({
      medicationName: rx.medicationName,
      dosage: rx.dosage,
      frequency: rx.frequency,
      duration: rx.duration,
      instructions: rx.instructions,
    });
    setShowRxModal(true);
  };

  const openAddRx = () => {
    setEditingRx(null);
    setRxForm({ medicationName: '' });
    setShowRxModal(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-3xl rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-navy">الزيارة السريرية</h2>
            <p className="text-sm text-gray-500">{visit.patientName} — د. {visit.doctorName}</p>
          </div>
          <div className="flex items-center gap-3">
            <ClinicalVisitStatusBadge status={visit.status} />
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Clinical Fields */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">الشكوى الرئيسية</label>
              <textarea value={form.chiefComplaint || ''} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} disabled={!canEdit || !isActive} rows={2} className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange disabled:bg-gray-50" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">الفحص السريري</label>
              <textarea value={form.clinicalFindings || ''} onChange={(e) => setForm({ ...form, clinicalFindings: e.target.value })} disabled={!canEdit || !isActive} rows={3} className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange disabled:bg-gray-50" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">التشخيص</label>
              <textarea value={form.diagnosis || ''} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} disabled={!canEdit || !isActive} rows={2} className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange disabled:bg-gray-50" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">ملاحظات العلاج</label>
              <textarea value={form.treatmentNotes || ''} onChange={(e) => setForm({ ...form, treatmentNotes: e.target.value })} disabled={!canEdit || !isActive} rows={3} className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange disabled:bg-gray-50" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">توصيات الطبيب</label>
              <textarea value={form.doctorRecommendations || ''} onChange={(e) => setForm({ ...form, doctorRecommendations: e.target.value })} disabled={!canEdit || !isActive} rows={2} className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange disabled:bg-gray-50" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.nextVisitRecommended || false} onChange={(e) => setForm({ ...form, nextVisitRecommended: e.target.checked })} disabled={!canEdit || !isActive} className="rounded border-gray-300" />
                يوصى بزيارة قادمة
              </label>
              {form.nextVisitRecommended && (
                <input type="date" value={form.nextVisitDate || ''} onChange={(e) => setForm({ ...form, nextVisitDate: e.target.value })} disabled={!canEdit || !isActive} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
              )}
            </div>
          </div>

          {/* Prescriptions */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-navy">الوصفات الطبية</h3>
              {canEdit && isActive && (
                <button onClick={openAddRx} className="rounded-md bg-orange px-3 py-1 text-xs font-medium text-white hover:bg-orange-600">
                  + إضافة وصفة
                </button>
              )}
            </div>
            {visit.prescriptions.length > 0 ? (
              <div className="space-y-2">
                {visit.prescriptions.map((rx) => (
                  <div key={rx.id} className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div>
                      <p className="font-medium text-navy text-sm">{rx.medicationName}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        {rx.dosage && <span>الجرعة: {rx.dosage}</span>}
                        {rx.frequency && <span>التكرار: {rx.frequency}</span>}
                        {rx.duration && <span>المدة: {rx.duration}</span>}
                      </div>
                      {rx.instructions && <p className="mt-1 text-xs text-gray-400">{rx.instructions}</p>}
                    </div>
                    {canEdit && isActive && (
                      <div className="flex gap-1">
                        <button onClick={() => openEditRx(rx)} className="text-xs text-blue-600 hover:underline">تعديل</button>
                        <button onClick={() => handleDeleteRx(rx.id)} className="text-xs text-red-500 hover:underline">حذف</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">لا توجد وصفات طبية</p>
            )}
          </div>

          {/* Clinical Procedures */}
          <div className="border-t border-gray-200 pt-4">
            <ClinicalProcedureList clinicalVisitId={visit.id} isVisitActive={isActive} />
          </div>

          {/* Disabled future buttons */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-bold text-navy mb-2">إجراءات إضافية</h3>
            <div className="flex flex-wrap gap-2">
              <button disabled className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-400 cursor-not-allowed">
                إنشاء فاتورة — قريبًا
              </button>
              <button disabled className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-400 cursor-not-allowed">
                خطة العلاج — قريبًا
              </button>
              <button disabled className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-400 cursor-not-allowed">
                الرسم البياني للأسنان — قريبًا
              </button>
              <button disabled className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-400 cursor-not-allowed">
                طلب مخبري — قريبًا
              </button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <div className="flex gap-2">
            {canEdit && isActive && (
              <button onClick={handleSave} disabled={saving} className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-50">
                {saving ? 'جارٍ الحفظ...' : 'حفظ'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {canCancel && isActive && (
              <>
                <button onClick={handleCancel} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                  إلغاء الزيارة
                </button>
                <button onClick={handleComplete} disabled={saving} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                  إكمال الزيارة
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Prescription Modal */}
      {showRxModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowRxModal(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold text-navy">{editingRx ? 'تعديل وصفة' : 'إضافة وصفة طبية'}</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">اسم الدواء *</label>
                <input value={rxForm.medicationName} onChange={(e) => setRxForm({ ...rxForm, medicationName: e.target.value })} className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:border-orange focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">الجرعة</label>
                  <input value={rxForm.dosage || ''} onChange={(e) => setRxForm({ ...rxForm, dosage: e.target.value })} className="w-full rounded-lg border border-gray-200 p-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">التكرار</label>
                  <input value={rxForm.frequency || ''} onChange={(e) => setRxForm({ ...rxForm, frequency: e.target.value })} className="w-full rounded-lg border border-gray-200 p-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">المدة</label>
                <input value={rxForm.duration || ''} onChange={(e) => setRxForm({ ...rxForm, duration: e.target.value })} className="w-full rounded-lg border border-gray-200 p-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">التعليمات</label>
                <textarea value={rxForm.instructions || ''} onChange={(e) => setRxForm({ ...rxForm, instructions: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-200 p-2 text-sm" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowRxModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">إلغاء</button>
              <button onClick={handleAddRx} disabled={saving || !rxForm.medicationName.trim()} className="rounded-lg bg-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50">
                {saving ? 'جارٍ الحفظ...' : editingRx ? 'تحديث' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
