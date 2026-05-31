'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';

interface ReferralsTabProps {
  patientId: string;
}

interface Referral {
  id: string;
  fromDoctorName: string;
  toDoctorName: string;
  reason: string | null;
  status: number;
  notes: string | null;
  createdAt: string;
}

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'معلق', color: 'bg-yellow-100 text-yellow-700' },
  1: { label: 'مقبول', color: 'bg-green-100 text-green-700' },
  2: { label: 'مرفوض', color: 'bg-red-100 text-red-700' },
  3: { label: 'مكتمل', color: 'bg-blue-100 text-blue-700' },
};

const formatDate = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('ar-SA') : '—';

export default function ReferralsTab({ patientId }: ReferralsTabProps) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReferrals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const fetchReferrals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<{ items: Referral[]; totalCount: number }>(
        `/referrals?patientId=${patientId}`
      );
      const items = res.data?.items ?? (Array.isArray(res.data) ? res.data as unknown as Referral[] : []);
      setReferrals(items);
    } catch {
      setError('حدث خطأ أثناء تحميل الإحالات');
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

  if (referrals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <p className="mt-4 text-lg font-bold text-gray-400">لا توجد إحالات مسجلة</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-navy">الإحالات</h3>
      {referrals.map((r) => {
        const status = STATUS_MAP[r.status] ?? { label: '—', color: 'bg-gray-100 text-gray-700' };
        return (
          <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm">
                    <span className="font-medium text-navy">{r.fromDoctorName}</span>
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span className="font-medium text-blue">{r.toDoctorName}</span>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                {r.reason && (
                  <p className="text-sm text-gray-500">السبب: <span className="font-medium text-navy">{r.reason}</span></p>
                )}
                {r.notes && <p className="text-xs text-gray-400">{r.notes}</p>}
              </div>
              <p className="text-xs text-gray-400 whitespace-nowrap">{formatDate(r.createdAt)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
