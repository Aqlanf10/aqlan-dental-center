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
  PatientFinanceSummaryDto,
  UserRole,
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
import FinanceTab from './tabs/FinanceTab';
import PatientStickyHeader from '../../app/dashboard/patients/[id]/_components/PatientStickyHeader';
import PatientCommandBar from '../../app/dashboard/patients/[id]/_components/PatientCommandBar';
import NewSessionModal from './modals/NewSessionModal';
import TreatmentPlanModal from './modals/TreatmentPlanModal';
import PrescriptionModal from './modals/PrescriptionModal';
import CollectPaymentModal from './modals/CollectPaymentModal';
import NewInvoiceModal from './modals/NewInvoiceModal';
import UploadPhotoModal from './modals/UploadPhotoModal';
import UploadRadiographModal from './modals/UploadRadiographModal';
import UploadDocumentModal from './modals/UploadDocumentModal';

interface PatientDetailsProps {
  patientId: string;
  canEdit: boolean;
  canDelete: boolean;
  userRole?: UserRole;
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

export default function PatientDetails({ patientId, canEdit, canDelete, userRole }: PatientDetailsProps) {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientDto | null>(null);
  const [summary, setSummary] = useState<PatientSummaryDto | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntryDto[]>([]);
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [financeSummary, setFinanceSummary] = useState<PatientFinanceSummaryDto | null>(null);

  // Modal states
  const [showNewSession, setShowNewSession] = useState(false);
  const [showTreatmentPlan, setShowTreatmentPlan] = useState(false);
  const [showPrescription, setShowPrescription] = useState(false);
  const [showCollectPayment, setShowCollectPayment] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showUploadPhoto, setShowUploadPhoto] = useState(false);
  const [showUploadRadiograph, setShowUploadRadiograph] = useState(false);
  const [showUploadDocument, setShowUploadDocument] = useState(false);

  const [activeCommandAction, setActiveCommandAction] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const patientRes = await api.get<PatientDto>(`/patients/${patientId}`);
      setPatient(patientRes.data);
    } catch { /* silent */ }
    try {
      const res = await api.get<PatientFinanceSummaryDto>(`/finance/patients/${patientId}/summary`);
      setFinanceSummary(res.data);
    } catch { /* silent */ }
  }, [patientId]);

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

  useEffect(() => {
    async function loadFinance() {
      try {
        const res = await api.get<PatientFinanceSummaryDto>(`/finance/patients/${patientId}/summary`);
        setFinanceSummary(res.data);
      } catch { /* silent */ }
    }
    loadFinance();
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

  const handleCommandAction = (action: string, callback?: () => void) => {
    setActiveCommandAction(action);
    callback?.();
    // Reset active state after a short delay
    setTimeout(() => setActiveCommandAction(null), 300);
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

  const groups = TABS.reduce((acc, tab) => {
    const group = tab.group || 'أخرى';
    if (!acc[group]) acc[group] = [];
    acc[group].push(tab);
    return acc;
  }, {} as Record<string, typeof TABS>);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 -m-6">
      {/* 1. Sticky Header */}
      <PatientStickyHeader
        patient={patient}
        financeSummary={financeSummary}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={() => router.push(`/dashboard/patients/${patientId}/edit`)}
        onDelete={() => setShowDelete(true)}
        onBack={() => router.push('/dashboard/patients')}
        onPrint={() => window.print()}
      />

      {/* 2. Command Bar (Ribbon) */}
      <PatientCommandBar
        userRole={userRole}
        activeAction={activeCommandAction}
        onNewSession={() => handleCommandAction('newSession', () => setShowNewSession(true))}
        onTreatmentPlan={() => handleCommandAction('treatmentPlan', () => setShowTreatmentPlan(true))}
        onPrescription={() => handleCommandAction('prescription', () => setShowPrescription(true))}
        onCollectPayment={() => handleCommandAction('collectPayment', () => setShowCollectPayment(true))}
        onNewInvoice={() => handleCommandAction('newInvoice', () => setShowNewInvoice(true))}
        onReturnNotice={() => handleCommandAction('returnNotice')}
        onUploadPhoto={() => handleCommandAction('uploadPhoto', () => setShowUploadPhoto(true))}
        onUploadRadiograph={() => handleCommandAction('uploadRadiograph', () => setShowUploadRadiograph(true))}
        onUploadDocument={() => handleCommandAction('uploadDocument', () => setShowUploadDocument(true))}
        onPrint={() => window.print()}
        onExport={() => window.print()}
      />

      {/* 3. Tab Bar */}
      <div className="bg-white dark:bg-slate-800 px-4 pt-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <div className="flex gap-1 min-w-max" dir="rtl">
          {Object.entries(groups).map(([groupName, tabs], gi) => (
            <div key={groupName} className="flex items-center">
              {gi > 0 && <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-600" />}
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => tab.enabled && setActiveTab(tab.id)}
                  className={`relative whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors rounded-t-md font-[Tajawal] ${
                    activeTab === tab.id
                      ? 'text-[#3d7ab5] bg-[#3d7ab5]/5 border-b-2 border-[#3d7ab5]'
                      : tab.enabled
                      ? 'text-slate-500 hover:text-[#1a3a5c] hover:bg-slate-50'
                      : 'cursor-not-allowed text-slate-400'
                  }`}
                  disabled={!tab.enabled}
                >
                  {tab.label}
                  {!tab.enabled && (
                    <span className="mr-1 rounded-full bg-[#f5922e]/20 px-1.5 py-0.5 text-[9px] text-[#f5922e]">قريبًا</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Tab Content */}
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 min-h-[400px]">
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
        </div>
      </div>

      {/* Modals */}
      <NewSessionModal isOpen={showNewSession} onClose={() => setShowNewSession(false)} patientId={patientId} onSuccess={refreshData} />
      <TreatmentPlanModal isOpen={showTreatmentPlan} onClose={() => setShowTreatmentPlan(false)} patientId={patientId} onSuccess={refreshData} />
      <PrescriptionModal isOpen={showPrescription} onClose={() => setShowPrescription(false)} patientId={patientId} onSuccess={refreshData} />
      <CollectPaymentModal isOpen={showCollectPayment} onClose={() => setShowCollectPayment(false)} patientId={patientId} onSuccess={refreshData} />
      <NewInvoiceModal isOpen={showNewInvoice} onClose={() => setShowNewInvoice(false)} patientId={patientId} onSuccess={refreshData} />
      <UploadPhotoModal isOpen={showUploadPhoto} onClose={() => setShowUploadPhoto(false)} patientId={patientId} onSuccess={refreshData} />
      <UploadRadiographModal isOpen={showUploadRadiograph} onClose={() => setShowUploadRadiograph(false)} patientId={patientId} onSuccess={refreshData} />
      <UploadDocumentModal isOpen={showUploadDocument} onClose={() => setShowUploadDocument(false)} patientId={patientId} onSuccess={refreshData} />

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

function OverviewTab({ patient, summary: _s, timeline }: { patient: PatientDto; summary: PatientSummaryDto | null; timeline: TimelineEntryDto[] }) {
  void _s;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3d7ab5]/10 text-xl font-bold text-[#3d7ab5]">
              {patient.fullName.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-[#1a3a5c]">{patient.fullName}</p>
              <p className="text-sm text-gray-500">{patient.patientNumber}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">معلومات الاتصال</p>
          <p className="mt-1 text-sm font-medium text-[#1a3a5c]" dir="ltr">{patient.phoneNumber}</p>
          {patient.whatsAppNumber && (
            <p className="text-sm text-green-600" dir="ltr">{patient.whatsAppNumber}</p>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">معلومات أساسية</p>
          <div className="mt-1 flex gap-3 text-sm">
            <span className="font-medium text-[#1a3a5c]">{patient.genderDisplay}</span>
            {patient.dateOfBirth && (
              <span className="text-gray-500">
                {new Date(patient.dateOfBirth).toLocaleDateString('ar-SA')}
              </span>
            )}
          </div>
        </div>
      </div>
      {timeline.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-bold text-[#1a3a5c]">النشاط الأخير</h3>
          <div className="space-y-3">
            {timeline.slice(0, 5).map((entry) => (
              <div key={`${entry.type}-${entry.id}`} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    entry.type === 'clinicalVisit' ? 'bg-green-100 text-green-700'
                    : entry.type === 'procedure' ? 'bg-[#f5922e]/10 text-[#f5922e]'
                    : entry.type === 'prescription' ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                  }`}>
                    {entry.type === 'clinicalVisit' ? 'س'
                    : entry.type === 'procedure' ? 'ع'
                    : entry.type === 'prescription' ? 'و'
                    : 'م'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[#1a3a5c]">{entry.title}</p>
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
      <dd className={`mt-1 text-sm font-medium text-[#1a3a5c] ${dir === 'ltr' ? 'text-left' : ''}`} dir={dir}>
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

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="mt-3 text-sm text-gray-400">{message}</p>
    </div>
  );
}

function AppointmentsTab({ appointments }: { appointments: AppointmentDto[] }) {
  if (appointments.length === 0) return <EmptyTab message="لا توجد مواعيد مسجلة لهذا المريض" />;
  return (
    <div className="space-y-3">
      {appointments.map((apt) => (
        <div key={apt.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#1a3a5c]">{apt.doctorName}</p>
              <p className="text-sm text-gray-500">{apt.serviceType}</p>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#1a3a5c]">{new Date(apt.appointmentDate).toLocaleDateString('ar-SA')}</p>
              <p className="text-sm text-gray-500" dir="ltr">{apt.startTime} - {apt.endTime || '—'}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              apt.status === 2 ? 'bg-green-100 text-green-700'
              : apt.status === 3 ? 'bg-red-100 text-red-700'
              : apt.status === 4 ? 'bg-gray-100 text-gray-600'
              : 'bg-blue-100 text-blue-700'
            }`}>{apt.statusDisplay}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyVisitsTab({ timeline }: { timeline: TimelineEntryDto[] }) {
  const visits = timeline.filter((e) => e.type === 'dailyVisit');
  if (visits.length === 0) return <EmptyTab message="لا توجد زيارات يومية مسجلة" />;
  return (
    <div className="space-y-3">
      {visits.map((v) => (
        <div key={v.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#1a3a5c]">{v.title}</p>
              {v.subtitle && <p className="text-sm text-gray-500">{v.subtitle}</p>}
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-500">{new Date(v.date).toLocaleDateString('ar-SA')}</p>
              {v.statusDisplay && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{v.statusDisplay}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClinicalVisitsTab({ entries }: { entries: TimelineEntryDto[] }) {
  if (entries.length === 0) return <EmptyTab message="لا توجد زيارات سريرية مسجلة" />;
  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <div key={e.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#1a3a5c]">{e.title}</p>
              {e.subtitle && <p className="text-sm text-gray-500">{e.subtitle}</p>}
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-500">{new Date(e.date).toLocaleDateString('ar-SA')}</p>
              {e.statusDisplay && <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{e.statusDisplay}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProceduresTab({ entries }: { entries: TimelineEntryDto[] }) {
  if (entries.length === 0) return <EmptyTab message="لا توجد إجراءات علاجية مسجلة" />;
  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <div key={e.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#1a3a5c]">{e.title}</p>
              {e.subtitle && <p className="text-sm text-gray-500">{e.subtitle}</p>}
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-500">{new Date(e.date).toLocaleDateString('ar-SA')}</p>
              {e.statusDisplay && <span className="rounded-full bg-[#f5922e]/10 px-3 py-1 text-xs font-bold text-[#f5922e]">{e.statusDisplay}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PrescriptionsTab({ entries, summary }: { entries: TimelineEntryDto[]; summary: PatientSummaryDto | null }) {
  const rxFromSummary = summary?.latestPrescriptions ?? [];
  if (entries.length === 0 && rxFromSummary.length === 0) return <EmptyTab message="لا توجد وصفات طبية مسجلة" />;
  return (
    <div className="space-y-3">
      {rxFromSummary.map((rx) => (
        <div key={rx.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#1a3a5c]">{rx.medicationName}</p>
              <div className="mt-1 flex gap-3 text-sm text-gray-500">
                {rx.dosage && <span>الجرعة: {rx.dosage}</span>}
                {rx.frequency && <span>التكرار: {rx.frequency}</span>}
                {rx.duration && <span>المدة: {rx.duration}</span>}
              </div>
            </div>
            <p className="text-sm text-gray-400">{new Date(rx.createdAt).toLocaleDateString('ar-SA')}</p>
          </div>
        </div>
      ))}
      {entries.filter((e) => e.type === 'prescription').map((e) => (
        <div key={e.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-[#1a3a5c]">{e.title}</p>
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
  if (entries.length === 0) return <EmptyTab message="لا توجد أحداث في السجل الزمني" />;
  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const iconMap: Record<string, { bg: string; text: string; label: string }> = {
          appointment: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'م' },
          dailyVisit: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'ي' },
          clinicalVisit: { bg: 'bg-green-100', text: 'text-green-700', label: 'س' },
          procedure: { bg: 'bg-[#f5922e]/10', text: 'text-[#f5922e]', label: 'ع' },
          prescription: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'و' },
        };
        const icon = iconMap[entry.type] || { bg: 'bg-gray-100', text: 'text-gray-700', label: '?' };
        return (
          <div key={`${entry.type}-${entry.id}`} className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${icon.bg} ${icon.text}`}>{icon.label}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-bold text-[#1a3a5c]">{entry.title}</p>
                <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString('ar-SA')}</p>
              </div>
              {entry.subtitle && <p className="mt-0.5 text-sm text-gray-500">{entry.subtitle}</p>}
              {entry.statusDisplay && <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{entry.statusDisplay}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
