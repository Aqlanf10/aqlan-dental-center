'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { MedicalHistoryDto, UpsertMedicalHistoryRequest } from '../../../types/api';

interface MedicalHistoryTabProps {
  patientId: string;
  canEdit: boolean;
}

const EMPTY_MEDICAL: MedicalHistoryDto = {
  chronicDiseases: null,
  currentMedications: null,
  drugAllergies: null,
  bleedingDisorders: false,
  isPregnant: 'na',
  tmjProblems: false,
  previousSurgeries: null,
  notes: null,
};

export default function MedicalHistoryTab({ patientId, canEdit }: MedicalHistoryTabProps) {
  const [data, setData] = useState<MedicalHistoryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<MedicalHistoryDto>(EMPTY_MEDICAL);

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<MedicalHistoryDto>(`/patients/${patientId}/medical-history`);
      const historyData = res.data ?? EMPTY_MEDICAL;
      setData(historyData);
      setForm(historyData);
    } catch {
      // If 404, it means no history yet — show empty form
      setData(EMPTY_MEDICAL);
      setForm(EMPTY_MEDICAL);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      const request: UpsertMedicalHistoryRequest = {
        chronicDiseases: form.chronicDiseases || null,
        currentMedications: form.currentMedications || null,
        drugAllergies: form.drugAllergies || null,
        bleedingDisorders: form.bleedingDisorders,
        isPregnant: form.isPregnant || 'na',
        tmjProblems: form.tmjProblems,
        previousSurgeries: form.previousSurgeries || null,
        notes: form.notes || null,
      };
      const res = await api.put<MedicalHistoryDto>(`/patients/${patientId}/medical-history`, request);
      setData(res.data);
      setForm(res.data);
      setIsEditing(false);
    } catch {
      setError('حدث خطأ أثناء حفظ التاريخ المرضي');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(data ?? EMPTY_MEDICAL);
    setIsEditing(false);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  // Editing mode
  if (isEditing) {
    return (
      <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-navy">تعديل التاريخ المرضي</h3>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">الأمراض المزمنة</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              rows={3}
              value={form.chronicDiseases ?? ''}
              onChange={(e) => setForm({ ...form, chronicDiseases: e.target.value || null })}
              placeholder="مثال: السكري، ضغط الدم..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">الأدوية الحالية</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              rows={3}
              value={form.currentMedications ?? ''}
              onChange={(e) => setForm({ ...form, currentMedications: e.target.value || null })}
              placeholder="مثال: ميتفورمين 500 ملغ..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">حساسية الأدوية</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              rows={3}
              value={form.drugAllergies ?? ''}
              onChange={(e) => setForm({ ...form, drugAllergies: e.target.value || null })}
              placeholder="مثال: بنسلين..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">العمليات السابقة</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              rows={3}
              value={form.previousSurgeries ?? ''}
              onChange={(e) => setForm({ ...form, previousSurgeries: e.target.value || null })}
              placeholder="مثال: استئصال اللوزتين..."
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
            <input
              type="checkbox"
              id="bleedingDisorders"
              checked={form.bleedingDisorders}
              onChange={(e) => setForm({ ...form, bleedingDisorders: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-blue"
            />
            <label htmlFor="bleedingDisorders" className="text-sm font-medium text-gray-700">اضطرابات النزيف</label>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
            <input
              type="checkbox"
              id="tmjProblems"
              checked={form.tmjProblems}
              onChange={(e) => setForm({ ...form, tmjProblems: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-blue"
            />
            <label htmlFor="tmjProblems" className="text-sm font-medium text-gray-700">مشاكل المفصل الفكي</label>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">الحمل</label>
            <select
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              value={form.isPregnant ?? 'na'}
              onChange={(e) => setForm({ ...form, isPregnant: e.target.value })}
            >
              <option value="na">لا ينطبق</option>
              <option value="no">لا</option>
              <option value="yes">نعم</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات إضافية</label>
          <textarea
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
            rows={3}
            value={form.notes ?? ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
            placeholder="أي ملاحظات إضافية..."
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue/90 disabled:opacity-50"
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            إلغاء
          </button>
        </div>
      </div>
    );
  }

  // Display mode
  const hasData = data && (
    data.chronicDiseases || data.currentMedications || data.drugAllergies ||
    data.bleedingDisorders || data.isPregnant === 'yes' || data.tmjProblems ||
    data.previousSurgeries || data.notes
  );

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="mt-4 text-lg font-bold text-gray-400">لا يوجد تاريخ مرضي</p>
        <p className="mt-1 text-sm text-gray-400">لم يتم إدخال التاريخ المرضي لهذا المريض بعد</p>
        {canEdit && (
          <button
            onClick={() => setIsEditing(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue/90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة التاريخ المرضي
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-navy">التاريخ المرضي</h3>
        {canEdit && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue/90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            تعديل
          </button>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2">
          {data.chronicDiseases && (
            <HistoryField label="الأمراض المزمنة" value={data.chronicDiseases} />
          )}
          {data.currentMedications && (
            <HistoryField label="الأدوية الحالية" value={data.currentMedications} />
          )}
          {data.drugAllergies && (
            <HistoryField label="حساسية الأدوية" value={data.drugAllergies} />
          )}
          {data.previousSurgeries && (
            <HistoryField label="العمليات السابقة" value={data.previousSurgeries} />
          )}

          <div className="flex flex-wrap gap-3">
            {data.bleedingDisorders && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700">
                اضطرابات النزيف
              </span>
            )}
            {data.isPregnant === 'yes' && (
              <span className="inline-flex items-center rounded-full bg-pink-100 px-3 py-1.5 text-sm font-medium text-pink-700">
                حامل
              </span>
            )}
            {data.tmjProblems && (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1.5 text-sm font-medium text-yellow-700">
                مشاكل المفصل الفكي
              </span>
            )}
          </div>

          {data.notes && (
            <div className="sm:col-span-2">
              <HistoryField label="ملاحظات" value={data.notes} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-navy">{value}</dd>
    </div>
  );
}
