'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';

interface OrthodonticsTabProps {
  patientId: string;
}

interface OrthoCase {
  id: string;
  caseNumber: string;
  applianceType: string | null;
  status: number;
  currentStage: string | null;
  totalFee: number | null;
  doctorName: string | null;
  startDate: string | null;
}

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'نشط', color: 'bg-green-100 text-green-700' },
  1: { label: 'مكتمل', color: 'bg-blue-100 text-blue-700' },
  2: { label: 'محفوظ', color: 'bg-yellow-100 text-yellow-700' },
  3: { label: 'ملغي', color: 'bg-red-100 text-red-700' },
};

const formatCurrency = (amount: number) =>
  `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;

const formatDate = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('ar-SA') : '—';

export default function OrthodonticsTab({ patientId }: OrthodonticsTabProps) {
  const [cases, setCases] = useState<OrthoCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const fetchCases = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<{ items: OrthoCase[]; totalCount: number }>(
        `/ortho?patientId=${patientId}`
      );
      const items = res.data?.items ?? (Array.isArray(res.data) ? res.data as unknown as OrthoCase[] : []);
      setCases(items);
    } catch {
      setError('حدث خطأ أثناء تحميل حالات التقويم');
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

  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="mt-4 text-lg font-bold text-gray-400">لا توجد حالات تقويم مسجلة</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-navy">حالات التقويم</h3>
        <Link
          href="/dashboard/ortho"
          className="text-sm font-medium text-blue hover:underline"
        >
          عرض الكل ←
        </Link>
      </div>
      {cases.map((c) => {
        const status = STATUS_MAP[c.status] ?? { label: '—', color: 'bg-gray-100 text-gray-700' };
        return (
          <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-navy">حالة #{c.caseNumber}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  {c.applianceType && <span>نوع الجهاز: <span className="font-medium text-navy">{c.applianceType}</span></span>}
                  {c.currentStage && <span>المرحلة: <span className="font-medium text-navy">{c.currentStage}</span></span>}
                  {c.doctorName && <span>الطبيب: <span className="font-medium text-navy">{c.doctorName}</span></span>}
                </div>
              </div>
              <div className="text-left">
                {c.totalFee != null && (
                  <p className="text-sm font-bold text-orange">{formatCurrency(c.totalFee)}</p>
                )}
                {c.startDate && (
                  <p className="text-xs text-gray-400">{formatDate(c.startDate)}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
