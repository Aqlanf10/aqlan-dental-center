'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import type {
  PatientDto,
  PatientSummaryDto,
  PatientTimelineDto,
  TimelineEntryDto,
  AppointmentDto,
  PagedResult,
} from '../../types/api';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingState from '../common/LoadingState';

interface PatientDetailsProps {
  patientId: string;
  canEdit: boolean;
  canDelete: boolean;
}

const TABS = [
  { id: 'info', label: 'البيانات الأساسية', enabled: true },
  { id: 'appointments', label: 'المواعيد', enabled: true },
  { id: 'dailyVisits', label: 'الزيارات اليومية', enabled: true },
  { id: 'clinicalVisits', label: 'الزيارات السريرية', enabled: true },
  { id: 'procedures', label: 'الإجراءات العلاجية', enabled: true },
  { id: 'prescriptions', label: 'الوصفات', enabled: true },
  { id: 'medicalHistory', label: 'التاريخ المرضي', enabled: false },
  { id: 'dentalHistory', label: 'تاريخ الأسنان', enabled: false },
  { id: 'finance', label: 'المالية', enabled: false },
];

export default function PatientDetails({ patientId, canEdit, canDelete }: PatientDetailsProps) {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientDto | null>(null);
  const [summary, setSummary] = useState<PatientSummaryDto | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntryDto[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    async function fetchData() {
      try {
        const patientRes = await api.get<PatientDto>(`/patients/${patientId}`);
        setPatient(patientRes.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل بيانات المريض');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [patientId]);

  const loadTabData = useCallback(async (tabId: string) => {
    if (tabId === 'info') return;
    try {
      if (tabId === 'appointments') {
        const res = await api.get<PagedResult<AppointmentDto>>(`/appointments?patientId=${patientId}&pageSize=50`);
        setAppointments(res.data.items ?? []);
      } else if (!summary) {
        const [sumRes, tlRes] = await Promise.all([
          api.get<PatientSummaryDto>(`/patients/${patientId}/summary`).catch(() => null),
          api.get<PatientTimelineDto>(`/patients/${patientId}/timeline`).catch(() => null),
        ]);
        if (sumRes?.data) setSummary(sumRes.data);
        if (tlRes?.data) setTimeline(tlRes.data.entries ?? []);
      }
    } catch { /* silent */ }
  }, [patientId, summary]);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  const handleDelete = async () => {
    try {
      await api.delete(`/patients/${patientId}`);
      router.push('/dashboard/patients');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حذف المريض');
    }
    setShowDelete(false);
  };

  if (isLoading) return <LoadingState />;

  if (error && !patient) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!patient) {
    return <div className="py-16 text-center text-gray-500">لم يتم العثور على المريض</div>;
  }

  const clinicalVisits = timeline.filter((e) => e.type === 'clinicalVisit');
  const procedures = timeline.filter((e) => e.type === 'procedure');
  const prescriptions = timeline.filter((e) => e.type === 'prescription');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/patients')}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="العودة"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-navy">{patient.fullName}</h1>
            <p className="text-sm text-gray-500">{patient.patientNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => router.push(`/dashboard/patients/${patientId}/edit`)}
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
        {TABS.map((tab) => (
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

      {/* Tab Content */}
      {activeTab === 'info' && <InfoTab patient={patient} />}
      {activeTab === 'appointments' && <AppointmentsTab appointments={appointments} />}
      {activeTab === 'dailyVisits' && <DailyVisitsTab timeline={timeline} />}
      {activeTab === 'clinicalVisits' && <ClinicalVisitsTab entries={clinicalVisits} />}
      {activeTab === 'procedures' && <ProceduresTab entries={procedures} />}
      {activeTab === 'prescriptions' && <PrescriptionsTab entries={prescriptions} summary={summary} />}
      {activeTab === 'medicalHistory' && <DisabledTabPlaceholder />}
      {activeTab === 'dentalHistory' && <DisabledTabPlaceholder />}
      {activeTab === 'finance' && <DisabledTabPlaceholder />}

      <ConfirmDialog
        isOpen={showDelete}
        title="حذف المريض"
        message="هل أنت متأكد من حذف هذا المريض؟ لا يمكن التراجع عن هذا الإجراء."
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

function InfoTab({ patient }: { patient: PatientDto }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="grid gap-6 sm:grid-cols-2">
        <DetailField label="رقم المريض" value={patient.patientNumber} />
        <DetailField label="الاسم الكامل" value={patient.fullName} />
        <DetailField label="الجنس" value={patient.genderDisplay} />
        <DetailField label="تاريخ الميلاد" value={patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('ar-SA') : '—'} />
        <DetailField label="رقم الهاتف" value={patient.phoneNumber} dir="ltr" />
        <DetailField label="رقم واتساب" value={patient.whatsAppNumber || '—'} dir="ltr" />
        <DetailField label="العنوان" value={patient.address || '—'} />
        <DetailField label="الحالة" value={patient.isActive ? 'نشط' : 'غير نشط'} />
        {patient.notes && (
          <div className="sm:col-span-2">
            <DetailField label="ملاحظات" value={patient.notes} />
          </div>
        )}
        <DetailField label="تاريخ الإنشاء" value={new Date(patient.createdAt).toLocaleDateString('ar-SA')} />
        <DetailField label="تاريخ التحديث" value={new Date(patient.updatedAt).toLocaleDateString('ar-SA')} />
      </div>
    </div>
  );
}

function AppointmentsTab({ appointments }: { appointments: AppointmentDto[] }) {
  if (appointments.length === 0) {
    return <EmptyTab message="لا توجد مواعيد مسجلة لهذا المريض" />;
  }
  return (
    <div className="space-y-3">
      {appointments.map((apt) => (
        <div key={apt.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-navy">{apt.doctorName}</p>
              <p className="text-sm text-gray-500">{apt.serviceType}</p>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-navy">
                {new Date(apt.appointmentDate).toLocaleDateString('ar-SA')}
              </p>
              <p className="text-sm text-gray-500" dir="ltr">{apt.startTime} - {apt.endTime || '—'}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              apt.status === 2 ? 'bg-green-100 text-green-700'
              : apt.status === 3 ? 'bg-red-100 text-red-700'
              : apt.status === 4 ? 'bg-gray-100 text-gray-600'
              : 'bg-blue-100 text-blue-700'
            }`}>
              {apt.statusDisplay}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyVisitsTab({ timeline }: { timeline: TimelineEntryDto[] }) {
  const visits = timeline.filter((e) => e.type === 'dailyVisit');
  if (visits.length === 0) {
    return <EmptyTab message="لا توجد زيارات يومية مسجلة" />;
  }
  return (
    <div className="space-y-3">
      {visits.map((v) => (
        <div key={v.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-navy">{v.title}</p>
              {v.subtitle && <p className="text-sm text-gray-500">{v.subtitle}</p>}
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-500">{new Date(v.date).toLocaleDateString('ar-SA')}</p>
              {v.statusDisplay && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  {v.statusDisplay}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClinicalVisitsTab({ entries }: { entries: TimelineEntryDto[] }) {
  if (entries.length === 0) {
    return <EmptyTab message="لا توجد زيارات سريرية مسجلة" />;
  }
  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <div key={e.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-navy">{e.title}</p>
              {e.subtitle && <p className="text-sm text-gray-500">{e.subtitle}</p>}
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-500">{new Date(e.date).toLocaleDateString('ar-SA')}</p>
              {e.statusDisplay && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                  {e.statusDisplay}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProceduresTab({ entries }: { entries: TimelineEntryDto[] }) {
  if (entries.length === 0) {
    return <EmptyTab message="لا توجد إجراءات علاجية مسجلة" />;
  }
  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <div key={e.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-navy">{e.title}</p>
              {e.subtitle && <p className="text-sm text-gray-500">{e.subtitle}</p>}
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-500">{new Date(e.date).toLocaleDateString('ar-SA')}</p>
              {e.statusDisplay && (
                <span className="rounded-full bg-orange/10 px-3 py-1 text-xs font-bold text-orange">
                  {e.statusDisplay}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PrescriptionsTab({ entries, summary }: { entries: TimelineEntryDto[]; summary: PatientSummaryDto | null }) {
  const rxFromSummary = summary?.latestPrescriptions ?? [];
  if (entries.length === 0 && rxFromSummary.length === 0) {
    return <EmptyTab message="لا توجد وصفات طبية مسجلة" />;
  }
  return (
    <div className="space-y-3">
      {rxFromSummary.map((rx) => (
        <div key={rx.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-navy">{rx.medicationName}</p>
              <div className="mt-1 flex gap-3 text-sm text-gray-500">
                {rx.dosage && <span>الجرعة: {rx.dosage}</span>}
                {rx.frequency && <span>التكرار: {rx.frequency}</span>}
                {rx.duration && <span>المدة: {rx.duration}</span>}
              </div>
            </div>
            <p className="text-sm text-gray-400">
              {new Date(rx.createdAt).toLocaleDateString('ar-SA')}
            </p>
          </div>
        </div>
      ))}
      {entries.filter((e) => e.type === 'prescription').map((e) => (
        <div key={e.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-navy">{e.title}</p>
              {e.subtitle && <p className="text-sm text-gray-500">{e.subtitle}</p>}
            </div>
            <p className="text-sm text-gray-400">{new Date(e.date).toLocaleDateString('ar-SA')}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DisabledTabPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="mt-4 text-lg font-bold text-gray-400">قريبًا</p>
      <p className="mt-1 text-sm text-gray-400">هذه الميزة قيد التطوير</p>
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="mt-3 text-sm font-medium text-gray-400">{message}</p>
    </div>
  );
}
