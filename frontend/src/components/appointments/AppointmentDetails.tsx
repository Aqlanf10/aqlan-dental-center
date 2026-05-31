'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import type { AppointmentDto } from '../../types/api';
import { AppointmentStatusEnum } from '../../types/api';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingState from '../common/LoadingState';
import StatusBadge from '../common/StatusBadge';
import StatusSelect from './StatusSelect';

const statusLabels: Record<number, string> = {
  [AppointmentStatusEnum.Scheduled]: 'مجدول',
  [AppointmentStatusEnum.Confirmed]: 'مؤكد',
  [AppointmentStatusEnum.Completed]: 'مكتمل',
  [AppointmentStatusEnum.Cancelled]: 'ملغي',
  [AppointmentStatusEnum.NoShow]: 'لم يحضر',
};

function getStatusVariant(status: number): 'blue' | 'green' | 'orange' | 'red' | 'gray' {
  if (status === AppointmentStatusEnum.Scheduled) return 'blue';
  if (status === AppointmentStatusEnum.Confirmed) return 'green';
  if (status === AppointmentStatusEnum.Completed) return 'green';
  if (status === AppointmentStatusEnum.Cancelled) return 'red';
  if (status === AppointmentStatusEnum.NoShow) return 'orange';
  return 'gray';
}

const statusTimeline: number[] = [
  AppointmentStatusEnum.Scheduled,
  AppointmentStatusEnum.Confirmed,
  AppointmentStatusEnum.Completed,
];

interface AppointmentDetailsProps {
  appointmentId: string;
  canEdit: boolean;
  canDelete: boolean;
  canUpdateStatus: boolean;
}

export default function AppointmentDetails({
  appointmentId,
  canEdit,
  canDelete,
  canUpdateStatus,
}: AppointmentDetailsProps) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<AppointmentDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    async function fetchAppointment() {
      try {
        const result = await api.get<AppointmentDto>(`/appointments/${appointmentId}`);
        setAppointment(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل بيانات الموعد');
      } finally {
        setIsLoading(false);
      }
    }
    fetchAppointment();
  }, [appointmentId]);

  const handleDelete = async () => {
    try {
      await api.delete(`/appointments/${appointmentId}`);
      router.push('/dashboard/appointments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حذف الموعد');
    }
    setShowDelete(false);
  };

  const handleStatusChange = async (newStatus: number) => {
    if (!appointment) return;
    setStatusUpdating(true);
    try {
      await api.patch(`/appointments/${appointmentId}/status`, { status: newStatus });
      setAppointment((prev) => (prev ? { ...prev, status: newStatus, statusDisplay: statusLabels[newStatus] } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث الحالة');
    } finally {
      setStatusUpdating(false);
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

  if (!appointment) {
    return <div className="py-16 text-center text-gray-500">لم يتم العثور على الموعد</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/appointments')}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="العودة"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-navy">تفاصيل الموعد</h1>
            <p className="text-sm text-gray-500">
              {new Date(appointment.appointmentDate).toLocaleDateString('ar-SA')} - {appointment.patientName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => router.push(`/dashboard/appointments/${appointmentId}/edit`)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue/90"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              تعديل
            </button>
          )}
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
          <DetailField label="المريض" value={appointment.patientName} />
          <DetailField label="الطبيب" value={appointment.doctorName} />
          <DetailField label="التاريخ" value={new Date(appointment.appointmentDate).toLocaleDateString('ar-SA')} />
          <DetailField
            label="الوقت"
            value={`${appointment.startTime}${appointment.endTime ? ` - ${appointment.endTime}` : ''}`}
            dir="ltr"
          />
          <DetailField label="نوع الخدمة" value={appointment.serviceType} />
          <div>
            <dt className="text-xs font-medium text-gray-500">الحالة</dt>
            <dd className="mt-1">
              <StatusBadge
                status={statusLabels[appointment.status] || appointment.statusDisplay}
                variant={getStatusVariant(appointment.status)}
              />
            </dd>
          </div>
          {appointment.notes && (
            <div className="sm:col-span-2">
              <DetailField label="ملاحظات" value={appointment.notes} />
            </div>
          )}
          <DetailField label="تاريخ الإنشاء" value={new Date(appointment.createdAt).toLocaleDateString('ar-SA')} />
          <DetailField label="تاريخ التحديث" value={new Date(appointment.updatedAt).toLocaleDateString('ar-SA')} />
        </div>
      </div>

      {/* Status Timeline & Change */}
      {canUpdateStatus && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-navy">تغيير الحالة</h2>
          {/* Simple status timeline */}
          <div className="mb-4 flex items-center gap-2">
            {statusTimeline.map((s, idx) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    appointment.status === s
                      ? 'bg-blue text-white'
                      : appointment.status > s
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {idx + 1}
                </div>
                <span className="text-xs text-gray-600">{statusLabels[s]}</span>
                {idx < statusTimeline.length - 1 && (
                  <div className={`h-0.5 w-8 ${appointment.status > s ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <StatusSelect
              currentStatus={appointment.status}
              onStatusChange={handleStatusChange}
              disabled={statusUpdating}
            />
            {statusUpdating && (
              <svg className="h-4 w-4 animate-spin text-blue" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={showDelete}
        title="حذف الموعد"
        message="هل أنت متأكد من حذف هذا الموعد؟ لا يمكن التراجع عن هذا الإجراء."
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
