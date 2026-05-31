'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';

interface LabOrdersTabProps {
  patientId: string;
}

interface LabOrder {
  id: string;
  orderNumber: string | null;
  applianceType: string | null;
  labName: string | null;
  status: number;
  priority: number;
  cost: number | null;
  expectedDate: string | null;
}

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'معلق', color: 'bg-yellow-100 text-yellow-700' },
  1: { label: 'قيد التنفيذ', color: 'bg-blue-100 text-blue-700' },
  2: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
  3: { label: 'ملغي', color: 'bg-red-100 text-red-700' },
};

const PRIORITY_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'عادي', color: 'bg-gray-100 text-gray-600' },
  1: { label: 'مستعجل', color: 'bg-orange/10 text-orange' },
  2: { label: 'طارئ', color: 'bg-red-100 text-red-700' },
};

const formatCurrency = (amount: number) =>
  `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;

const formatDate = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('ar-SA') : '—';

export default function LabOrdersTab({ patientId }: LabOrdersTabProps) {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<{ items: LabOrder[]; totalCount: number }>(
        `/lab-orders?patientId=${patientId}`
      );
      const items = res.data?.items ?? (Array.isArray(res.data) ? res.data as unknown as LabOrder[] : []);
      setOrders(items);
    } catch {
      setError('حدث خطأ أثناء تحميل طلبات المختبر');
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

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        <p className="mt-4 text-lg font-bold text-gray-400">لا توجد طلبات مختبر مسجلة</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-navy">طلبات المختبر</h3>
      {orders.map((o) => {
        const status = STATUS_MAP[o.status] ?? { label: '—', color: 'bg-gray-100 text-gray-700' };
        const priority = PRIORITY_MAP[o.priority] ?? { label: '—', color: 'bg-gray-100 text-gray-700' };
        return (
          <div key={o.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-navy">طلب #{o.orderNumber ?? '—'}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.color}`}>
                    {status.label}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${priority.color}`}>
                    {priority.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  {o.applianceType && <span>نوع الجهاز: <span className="font-medium text-navy">{o.applianceType}</span></span>}
                  {o.labName && <span>المختبر: <span className="font-medium text-navy">{o.labName}</span></span>}
                </div>
              </div>
              <div className="text-left space-y-1">
                {o.cost != null && (
                  <p className="text-sm font-bold text-orange">{formatCurrency(o.cost)}</p>
                )}
                <p className="text-xs text-gray-400">{formatDate(o.expectedDate)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
