'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';

interface GeneralDentistryTabProps {
  patientId: string;
}

interface GeneralTreatment {
  id: string;
  treatmentType: number;
  treatmentTypeDisplay: string;
  toothNumber: number | null;
  materialUsed: string | null;
  anesthesiaType: string | null;
  cost: number | null;
  createdAt: string;
  doctorName: string | null;
  notes: string | null;
}

const TREATMENT_TYPE_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'حشوة', color: 'bg-blue-100 text-blue-700' },
  1: { label: 'تنظيف', color: 'bg-green-100 text-green-700' },
  2: { label: 'علاج عصب', color: 'bg-red-100 text-red-700' },
  3: { label: 'تاج/جسر', color: 'bg-purple-100 text-purple-700' },
  4: { label: 'خلع', color: 'bg-orange/10 text-orange' },
  5: { label: 'أخرى', color: 'bg-gray-100 text-gray-600' },
};

const formatCurrency = (amount: number) =>
  `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;

const formatDate = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('ar-SA') : '—';

export default function GeneralDentistryTab({ patientId }: GeneralDentistryTabProps) {
  const [treatments, setTreatments] = useState<GeneralTreatment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTreatments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const fetchTreatments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<{ items: GeneralTreatment[]; totalCount: number }>(
        `/general?patientId=${patientId}`
      );
      const items = res.data?.items ?? (Array.isArray(res.data) ? res.data as unknown as GeneralTreatment[] : []);
      setTreatments(items);
    } catch {
      setError('حدث خطأ أثناء تحميل العلاجات العامة');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
    );
  }

  if (treatments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <p className="mt-4 text-lg font-bold text-gray-400">لا توجد علاجات عامة مسجلة</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-navy">العلاجات العامة</h3>
      {treatments.map((t) => {
        const typeInfo = TREATMENT_TYPE_MAP[t.treatmentType] ?? {
          label: t.treatmentTypeDisplay || '—',
          color: 'bg-gray-100 text-gray-600',
        };
        return (
          <div key={t.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                  {t.toothNumber != null && (
                    <span className="inline-flex items-center rounded-full bg-navy/10 px-2 py-0.5 text-xs font-medium text-navy">
                      سن #{t.toothNumber}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  {t.materialUsed && <span>المادة: <span className="font-medium text-navy">{t.materialUsed}</span></span>}
                  {t.anesthesiaType && <span>التخدير: <span className="font-medium text-navy">{t.anesthesiaType}</span></span>}
                  {t.doctorName && <span>الطبيب: <span className="font-medium text-navy">{t.doctorName}</span></span>}
                </div>
                {t.notes && <p className="text-xs text-gray-400 mt-1">{t.notes}</p>}
              </div>
              <div className="text-left space-y-1">
                {t.cost != null && (
                  <p className="text-sm font-bold text-orange">{formatCurrency(t.cost)}</p>
                )}
                <p className="text-xs text-gray-400">{formatDate(t.createdAt)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
