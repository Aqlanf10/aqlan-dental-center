'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { DentalHistoryDto, UpsertDentalHistoryRequest } from '../../../types/api';

interface DentalHistoryTabProps {
  patientId: string;
  canEdit: boolean;
}

const EMPTY_DENTAL: DentalHistoryDto = {
  chiefComplaint: null,
  previousTreatments: null,
  mouthBreathing: false,
  bruxism: false,
  thumbSucking: false,
  tongueThrusting: false,
  notes: null,
};

export default function DentalHistoryTab({ patientId, canEdit }: DentalHistoryTabProps) {
  const [data, setData] = useState<DentalHistoryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<DentalHistoryDto>(EMPTY_DENTAL);

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<DentalHistoryDto>(`/patients/${patientId}/dental-history`);
      const historyData = res.data ?? EMPTY_DENTAL;
      setData(historyData);
      setForm(historyData);
    } catch {
      setData(EMPTY_DENTAL);
      setForm(EMPTY_DENTAL);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      const request: UpsertDentalHistoryRequest = {
        chiefComplaint: form.chiefComplaint || null,
        previousTreatments: form.previousTreatments || null,
        mouthBreathing: form.mouthBreathing,
        bruxism: form.bruxism,
        thumbSucking: form.thumbSucking,
        tongueThrusting: form.tongueThrusting,
        notes: form.notes || null,
      };
      const res = await api.put<DentalHistoryDto>(`/patients/${patientId}/dental-history`, request);
      setData(res.data);
      setForm(res.data);
      setIsEditing(false);
    } catch {
      setError('حدث خطأ أثناء حفظ تاريخ الأسنان');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(data ?? EMPTY_DENTAL);
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
          <h3 className="text-lg font-bold text-navy">تعديل تاريخ الأسنان</h3>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">الشكوى الرئيسية</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              rows={3}
              value={form.chiefComplaint ?? ''}
              onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value || null })}
              placeholder="مثال: ألم في الضرس..."
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">العلاجات السابقة</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              rows={3}
              value={form.previousTreatments ?? ''}
              onChange={(e) => setForm({ ...form, previousTreatments: e.target.value || null })}
              placeholder="مثال: حشوة ضرس، تنظيف..."
            />
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-gray-700">العادات الفموية</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
              <input
                type="checkbox"
                id="mouthBreathing"
                checked={form.mouthBreathing}
                onChange={(e) => setForm({ ...form, mouthBreathing: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-blue"
              />
              <label htmlFor="mouthBreathing" className="text-sm font-medium text-gray-700">التنفس الفموي</label>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
              <input
                type="checkbox"
                id="bruxism"
                checked={form.bruxism}
                onChange={(e) => setForm({ ...form, bruxism: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-blue"
              />
              <label htmlFor="bruxism" className="text-sm font-medium text-gray-700">صريف الأسنان (Bruxism)</label>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
              <input
                type="checkbox"
                id="thumbSucking"
                checked={form.thumbSucking}
                onChange={(e) => setForm({ ...form, thumbSucking: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-blue"
              />
              <label htmlFor="thumbSucking" className="text-sm font-medium text-gray-700">مص الإصبع</label>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
              <input
                type="checkbox"
                id="tongueThrusting"
                checked={form.tongueThrusting}
                onChange={(e) => setForm({ ...form, tongueThrusting: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-blue"
              />
              <label htmlFor="tongueThrusting" className="text-sm font-medium text-gray-700">دفع اللسان</label>
            </div>
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
    data.chiefComplaint || data.previousTreatments ||
    data.mouthBreathing || data.bruxism || data.thumbSucking || data.tongueThrusting ||
    data.notes
  );

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="mt-4 text-lg font-bold text-gray-400">لا يوجد تاريخ سني</p>
        <p className="mt-1 text-sm text-gray-400">لم يتم إدخال تاريخ الأسنان لهذا المريض بعد</p>
        {canEdit && (
          <button
            onClick={() => setIsEditing(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue/90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة تاريخ الأسنان
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-navy">تاريخ الأسنان</h3>
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
          {data.chiefComplaint && (
            <div className="sm:col-span-2">
              <DentalField label="الشكوى الرئيسية" value={data.chiefComplaint} />
            </div>
          )}
          {data.previousTreatments && (
            <div className="sm:col-span-2">
              <DentalField label="العلاجات السابقة" value={data.previousTreatments} />
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="mb-2 block text-xs font-medium text-gray-500">العادات الفموية</label>
            <div className="flex flex-wrap gap-2">
              {data.mouthBreathing && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700">
                  تنفس فموي
                </span>
              )}
              {data.bruxism && (
                <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1.5 text-sm font-medium text-purple-700">
                  صريف الأسنان
                </span>
              )}
              {data.thumbSucking && (
                <span className="inline-flex items-center rounded-full bg-orange/10 px-3 py-1.5 text-sm font-medium text-orange">
                  مص الإصبع
                </span>
              )}
              {data.tongueThrusting && (
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1.5 text-sm font-medium text-yellow-700">
                  دفع اللسان
                </span>
              )}
              {!data.mouthBreathing && !data.bruxism && !data.thumbSucking && !data.tongueThrusting && (
                <span className="text-sm text-gray-400">لا توجد عادات فموية مسجلة</span>
              )}
            </div>
          </div>

          {data.notes && (
            <div className="sm:col-span-2">
              <DentalField label="ملاحظات" value={data.notes} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DentalField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-navy">{value}</dd>
    </div>
  );
}
