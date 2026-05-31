'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';

interface TreatmentPlanTabProps {
  patientId: string;
  canEdit: boolean;
}

interface TreatmentStep {
  id: string;
  sequenceNumber: number;
  title: string;
  department: string | null;
  priority: number;
  status: number;
  estimatedCost: number | null;
  toothArea: string | null;
  notes: string | null;
}

const PRIORITY_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'منخفض', color: 'bg-green-100 text-green-700' },
  1: { label: 'متوسط', color: 'bg-yellow-100 text-yellow-700' },
  2: { label: 'عاجل', color: 'bg-orange/10 text-orange' },
  3: { label: 'طارئ', color: 'bg-red-100 text-red-700' },
};

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'مخطط', color: 'bg-blue-100 text-blue-700' },
  1: { label: 'قيد التنفيذ', color: 'bg-yellow-100 text-yellow-700' },
  2: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
  3: { label: 'ملغي', color: 'bg-red-100 text-red-700' },
};

const formatCurrency = (amount: number) =>
  `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;

export default function TreatmentPlanTab({ patientId, canEdit: _canEdit }: TreatmentPlanTabProps) {
  const [steps, setSteps] = useState<TreatmentStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSteps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const fetchSteps = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<{ items: TreatmentStep[]; totalCount: number }>(
        `/general/treatment-plan-steps?patientId=${patientId}`
      );
      const items = res.data?.items ?? (Array.isArray(res.data) ? res.data as unknown as TreatmentStep[] : []);
      setSteps(items);
    } catch {
      try {
        const res = await api.get<{ items: TreatmentStep[]; totalCount: number }>(
          `/patients/${patientId}/treatment-plan-steps`
        );
        const items = res.data?.items ?? (Array.isArray(res.data) ? res.data as unknown as TreatmentStep[] : []);
        setSteps(items);
      } catch {
        setError('حدث خطأ أثناء تحميل خطة العلاج');
      }
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

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="mt-4 text-lg font-bold text-gray-400">لا توجد خطوات علاجية مسجلة</p>
      </div>
    );
  }

  void _canEdit;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-navy">خطة العلاج</h3>
      {steps
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
        .map((s) => {
          const priority = PRIORITY_MAP[s.priority] ?? { label: '—', color: 'bg-gray-100 text-gray-700' };
          const status = STATUS_MAP[s.status] ?? { label: '—', color: 'bg-gray-100 text-gray-700' };
          return (
            <div key={s.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/10 text-sm font-bold text-navy">
                    {s.sequenceNumber}
                  </span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-navy">{s.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status.color}`}>
                        {status.label}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${priority.color}`}>
                        {priority.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      {s.department && <span>القسم: <span className="font-medium text-navy">{s.department}</span></span>}
                      {s.toothArea && <span>المنطقة: <span className="font-medium text-navy">{s.toothArea}</span></span>}
                    </div>
                    {s.notes && <p className="text-xs text-gray-400 mt-1">{s.notes}</p>}
                  </div>
                </div>
                {s.estimatedCost != null && (
                  <p className="text-sm font-bold text-orange whitespace-nowrap">{formatCurrency(s.estimatedCost)}</p>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
