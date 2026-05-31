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
  PaymentDto,
  ContractDto,
  PatientFinanceSummaryDto,
  CreatePaymentRequest,
  CreateContractRequest,
} from '../../types/api';
import {
  ContractStatusLabels,
  PaymentMethodLabels,
} from '../../types/api';
import ConfirmDialog from '../common/ConfirmDialog';
import LoadingState from '../common/LoadingState';
import MedicalHistoryTab from './tabs/MedicalHistoryTab';
import DentalHistoryTab from './tabs/DentalHistoryTab';
import OrthodonticsTab from './tabs/OrthodonticsTab';
import SurgeryTab from './tabs/SurgeryTab';
import TreatmentPlanTab from './tabs/TreatmentPlanTab';
import ReferralsTab from './tabs/ReferralsTab';
import LabOrdersTab from './tabs/LabOrdersTab';
import GeneralDentistryTab from './tabs/GeneralDentistryTab';
import ClinicalPhotosTab from './tabs/ClinicalPhotosTab';
import RadiographsTab from './tabs/RadiographsTab';
import DocumentsTab from './tabs/DocumentsTab';

interface PatientDetailsProps {
  patientId: string;
  canEdit: boolean;
  canDelete: boolean;
}

const TABS = [
  { id: 'overview', label: 'نظرة عامة', enabled: true, group: 'عام' },
  { id: 'info', label: 'البيانات الأساسية', enabled: true, group: 'عام' },
  { id: 'medicalHistory', label: 'التاريخ المرضي', enabled: true, group: 'عام' },
  { id: 'dentalHistory', label: 'تاريخ الأسنان', enabled: true, group: 'عام' },
  { id: 'appointments', label: 'المواعيد', enabled: true, group: 'سريري' },
  { id: 'dailyVisits', label: 'الزيارات اليومية', enabled: true, group: 'سريري' },
  { id: 'clinicalVisits', label: 'الزيارات السريرية', enabled: true, group: 'سريري' },
  { id: 'procedures', label: 'الإجراءات العلاجية', enabled: true, group: 'سريري' },
  { id: 'prescriptions', label: 'الوصفات', enabled: true, group: 'سريري' },
  { id: 'generalDentistry', label: 'طب الأسنان العام', enabled: true, group: 'سريري' },
  { id: 'orthodontics', label: 'التقويم', enabled: true, group: 'سريري' },
  { id: 'surgery', label: 'الجراحة', enabled: true, group: 'سريري' },
  { id: 'treatmentPlan', label: 'خطة العلاج', enabled: true, group: 'سريري' },
  { id: 'timeline', label: 'السجل الزمني', enabled: true, group: 'سجلات' },
  { id: 'referrals', label: 'الإحالات', enabled: true, group: 'سجلات' },
  { id: 'labOrders', label: 'طلبات المختبر', enabled: true, group: 'سجلات' },
  { id: 'photos', label: 'الصور السريرية', enabled: true, group: 'سجلات' },
  { id: 'radiographs', label: 'الأشعة', enabled: true, group: 'سجلات' },
  { id: 'documents', label: 'المستندات', enabled: true, group: 'سجلات' },
  { id: 'finance', label: 'المالية', enabled: true, group: 'مالي' },
  { id: 'messages', label: 'الرسائل', enabled: false, group: 'تواصل' },
  { id: 'portalAccess', label: 'بوابة المريض', enabled: false, group: 'بوابة' },
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
  const [activeTab, setActiveTab] = useState('overview');

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
    if (tabId === 'overview' || tabId === 'info' || tabId === 'medicalHistory' || tabId === 'dentalHistory') return;
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

  // Group tabs by their group
  const groups = TABS.reduce((acc, tab) => {
    const group = tab.group || 'أخرى';
    if (!acc[group]) acc[group] = [];
    acc[group].push(tab);
    return acc;
  }, {} as Record<string, typeof TABS>);

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

      {/* Quick Stats Bar */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickStat label="المواعيد" value={summary.lastAppointment ? '1+' : '0'} color="bg-blue-50 text-blue-700" />
          <QuickStat label="الزيارات السريرية" value={summary.totalClinicalVisits.toString()} color="bg-green-50 text-green-700" />
          <QuickStat label="الإجراءات" value={summary.latestProcedures.length.toString()} color="bg-orange/5 text-orange" />
          <QuickStat label="الوصفات" value={summary.latestPrescriptions.length.toString()} color="bg-purple-50 text-purple-700" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {Object.entries(groups).map(([groupName, tabs], gi) => (
          <div key={groupName} className="flex items-center">
            {gi > 0 && <div className="mx-1 h-6 w-px bg-gray-300" />}
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
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab patient={patient} summary={summary} timeline={timeline} />}
      {activeTab === 'info' && <InfoTab patient={patient} />}
      {activeTab === 'medicalHistory' && <MedicalHistoryTab patientId={patientId} canEdit={canEdit} />}
      {activeTab === 'dentalHistory' && <DentalHistoryTab patientId={patientId} canEdit={canEdit} />}
      {activeTab === 'appointments' && <AppointmentsTab appointments={appointments} />}
      {activeTab === 'dailyVisits' && <DailyVisitsTab timeline={timeline} />}
      {activeTab === 'clinicalVisits' && <ClinicalVisitsTab entries={clinicalVisits} />}
      {activeTab === 'procedures' && <ProceduresTab entries={procedures} />}
      {activeTab === 'prescriptions' && <PrescriptionsTab entries={prescriptions} summary={summary} />}
      {activeTab === 'generalDentistry' && <GeneralDentistryTab patientId={patientId} />}
      {activeTab === 'orthodontics' && <OrthodonticsTab patientId={patientId} />}
      {activeTab === 'surgery' && <SurgeryTab patientId={patientId} />}
      {activeTab === 'treatmentPlan' && <TreatmentPlanTab patientId={patientId} canEdit={canEdit} />}
      {activeTab === 'timeline' && <TimelineViewTab entries={timeline} />}
      {activeTab === 'referrals' && <ReferralsTab patientId={patientId} />}
      {activeTab === 'labOrders' && <LabOrdersTab patientId={patientId} />}
      {activeTab === 'photos' && <ClinicalPhotosTab patientId={patientId} canEdit={canEdit} />}
      {activeTab === 'radiographs' && <RadiographsTab patientId={patientId} canEdit={canEdit} />}
      {activeTab === 'documents' && <DocumentsTab patientId={patientId} canEdit={canEdit} />}
      {activeTab === 'finance' && <FinanceTab patientId={patientId} />}

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

function QuickStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-lg px-4 py-3 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  );
}

function OverviewTab({ patient, summary: _s, timeline }: { patient: PatientDto; summary: PatientSummaryDto | null; timeline: TimelineEntryDto[] }) {
  void _s;
  return (
    <div className="space-y-6">
      {/* Patient Quick Info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
              {patient.fullName.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-navy">{patient.fullName}</p>
              <p className="text-sm text-gray-500">{patient.patientNumber}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">معلومات الاتصال</p>
          <p className="mt-1 text-sm font-medium text-navy" dir="ltr">{patient.phoneNumber}</p>
          {patient.whatsAppNumber && (
            <p className="text-sm text-green-600" dir="ltr">{patient.whatsAppNumber}</p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">معلومات أساسية</p>
          <div className="mt-1 flex gap-3 text-sm">
            <span className="font-medium text-navy">{patient.genderDisplay}</span>
            {patient.dateOfBirth && (
              <span className="text-gray-500">
                {new Date(patient.dateOfBirth).toLocaleDateString('ar-SA')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {timeline.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-bold text-navy">النشاط الأخير</h3>
          <div className="space-y-3">
            {timeline.slice(0, 5).map((entry) => (
              <div key={`${entry.type}-${entry.id}`} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    entry.type === 'clinicalVisit' ? 'bg-green-100 text-green-700'
                    : entry.type === 'procedure' ? 'bg-orange/10 text-orange'
                    : entry.type === 'prescription' ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                  }`}>
                    {entry.type === 'clinicalVisit' ? 'س'
                    : entry.type === 'procedure' ? 'ع'
                    : entry.type === 'prescription' ? 'و'
                    : 'م'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-navy">{entry.title}</p>
                    {entry.subtitle && <p className="text-xs text-gray-500">{entry.subtitle}</p>}
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString('ar-SA')}</p>
                  {entry.statusDisplay && (
                    <span className="text-xs font-medium text-gray-500">{entry.statusDisplay}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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

function TimelineViewTab({ entries }: { entries: TimelineEntryDto[] }) {
  if (entries.length === 0) {
    return <EmptyTab message="لا توجد أحداث في السجل الزمني" />;
  }
  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const iconMap: Record<string, { bg: string; text: string; label: string }> = {
          appointment: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'م' },
          dailyVisit: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'ي' },
          clinicalVisit: { bg: 'bg-green-100', text: 'text-green-700', label: 'س' },
          procedure: { bg: 'bg-orange/10', text: 'text-orange', label: 'ع' },
          prescription: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'و' },
        };
        const icon = iconMap[entry.type] || { bg: 'bg-gray-100', text: 'text-gray-700', label: '?' };

        return (
          <div key={`${entry.type}-${entry.id}`} className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${icon.bg} ${icon.text}`}>
              {icon.label}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-bold text-navy">{entry.title}</p>
                <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString('ar-SA')}</p>
              </div>
              {entry.subtitle && <p className="mt-0.5 text-sm text-gray-500">{entry.subtitle}</p>}
              {entry.statusDisplay && (
                <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {entry.statusDisplay}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FinanceTab({ patientId }: { patientId: string }) {
  const [summary, setSummary] = useState<PatientFinanceSummaryDto | null>(null);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [contracts, setContracts] = useState<ContractDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const [showCreateContract, setShowCreateContract] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingContract, setSavingContract] = useState(false);

  // Payment form
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentMethod: 0,
    contractId: '',
    serviceDescription: '',
    notes: '',
  });

  // Contract form
  const [contractForm, setContractForm] = useState({
    totalAmount: '',
    downPayment: '',
    installmentsCount: '',
    installmentAmount: '',
    specialty: '',
    startDate: '',
    discountAmount: '',
    discountReason: '',
    notes: '',
  });

  const contractStatusColors: Record<number, string> = {
    0: 'bg-green-100 text-green-700',
    1: 'bg-blue-100 text-blue-700',
    2: 'bg-red-100 text-red-700',
    3: 'bg-yellow-100 text-yellow-700',
  };

  const paymentMethodColors: Record<number, string> = {
    0: 'bg-green-100 text-green-700',
    1: 'bg-blue-100 text-blue-700',
    2: 'bg-purple-100 text-purple-700',
    3: 'bg-yellow-100 text-yellow-700',
    99: 'bg-gray-100 text-gray-700',
  };

  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, payRes, conRes] = await Promise.all([
        api.get<PatientFinanceSummaryDto>(`/finance/patients/${patientId}/summary`).catch(() => null),
        api.get<PagedResult<PaymentDto>>(`/finance/payments?patientId=${patientId}&pageSize=50`).catch(() => null),
        api.get<PagedResult<ContractDto>>(`/finance/contracts?patientId=${patientId}&pageSize=50`).catch(() => null),
      ]);
      if (sumRes?.data) setSummary(sumRes.data);
      if (payRes?.data) setPayments(payRes.data.items || []);
      if (conRes?.data) setContracts(conRes.data.items || []);
    } catch {
      // silent
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) return;
    setSavingPayment(true);
    try {
      const req: CreatePaymentRequest = {
        patientId,
        amount: Number(payForm.amount),
        paymentMethod: payForm.paymentMethod,
        contractId: payForm.contractId || null,
        serviceDescription: payForm.serviceDescription || null,
        notes: payForm.notes || null,
      };
      await api.post('/finance/payments', req);
      setShowCreatePayment(false);
      setPayForm({ amount: '', paymentMethod: 0, contractId: '', serviceDescription: '', notes: '' });
      loadData();
    } catch {
      // silent
    }
    setSavingPayment(false);
  };

  const handleCreateContract = async () => {
    if (!contractForm.totalAmount || !contractForm.installmentsCount) return;
    setSavingContract(true);
    try {
      const req: CreateContractRequest = {
        patientId,
        totalAmount: Number(contractForm.totalAmount),
        downPayment: Number(contractForm.downPayment) || 0,
        installmentsCount: Number(contractForm.installmentsCount),
        installmentAmount: contractForm.installmentAmount ? Number(contractForm.installmentAmount) : null,
        specialty: contractForm.specialty || null,
        startDate: contractForm.startDate || null,
        discountAmount: contractForm.discountAmount ? Number(contractForm.discountAmount) : undefined,
        discountReason: contractForm.discountReason || null,
        notes: contractForm.notes || null,
      };
      await api.post('/finance/contracts', req);
      setShowCreateContract(false);
      setContractForm({ totalAmount: '', downPayment: '', installmentsCount: '', installmentAmount: '', specialty: '', startDate: '', discountAmount: '', discountReason: '', notes: '' });
      loadData();
    } catch {
      // silent
    }
    setSavingContract(false);
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Finance Summary */}
      {summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-green-50 px-4 py-3">
            <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.totalPaid)}</p>
            <p className="text-xs font-medium text-green-600">الإجمالي المدفوع</p>
          </div>
          <div className="rounded-lg bg-red-50 px-4 py-3">
            <p className="text-2xl font-bold text-red-700">{formatCurrency(summary.totalOutstanding)}</p>
            <p className="text-xs font-medium text-red-600">المبلغ المستحق</p>
          </div>
          <div className="rounded-lg bg-navy/5 px-4 py-3">
            <p className="text-2xl font-bold text-navy">{formatCurrency(summary.totalContractAmount)}</p>
            <p className="text-xs font-medium text-navy/70">إجمالي العقود ({summary.totalContracts})</p>
          </div>
        </div>
      )}

      {/* Payments */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-navy">المدفوعات</h3>
          <button
            onClick={() => setShowCreatePayment(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-orange px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            دفعة جديدة
          </button>
        </div>
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-3 py-2 text-right font-medium text-gray-600">المبلغ</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">طريقة الدفع</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">الوصف</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-navy">{formatCurrency(p.amount)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${paymentMethodColors[p.paymentMethod] || 'bg-gray-100 text-gray-700'}`}>
                        {PaymentMethodLabels[p.paymentMethod] || p.paymentMethodDisplay}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[200px] truncate text-gray-500">{p.serviceDescription || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{new Date(p.paymentDate).toLocaleDateString('ar-SA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-gray-400">لا توجد مدفوعات مسجلة</p>
        )}
      </div>

      {/* Contracts */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-navy">العقود</h3>
          <button
            onClick={() => setShowCreateContract(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-orange px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            عقد جديد
          </button>
        </div>
        {contracts.length > 0 ? (
          <div className="space-y-3">
            {contracts.map((c) => (
              <div key={c.id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${contractStatusColors[c.status] || 'bg-gray-100 text-gray-700'}`}>
                      {ContractStatusLabels[c.status] || c.statusDisplay}
                    </span>
                    {c.specialty && <span className="mr-2 text-xs text-gray-500">{c.specialty}</span>}
                  </div>
                  <p className="text-sm font-bold text-navy">{formatCurrency(c.totalAmount)}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>دفعة مقدمة: {formatCurrency(c.downPayment)}</span>
                  <span>أقساط: {c.installmentsCount}</span>
                  {c.installmentAmount && <span>قسط: {formatCurrency(c.installmentAmount)}</span>}
                  {c.discountAmount > 0 && <span className="text-green-600">خصم: {formatCurrency(c.discountAmount)}</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-gray-400">لا توجد عقود مسجلة</p>
        )}
      </div>

      {/* Create Payment Modal */}
      {showCreatePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreatePayment(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">دفعة جديدة</h2>
              <button onClick={() => setShowCreatePayment(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">المبلغ <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    placeholder="0.00"
                    min={0}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">طريقة الدفع <span className="text-red-500">*</span></label>
                  <select
                    value={payForm.paymentMethod}
                    onChange={(e) => setPayForm({ ...payForm, paymentMethod: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  >
                    {Object.entries(PaymentMethodLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">العقد</label>
                <select
                  value={payForm.contractId}
                  onChange={(e) => setPayForm({ ...payForm, contractId: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                >
                  <option value="">-- بدون عقد --</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>عقد {formatCurrency(c.totalAmount)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">وصف الخدمة</label>
                <input
                  type="text"
                  value={payForm.serviceDescription}
                  onChange={(e) => setPayForm({ ...payForm, serviceDescription: e.target.value })}
                  placeholder="مثال: حشوة سن"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  rows={2}
                  placeholder="ملاحظات..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreatePayment}
                  disabled={savingPayment || !payForm.amount}
                  className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                >
                  {savingPayment ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
                </button>
                <button onClick={() => setShowCreatePayment(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Contract Modal */}
      {showCreateContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreateContract(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">عقد جديد</h2>
              <button onClick={() => setShowCreateContract(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">التخصص</label>
                <input
                  type="text"
                  value={contractForm.specialty}
                  onChange={(e) => setContractForm({ ...contractForm, specialty: e.target.value })}
                  placeholder="مثال: تقويم أسنان"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">المبلغ الإجمالي <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={contractForm.totalAmount}
                    onChange={(e) => setContractForm({ ...contractForm, totalAmount: e.target.value })}
                    placeholder="0.00"
                    min={0}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">الدفعة المقدمة</label>
                  <input
                    type="number"
                    value={contractForm.downPayment}
                    onChange={(e) => setContractForm({ ...contractForm, downPayment: e.target.value })}
                    placeholder="0.00"
                    min={0}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">عدد الأقساط <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={contractForm.installmentsCount}
                    onChange={(e) => setContractForm({ ...contractForm, installmentsCount: e.target.value })}
                    placeholder="0"
                    min={1}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">قيمة القسط</label>
                  <input
                    type="number"
                    value={contractForm.installmentAmount}
                    onChange={(e) => setContractForm({ ...contractForm, installmentAmount: e.target.value })}
                    placeholder="تلقائي"
                    min={0}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">تاريخ البدء</label>
                  <input
                    type="date"
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">مبلغ الخصم</label>
                  <input
                    type="number"
                    value={contractForm.discountAmount}
                    onChange={(e) => setContractForm({ ...contractForm, discountAmount: e.target.value })}
                    placeholder="0.00"
                    min={0}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea
                  value={contractForm.notes}
                  onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })}
                  rows={2}
                  placeholder="ملاحظات..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreateContract}
                  disabled={savingContract || !contractForm.totalAmount || !contractForm.installmentsCount}
                  className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                >
                  {savingContract ? 'جاري الحفظ...' : 'إنشاء العقد'}
                </button>
                <button onClick={() => setShowCreateContract(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
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
