'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import type { DoctorDto, DoctorWeeklyScheduleDto } from '../../types/api';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingState from '../common/LoadingState';
import DoctorScheduleForm from './DoctorScheduleForm';

interface DoctorDetailsProps {
  doctorId: string;
  canEdit: boolean;
  canDelete: boolean;
}

const DAYS_MAP: Record<number, string> = {
  0: 'السبت', 1: 'الأحد', 2: 'الاثنين',
  3: 'الثلاثاء', 4: 'الأربعاء', 5: 'الخميس', 6: 'الجمعة',
};

export default function DoctorDetails({ doctorId, canEdit, canDelete }: DoctorDetailsProps) {
  const router = useRouter();
  const [doctor, setDoctor] = useState<DoctorDto | null>(null);
  const [schedules, setSchedules] = useState<DoctorWeeklyScheduleDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DoctorWeeklyScheduleDto | null>(null);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDoctor() {
      try {
        const result = await api.get<DoctorDto>(`/doctors/${doctorId}`);
        setDoctor(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل بيانات الطبيب');
      } finally {
        setIsLoading(false);
      }
    }
    fetchDoctor();
  }, [doctorId]);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await api.get<DoctorWeeklyScheduleDto[]>(`/doctors/${doctorId}/weekly-schedule`);
      setSchedules(res.data ?? []);
    } catch { /* silent */ }
  }, [doctorId]);

  useEffect(() => {
    if (activeTab === 'schedule') fetchSchedules();
  }, [activeTab, fetchSchedules]);

  const handleDelete = async () => {
    try {
      await api.delete(`/doctors/${doctorId}`);
      router.push('/dashboard/doctors');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حذف الطبيب');
    }
    setShowDelete(false);
  };

  const handleDeleteSchedule = async () => {
    if (!deleteScheduleId) return;
    try {
      await api.delete(`/doctors/weekly-schedule/${deleteScheduleId}`);
      fetchSchedules();
    } catch { /* silent */ }
    setDeleteScheduleId(null);
  };

  if (isLoading) return <LoadingState />;

  if (error && !doctor) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!doctor) {
    return <div className="py-16 text-center text-gray-500">لم يتم العثور على الطبيب</div>;
  }

  const tabs = [
    { id: 'info', label: 'المعلومات الأساسية', enabled: true },
    { id: 'schedule', label: 'جدول العمل', enabled: true },
    { id: 'shares', label: 'الحصص المالية', enabled: false },
    { id: 'appointments', label: 'الموعد', enabled: false },
    { id: 'reports', label: 'التقارير', enabled: false },
  ];

  const sortedSchedules = [...schedules].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/doctors')}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="العودة"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            {doctor.color && (
              <span className="inline-block h-4 w-4 rounded-full" style={{ backgroundColor: doctor.color }} />
            )}
            <div>
              <h1 className="text-2xl font-bold text-navy">{doctor.fullName}</h1>
              <p className="text-sm text-gray-500">{doctor.specialty}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => router.push(`/dashboard/doctors/${doctorId}/edit`)}
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => tab.enabled && setActiveTab(tab.id)}
            className={`relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-navy'
                : tab.enabled
                ? 'text-gray-500 hover:text-navy'
                : 'cursor-not-allowed text-gray-400'
            }`}
            disabled={!tab.enabled}
          >
            {tab.label}
            {!tab.enabled && (
              <span className="mr-2 rounded-full bg-orange/20 px-2 py-0.5 text-[10px] text-orange">قريبًا</span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-navy" />
            )}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 sm:grid-cols-2">
            <DetailField label="الاسم الكامل" value={doctor.fullName} />
            <DetailField label="التخصص" value={doctor.specialty} />
            <DetailField label="رقم الهاتف" value={doctor.phoneNumber || '—'} dir="ltr" />
            <DetailField label="البريد الإلكتروني" value={doctor.email || '—'} dir="ltr" />
            <DetailField
              label="اللون"
              value={doctor.color || '—'}
              icon={doctor.color ? <span className="inline-block h-4 w-4 rounded-full" style={{ backgroundColor: doctor.color }} /> : undefined}
            />
            <DetailField label="الحالة" value={doctor.isActive ? 'نشط' : 'غير نشط'} />
            <DetailField label="تاريخ الإنشاء" value={new Date(doctor.createdAt).toLocaleDateString('ar-SA')} />
            <DetailField label="تاريخ التحديث" value={new Date(doctor.updatedAt).toLocaleDateString('ar-SA')} />
          </div>
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-bold text-navy">جدول العمل الأسبوعي</h2>
            {canEdit && (
              <button
                onClick={() => { setEditingSchedule(null); setShowScheduleForm(true); }}
                className="inline-flex items-center gap-2 rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue/90"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                إضافة يوم
              </button>
            )}
          </div>

          {sortedSchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-3 text-sm font-medium text-gray-400">لم يتم تحديد جدول عمل بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-right font-medium text-gray-500">اليوم</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-500">وقت العمل</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-500">الاستراحة</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-500">مدة الموعد</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-500">متاح للحجز</th>
                    {canEdit && <th className="px-6 py-3 text-right font-medium text-gray-500">إجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedSchedules.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-bold text-navy">{DAYS_MAP[s.dayOfWeek] ?? s.dayOfWeekDisplay}</td>
                      <td className="px-6 py-3 text-navy" dir="ltr">{s.startTime} - {s.endTime}</td>
                      <td className="px-6 py-3 text-gray-500" dir="ltr">
                        {s.breakStartTime && s.breakEndTime
                          ? `${s.breakStartTime} - ${s.breakEndTime}`
                          : '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-500">{s.defaultAppointmentDurationMinutes} دقيقة</td>
                      <td className="px-6 py-3">
                        {s.isAvailableForBooking ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">نعم</span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">لا</span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-6 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setEditingSchedule(s); setShowScheduleForm(true); }}
                              className="rounded p-1 text-blue transition-colors hover:bg-blue/10"
                              title="تعديل"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteScheduleId(s.id)}
                              className="rounded p-1 text-red-500 transition-colors hover:bg-red-50"
                              title="حذف"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Schedule Form Modal */}
      {showScheduleForm && (
        <DoctorScheduleForm
          doctorId={doctorId}
          schedule={editingSchedule}
          onSave={() => { setShowScheduleForm(false); setEditingSchedule(null); fetchSchedules(); }}
          onCancel={() => { setShowScheduleForm(false); setEditingSchedule(null); }}
        />
      )}

      {/* Delete Doctor Confirmation */}
      <ConfirmDialog
        isOpen={showDelete}
        title="حذف الطبيب"
        message="هل أنت متأكد من حذف هذا الطبيب؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        variant="danger"
      />

      {/* Delete Schedule Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteScheduleId}
        title="حذف جدول العمل"
        message="هل أنت متأكد من حذف جدول العمل لهذا اليوم؟"
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDeleteSchedule}
        onCancel={() => setDeleteScheduleId(null)}
        variant="danger"
      />
    </div>
  );
}

function DetailField({ label, value, dir, icon }: { label: string; value: string; dir?: string; icon?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className={`mt-1 flex items-center gap-2 text-sm font-medium text-navy ${dir === 'ltr' ? 'text-left' : ''}`} dir={dir}>
        {icon}
        {value}
      </dd>
    </div>
  );
}
