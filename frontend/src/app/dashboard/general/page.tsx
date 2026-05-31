'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DentalChart from '@/components/dental/DentalChart';
import { api } from '@/lib/api';
import {
  PatientDto,
  DoctorDto,
  GeneralTreatmentDto,
  GeneralTreatmentTypeLabels,
  CreateGeneralTreatmentRequest,
  TreatmentPlanStepDto,
  TreatmentStepPriorityEnum,
  TreatmentStepStatusEnum,
  AddTreatmentPlanStepRequest,
  TreatmentStepStatusEnum as StatusEnum,
} from '@/types/api';

type TabKey = 'chart' | 'treatments' | 'plan';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'chart', label: 'الخريطة السنية' },
  { key: 'treatments', label: 'العلاجات' },
  { key: 'plan', label: 'خطة العلاج' },
];

const priorityLabels: Record<number, string> = {
  [TreatmentStepPriorityEnum.Low]: 'منخفض',
  [TreatmentStepPriorityEnum.Normal]: 'عادي',
  [TreatmentStepPriorityEnum.High]: 'مرتفع',
  [TreatmentStepPriorityEnum.Urgent]: 'عاجل',
};

const priorityColors: Record<number, string> = {
  [TreatmentStepPriorityEnum.Low]: 'bg-gray-100 text-gray-700',
  [TreatmentStepPriorityEnum.Normal]: 'bg-blue-100 text-blue-700',
  [TreatmentStepPriorityEnum.High]: 'bg-orange-100 text-orange',
  [TreatmentStepPriorityEnum.Urgent]: 'bg-red-100 text-red-700',
};

const statusLabels: Record<number, string> = {
  [TreatmentStepStatusEnum.Planned]: 'مخطط',
  [TreatmentStepStatusEnum.InProgress]: 'قيد التنفيذ',
  [TreatmentStepStatusEnum.Completed]: 'مكتمل',
  [TreatmentStepStatusEnum.Skipped]: 'تم تخطيه',
  [TreatmentStepStatusEnum.Cancelled]: 'ملغي',
};

const statusColors: Record<number, string> = {
  [TreatmentStepStatusEnum.Planned]: 'bg-gray-100 text-gray-700',
  [TreatmentStepStatusEnum.InProgress]: 'bg-blue-100 text-blue-700',
  [TreatmentStepStatusEnum.Completed]: 'bg-green-100 text-green-700',
  [TreatmentStepStatusEnum.Skipped]: 'bg-yellow-100 text-yellow-700',
  [TreatmentStepStatusEnum.Cancelled]: 'bg-red-100 text-red-700',
};

function GeneralDentistryContent() {
  const [activeTab, setActiveTab] = useState<TabKey>('chart');
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientSearch, setPatientSearch] = useState('');

  // Treatments state
  const [treatments, setTreatments] = useState<GeneralTreatmentDto[]>([]);
  const [treatmentsLoading, setTreatmentsLoading] = useState(false);
  const [showAddTreatment, setShowAddTreatment] = useState(false);

  // Treatment plan state
  const [planSteps, setPlanSteps] = useState<TreatmentPlanStepDto[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);

  // Add treatment form
  const [treatForm, setTreatForm] = useState({
    treatmentType: 0,
    toothNumber: '',
    materialUsed: '',
    anesthesiaType: '',
    cost: '',
    doctorId: '',
    notes: '',
  });
  const [treatSaving, setTreatSaving] = useState(false);

  // Add plan step form
  const [stepForm, setStepForm] = useState({
    title: '',
    description: '',
    department: '',
    toothNumber: '',
    toothArea: '',
    priority: 1,
    responsibleDoctorId: '',
    plannedDate: '',
    estimatedCost: '',
    notes: '',
  });
  const [stepSaving, setStepSaving] = useState(false);

  // Update step status
  const [updatingStepId, setUpdatingStepId] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        api.get<{ items: PatientDto[] }>('/patients?page=1&pageSize=1000'),
        api.get<{ items: DoctorDto[] }>('/doctors?page=1&pageSize=100'),
      ]);
      setPatients(patientsRes.data.items || []);
      setDoctors(doctorsRes.data.items || []);
    } catch {
      // silent
    }
  };

  const fetchTreatments = useCallback(async () => {
    if (!selectedPatientId) return;
    setTreatmentsLoading(true);
    try {
      const res = await api.get<{ items: GeneralTreatmentDto[] }>(
        `/general/treatments/${selectedPatientId}?page=1&pageSize=50`
      );
      setTreatments(res.data.items || []);
    } catch {
      setTreatments([]);
    }
    setTreatmentsLoading(false);
  }, [selectedPatientId]);

  const fetchPlanSteps = useCallback(async () => {
    if (!selectedPatientId) return;
    setPlanLoading(true);
    try {
      const res = await api.get<TreatmentPlanStepDto[]>(
        `/general/treatment-plan/${selectedPatientId}`
      );
      setPlanSteps(res.data || []);
    } catch {
      setPlanSteps([]);
    }
    setPlanLoading(false);
  }, [selectedPatientId]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchTreatments();
      fetchPlanSteps();
    }
  }, [selectedPatientId, fetchTreatments, fetchPlanSteps]);

  const filteredPatients = patientSearch
    ? patients.filter(p =>
        p.fullName.includes(patientSearch) ||
        p.patientNumber.includes(patientSearch) ||
        p.phoneNumber.includes(patientSearch))
    : patients;

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Create treatment
  const handleCreateTreatment = async () => {
    if (!selectedPatientId) return;
    setTreatSaving(true);
    try {
      const request: CreateGeneralTreatmentRequest = {
        patientId: selectedPatientId,
        treatmentType: treatForm.treatmentType,
        toothNumber: treatForm.toothNumber ? Number(treatForm.toothNumber) : null,
        materialUsed: treatForm.materialUsed || null,
        anesthesiaType: treatForm.anesthesiaType || null,
        cost: treatForm.cost ? Number(treatForm.cost) : null,
        doctorId: treatForm.doctorId || null,
        notes: treatForm.notes || null,
      };
      await api.post('/general/treatments', request);
      setShowAddTreatment(false);
      setTreatForm({ treatmentType: 0, toothNumber: '', materialUsed: '', anesthesiaType: '', cost: '', doctorId: '', notes: '' });
      fetchTreatments();
    } catch {
      // error handled silently
    }
    setTreatSaving(false);
  };

  // Add plan step
  const handleAddStep = async () => {
    if (!selectedPatientId || !stepForm.title) return;
    setStepSaving(true);
    try {
      const request: AddTreatmentPlanStepRequest = {
        patientId: selectedPatientId,
        title: stepForm.title,
        description: stepForm.description || null,
        department: stepForm.department || null,
        toothNumber: stepForm.toothNumber ? Number(stepForm.toothNumber) : null,
        toothArea: stepForm.toothArea || null,
        priority: stepForm.priority,
        responsibleDoctorId: stepForm.responsibleDoctorId || null,
        plannedDate: stepForm.plannedDate || null,
        estimatedCost: stepForm.estimatedCost ? Number(stepForm.estimatedCost) : null,
        notes: stepForm.notes || null,
      };
      await api.post('/general/treatment-plan', request);
      setShowAddStep(false);
      setStepForm({ title: '', description: '', department: '', toothNumber: '', toothArea: '', priority: 1, responsibleDoctorId: '', plannedDate: '', estimatedCost: '', notes: '' });
      fetchPlanSteps();
    } catch {
      // error handled silently
    }
    setStepSaving(false);
  };

  // Update step status
  const handleUpdateStepStatus = async (stepId: string, newStatus: number) => {
    setUpdatingStepId(stepId);
    try {
      await api.patch(`/general/treatment-plan/${stepId}/status`, { status: newStatus });
      fetchPlanSteps();
    } catch {
      // error handled silently
    }
    setUpdatingStepId(null);
  };

  const getNextStatus = (currentStatus: number): number | null => {
    switch (currentStatus) {
      case StatusEnum.Planned: return StatusEnum.InProgress;
      case StatusEnum.InProgress: return StatusEnum.Completed;
      default: return null;
    }
  };

  const getNextStatusLabel = (currentStatus: number): string | null => {
    const next = getNextStatus(currentStatus);
    if (next === null) return null;
    return statusLabels[next] || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">طب الأسنان العام</h1>
          <p className="text-sm text-gray-500">إدارة الخريطة السنية والعلاجات وخطط العلاج</p>
        </div>
      </div>

      {/* Patient Selector */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              المريض <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الرقم..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
            />
          </div>
          <div className="flex-1">
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
            >
              <option value="">-- اختر المريض --</option>
              {filteredPatients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.patientNumber} - {p.fullName}
                </option>
              ))}
            </select>
          </div>
          {selectedPatient && (
            <div className="rounded-lg bg-navy/5 px-4 py-2 text-sm">
              <span className="font-medium text-navy">{selectedPatient.fullName}</span>
              <span className="mr-2 text-gray-500">({selectedPatient.patientNumber})</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'chart' && (
        <DentalChart patientId={selectedPatientId || null} />
      )}

      {activeTab === 'treatments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy">سجل العلاجات</h2>
            <button
              onClick={() => setShowAddTreatment(true)}
              disabled={!selectedPatientId}
              className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              إضافة علاج
            </button>
          </div>

          {!selectedPatientId ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-3 text-sm text-gray-400">اختر مريضًا لعرض العلاجات</p>
            </div>
          ) : treatmentsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" />
            </div>
          ) : treatments.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">نوع العلاج</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">السن</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">المادة</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">الطبيب</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">التكلفة</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {treatments.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{new Date(t.createdAt).toLocaleDateString('ar-SA')}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {GeneralTreatmentTypeLabels[t.treatmentType] || t.treatmentTypeDisplay || 'غير معروف'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{t.toothNumber ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{t.materialUsed ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{t.doctorName ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-700">{t.cost != null ? `${t.cost} ر.س` : '-'}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-gray-500">{t.notes ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-500">لا توجد علاجات مسجلة لهذا المريض</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'plan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy">خطة العلاج</h2>
            <button
              onClick={() => setShowAddStep(true)}
              disabled={!selectedPatientId}
              className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              إضافة خطوة
            </button>
          </div>

          {!selectedPatientId ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-3 text-sm text-gray-400">اختر مريضًا لعرض خطة العلاج</p>
            </div>
          ) : planLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" />
            </div>
          ) : planSteps.length > 0 ? (
            <div className="space-y-3">
              {planSteps
                .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
                .map(step => (
                <div
                  key={step.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                        {step.sequenceNumber}
                      </div>
                      <div>
                        <h3 className="font-bold text-navy">{step.title}</h3>
                        {step.description && (
                          <p className="mt-0.5 text-sm text-gray-500">{step.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityColors[step.priority] || 'bg-gray-100 text-gray-700'}`}>
                            {priorityLabels[step.priority] || step.priorityDisplay}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[step.status] || 'bg-gray-100 text-gray-700'}`}>
                            {statusLabels[step.status] || step.statusDisplay}
                          </span>
                          {step.toothNumber != null && (
                            <span className="inline-flex items-center rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-medium text-navy">
                              سن {step.toothNumber}
                            </span>
                          )}
                          {step.department && (
                            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                              {step.department}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                          {step.responsibleDoctorName && (
                            <span>الطبيب: {step.responsibleDoctorName}</span>
                          )}
                          {step.plannedDate && (
                            <span>التاريخ المخطط: {step.plannedDate}</span>
                          )}
                          {step.completedDate && (
                            <span>تاريخ الإنجاز: {step.completedDate}</span>
                          )}
                          {step.estimatedCost != null && (
                            <span>التكلفة التقديرية: {step.estimatedCost} ر.س</span>
                          )}
                        </div>
                        {step.notes && (
                          <p className="mt-1 text-xs text-gray-400">{step.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Status progression */}
                    {getNextStatus(step.status) !== null && (
                      <button
                        onClick={() => handleUpdateStepStatus(step.id, getNextStatus(step.status)!)}
                        disabled={updatingStepId === step.id}
                        className="shrink-0 rounded-lg bg-blue px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue/90 disabled:opacity-50"
                      >
                        {updatingStepId === step.id ? 'جاري التحديث...' : getNextStatusLabel(step.status)}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-500">لا توجد خطوات في خطة العلاج لهذا المريض</p>
            </div>
          )}
        </div>
      )}

      {/* Add Treatment Modal */}
      {showAddTreatment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddTreatment(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">إضافة علاج جديد</h2>
              <button onClick={() => setShowAddTreatment(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع العلاج <span className="text-red-500">*</span></label>
                <select
                  value={treatForm.treatmentType}
                  onChange={(e) => setTreatForm({ ...treatForm, treatmentType: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                >
                  {Object.entries(GeneralTreatmentTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">رقم السن</label>
                  <input
                    type="number"
                    value={treatForm.toothNumber}
                    onChange={(e) => setTreatForm({ ...treatForm, toothNumber: e.target.value })}
                    placeholder="مثال: 16"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">التكلفة</label>
                  <input
                    type="number"
                    value={treatForm.cost}
                    onChange={(e) => setTreatForm({ ...treatForm, cost: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">المادة المستخدمة</label>
                  <input
                    type="text"
                    value={treatForm.materialUsed}
                    onChange={(e) => setTreatForm({ ...treatForm, materialUsed: e.target.value })}
                    placeholder="مثال: كومبوزيت"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع التخدير</label>
                  <input
                    type="text"
                    value={treatForm.anesthesiaType}
                    onChange={(e) => setTreatForm({ ...treatForm, anesthesiaType: e.target.value })}
                    placeholder="مثال: موضعي"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب</label>
                <select
                  value={treatForm.doctorId}
                  onChange={(e) => setTreatForm({ ...treatForm, doctorId: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                >
                  <option value="">-- بدون طبيب --</option>
                  {doctors.filter(d => d.isActive).map(d => (
                    <option key={d.id} value={d.id}>د. {d.fullName} - {d.specialty}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea
                  value={treatForm.notes}
                  onChange={(e) => setTreatForm({ ...treatForm, notes: e.target.value })}
                  rows={2}
                  placeholder="ملاحظات إضافية..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreateTreatment}
                  disabled={treatSaving}
                  className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                >
                  {treatSaving ? 'جاري الحفظ...' : 'إضافة العلاج'}
                </button>
                <button
                  onClick={() => setShowAddTreatment(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Plan Step Modal */}
      {showAddStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddStep(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">إضافة خطوة علاجية</h2>
              <button onClick={() => setShowAddStep(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">العنوان <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={stepForm.title}
                  onChange={(e) => setStepForm({ ...stepForm, title: e.target.value })}
                  placeholder="مثال: حشوة ضرس 16"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الوصف</label>
                <textarea
                  value={stepForm.description}
                  onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })}
                  rows={2}
                  placeholder="وصف تفصيلي..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">القسم</label>
                  <input
                    type="text"
                    value={stepForm.department}
                    onChange={(e) => setStepForm({ ...stepForm, department: e.target.value })}
                    placeholder="مثال: ترميمي"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الأولوية</label>
                  <select
                    value={stepForm.priority}
                    onChange={(e) => setStepForm({ ...stepForm, priority: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  >
                    <option value={0}>منخفض</option>
                    <option value={1}>عادي</option>
                    <option value={2}>مرتفع</option>
                    <option value={3}>عاجل</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">رقم السن</label>
                  <input
                    type="number"
                    value={stepForm.toothNumber}
                    onChange={(e) => setStepForm({ ...stepForm, toothNumber: e.target.value })}
                    placeholder="مثال: 16"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">منطقة السن</label>
                  <input
                    type="text"
                    value={stepForm.toothArea}
                    onChange={(e) => setStepForm({ ...stepForm, toothArea: e.target.value })}
                    placeholder="مثال: علوي أيمن"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب المسؤول</label>
                  <select
                    value={stepForm.responsibleDoctorId}
                    onChange={(e) => setStepForm({ ...stepForm, responsibleDoctorId: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  >
                    <option value="">-- بدون طبيب --</option>
                    {doctors.filter(d => d.isActive).map(d => (
                      <option key={d.id} value={d.id}>د. {d.fullName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">التاريخ المخطط</label>
                  <input
                    type="date"
                    value={stepForm.plannedDate}
                    onChange={(e) => setStepForm({ ...stepForm, plannedDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">التكلفة التقديرية</label>
                <input
                  type="number"
                  value={stepForm.estimatedCost}
                  onChange={(e) => setStepForm({ ...stepForm, estimatedCost: e.target.value })}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea
                  value={stepForm.notes}
                  onChange={(e) => setStepForm({ ...stepForm, notes: e.target.value })}
                  rows={2}
                  placeholder="ملاحظات إضافية..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddStep}
                  disabled={stepSaving || !stepForm.title}
                  className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                >
                  {stepSaving ? 'جاري الحفظ...' : 'إضافة الخطوة'}
                </button>
                <button
                  onClick={() => setShowAddStep(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GeneralDentistryPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <GeneralDentistryContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
