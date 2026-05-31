'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import type { BookingRequestDto } from '../../types/api';
import { BookingRequestStatusEnum } from '../../types/api';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingState from '../common/LoadingState';
import StatusBadge from '../common/StatusBadge';

const statusLabels: Record<number, string> = {
  [BookingRequestStatusEnum.New]: 'جديد',
  [BookingRequestStatusEnum.Contacted]: 'تم التواصل',
  [BookingRequestStatusEnum.Approved]: 'تمت الموافقة',
  [BookingRequestStatusEnum.Rejected]: 'مرفوض',
  [BookingRequestStatusEnum.ConvertedToAppointment]: 'تم التحويل',
  [BookingRequestStatusEnum.Cancelled]: 'ملغي',
};

function getStatusVariant(status: number): 'blue' | 'green' | 'orange' | 'red' | 'gray' {
  if (status === BookingRequestStatusEnum.New) return 'blue';
  if (status === BookingRequestStatusEnum.Contacted) return 'orange';
  if (status === BookingRequestStatusEnum.Approved) return 'green';
  if (status === BookingRequestStatusEnum.Rejected) return 'red';
  if (status === BookingRequestStatusEnum.ConvertedToAppointment) return 'green';
  if (status === BookingRequestStatusEnum.Cancelled) return 'red';
  return 'gray';
}

interface BookingRequestDetailsProps {
  requestId: string;
  canUpdateStatus: boolean;
  canConvert: boolean;
  canDelete: boolean;
}

export default function BookingRequestDetails({
  requestId,
  canUpdateStatus,
  canConvert,
  canDelete,
}: BookingRequestDetailsProps) {
  const router = useRouter();
  const [request, setRequest] = useState<BookingRequestDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    async function fetchRequest() {
      try {
        const result = await api.get<BookingRequestDto>(`/booking-requests/${requestId}`);
        setRequest(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل بيانات الطلب');
      } finally {
        setIsLoading(false);
      }
    }
    fetchRequest();
  }, [requestId]);

  const handleDelete = async () => {
    try {
      await api.delete(`/booking-requests/${requestId}`);
      router.push('/dashboard/booking-requests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حذف الطلب');
    }
    setShowDelete(false);
  };

  const handleStatusChange = async (newStatus: number) => {
    if (!request) return;
    setStatusUpdating(true);
    try {
      await api.patch(`/booking-requests/${requestId}/status`, { status: newStatus });
      setRequest((prev) => (prev ? { ...prev, status: newStatus, statusDisplay: statusLabels[newStatus] } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث الحالة');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      await api.post(`/booking-requests/${requestId}/convert`);
      // Refresh to show updated state
      const result = await api.get<BookingRequestDto>(`/booking-requests/${requestId}`);
      setRequest(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحويل الطلب إلى موعد');
    } finally {
      setConverting(false);
    }
  };

  if (isLoading) return <LoadingState />;

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!request) {
    return <div className="py-16 text-center text-gray-500">لم يتم العثور على طلب الحجز</div>;
  }

  const canConvertNow = canConvert && request.status === BookingRequestStatusEnum.Approved;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/booking-requests')}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="العودة"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-navy">تفاصيل طلب الحجز</h1>
            <p className="text-sm text-gray-500">{request.patientName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canDelete && (
            <button
              onClick={() => setShowDelete(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              حذف
            </button>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2">
          <DetailField label="اسم المريض" value={request.patientName} />
          <DetailField label="رقم الهاتف" value={request.phoneNumber} dir="ltr" />
          <DetailField label="نوع الخدمة" value={request.serviceType} />
          <DetailField label="الطبيب المفضل" value={request.preferredDoctorName || '—'} />
          <DetailField
            label="التاريخ المفضل"
            value={request.preferredDate ? new Date(request.preferredDate).toLocaleDateString('ar-SA') : '—'}
          />
          <DetailField label="الوقت المفضل" value={request.preferredTime || '—'} dir="ltr" />
          <div>
            <dt className="text-xs font-medium text-gray-500">الحالة</dt>
            <dd className="mt-1">
              <StatusBadge
                status={statusLabels[request.status] || request.statusDisplay}
                variant={getStatusVariant(request.status)}
              />
            </dd>
          </div>
          {request.notes && (
            <div className="sm:col-span-2">
              <DetailField label="ملاحظات" value={request.notes} />
            </div>
          )}
        </div>
      </div>

      {/* Linked records */}
      {(request.linkedPatientName || request.convertedAppointmentId) && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-navy">السجلات المرتبطة</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {request.linkedPatientName && (
              <DetailField label="المريض المرتبط" value={request.linkedPatientName} />
            )}
            {request.convertedAppointmentId && (
              <div>
                <dt className="text-xs font-medium text-gray-500">الموعد المحول</dt>
                <dd className="mt-1">
                  <button
                    onClick={() => router.push(`/dashboard/appointments/${request.convertedAppointmentId}`)}
                    className="text-sm font-medium text-blue hover:underline"
                  >
                    عرض تفاصيل الموعد
                  </button>
                </dd>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions Card */}
      {(canUpdateStatus || canConvert) && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-navy">إجراءات</h2>

          {canUpdateStatus && (
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm font-medium text-gray-600">تغيير الحالة:</label>
              <select
                value={request.status}
                onChange={(e) => handleStatusChange(Number(e.target.value))}
                disabled={statusUpdating}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20 disabled:opacity-50"
              >
                {Object.entries(BookingRequestStatusEnum).map(([key, val]) => (
                  <option key={key} value={val}>{statusLabels[val]}</option>
                ))}
              </select>
              {statusUpdating && (
                <svg className="h-4 w-4 animate-spin text-blue" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
          )}

          {canConvertNow && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {converting ? 'جارٍ التحويل...' : 'تحويل إلى موعد'}
            </button>
          )}

          {canConvert && !canConvertNow && request.status !== BookingRequestStatusEnum.ConvertedToAppointment && (
            <p className="text-xs text-gray-500">
              يجب تغيير حالة الطلب إلى &quot;تمت الموافقة&quot; قبل التحويل إلى موعد
            </p>
          )}

          {/* WhatsApp placeholder */}
          <div className="mt-4">
            <button
              disabled
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
              title="قريبًا"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              </svg>
              واتساب (قريبًا)
            </button>
          </div>
        </div>
      )}

      {/* Dates */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2">
          <DetailField label="تاريخ الإنشاء" value={new Date(request.createdAt).toLocaleDateString('ar-SA')} />
          <DetailField label="تاريخ التحديث" value={new Date(request.updatedAt).toLocaleDateString('ar-SA')} />
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={showDelete}
        title="حذف طلب الحجز"
        message="هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        variant="danger"
      />
    </div>
  );
}

function DetailField({ label, value, dir }: { label: string; value: string; dir?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className={`mt-1 text-sm font-medium text-navy ${dir === 'ltr' ? 'text-left' : ''}`} dir={dir}>
        {value}
      </dd>
    </div>
  );
}
