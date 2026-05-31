'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import {
  OrthoCaseDto,
  OrthoVisitDto,
  PatientDto,
  DoctorDto,
  OrthoCaseStatusLabels,
  OrthoCaseStatusColors,
  OrthoCaseStatusEnum,
  CreateOrthoCaseRequest,
  AddOrthoVisitRequest,
  UpdateTreatmentStageRequest,
  UpdateOrthoCaseRequest,
} from '@/types/api';

type StatusFilter = 'all' | number;

const statusTabs: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: OrthoCaseStatusEnum.Active, label: 'نشط' },
  { key: OrthoCaseStatusEnum.Completed, label: 'مكتمل' },
  { key: OrthoCaseStatusEnum.OnHold, label: 'معلق' },
  { key: OrthoCaseStatusEnum.Cancelled, label: 'ملغي' },
];

const applianceTypes = [
  'تقويم معدني',
  'تقويم سيراميك',
  'تقويم لингوال',
  'تقويم شفاف (إنفزلاين)',
  'تقويم ثابت',
  'تقويم متحرك',
  'أخرى',
];

const stageStatusLabels: Record<number, string> = {
  0: 'لم يبدأ',
  1: 'قيد التنفيذ',
  2: 'مكتمل',
};

const stageStatusColors: Record<number, string> = {
  0: 'bg-gray-100 text-gray-600',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-green-100 text-green-700',
};

function OrthodonticsContent() {
  // List state
  const [cases, setCases] = useState<OrthoCaseDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  // Detail state
  const [selectedCase, setSelectedCase] = useState<OrthoCaseDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Dropdown data
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    patientId: '',
    doctorId: '',
    applianceType: '',
    startDate: '',
    expectedDurationMonths: '',
    totalFee: '',
    notes: '',
  });

  // Visit form
  const [visitForm, setVisitForm] = useState({
    visitType: '',
    currentStage: '',
    wireUpper: '',
    wireLower: '',
    elasticsType: '',
    clinicalNotes: '',
    patientInstructions: '',
    nextAppointmentDate: '',
    doctorId: '',
  });

  // Collapsible sections
  const [expandedVisits, setExpandedVisits] = useState(true);
  const [expandedStages, setExpandedStages] = useState(true);

  // Search
  const [patientSearch, setPatientSearch] = useState('');

  useEffect(() => {
    loadDropdowns();
  }, []);

  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  const loadDropdowns = async () => {
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

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
      const res = await api.get<{ items: OrthoCaseDto[]; totalCount: number }>(
        `/ortho-cases?page=${page}&pageSize=20${statusParam}`
      );
      setCases(res.data.items || []);
      setTotalCount(res.data.totalCount || 0);
    } catch {
      setCases([]);
    }
    setLoading(false);
  }, [statusFilter, page]);

  const fetchCaseDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get<OrthoCaseDto>(`/ortho-cases/${id}`);
      setSelectedCase(res.data);
    } catch {
      // error
    }
    setDetailLoading(false);
  };

  const handleCreateCase = async () => {
    if (!createForm.patientId) return;
    setSaving(true);
    try {
      const request: CreateOrthoCaseRequest = {
        patientId: createForm.patientId,
        doctorId: createForm.doctorId || null,
        applianceType: createForm.applianceType || null,
        startDate: createForm.startDate || null,
        expectedDurationMonths: createForm.expectedDurationMonths ? Number(createForm.expectedDurationMonths) : null,
        totalFee: createForm.totalFee ? Number(createForm.totalFee) : null,
        notes: createForm.notes || null,
      };
      await api.post('/ortho-cases', request);
      setShowCreateModal(false);
      setCreateForm({ patientId: '', doctorId: '', applianceType: '', startDate: '', expectedDurationMonths: '', totalFee: '', notes: '' });
      fetchCases();
    } catch {
      // error
    }
    setSaving(false);
  };

  const handleAddVisit = async () => {
    if (!selectedCase) return;
    setSaving(true);
    try {
      const request: AddOrthoVisitRequest = {
        visitType: visitForm.visitType || null,
        currentStage: visitForm.currentStage || null,
        wireUpper: visitForm.wireUpper || null,
        wireLower: visitForm.wireLower || null,
        elasticsType: visitForm.elasticsType || null,
        clinicalNotes: visitForm.clinicalNotes || null,
        patientInstructions: visitForm.patientInstructions || null,
        nextAppointmentDate: visitForm.nextAppointmentDate || null,
        doctorId: visitForm.doctorId || null,
      };
      await api.post(`/ortho-cases/${selectedCase.id}/visits`, request);
      setShowVisitModal(false);
      setVisitForm({ visitType: '', currentStage: '', wireUpper: '', wireLower: '', elasticsType: '', clinicalNotes: '', patientInstructions: '', nextAppointmentDate: '', doctorId: '' });
      fetchCaseDetail(selectedCase.id);
    } catch {
      // error
    }
    setSaving(false);
  };

  const handleUpdateStageStatus = async (stageId: string, newStatus: number) => {
    if (!selectedCase) return;
    try {
      const request: UpdateTreatmentStageRequest = { status: newStatus };
      await api.patch(`/ortho-cases/stages/${stageId}`, request);
      fetchCaseDetail(selectedCase.id);
    } catch {
      // error
    }
  };

  const handleUpdateCaseStatus = async (newStatus: number) => {
    if (!selectedCase) return;
    try {
      const request: UpdateOrthoCaseRequest = { status: newStatus };
      await api.put(`/ortho-cases/${selectedCase.id}`, request);
      fetchCaseDetail(selectedCase.id);
      fetchCases();
    } catch {
      // error
    }
  };

  const getNextStageStatus = (current: number): number | null => {
    if (current === 0) return 1;
    if (current === 1) return 2;
    return null;
  };

  const filteredPatients = patientSearch
    ? patients.filter(p =>
        p.fullName.includes(patientSearch) ||
        p.patientNumber.includes(patientSearch) ||
        p.phoneNumber.includes(patientSearch))
    : patients;

  // Detail view
  if (selectedCase) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => setSelectedCase(null)}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-navy transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          العودة للقائمة
        </button>

        {/* Case Header */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-navy">حالة التقويم {selectedCase.caseNumber}</h2>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${OrthoCaseStatusColors[selectedCase.status] || 'bg-gray-100 text-gray-700'}`}>
                  {OrthoCaseStatusLabels[selectedCase.status] || selectedCase.statusDisplay}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                <span>المريض: <strong className="text-navy">{selectedCase.patientName}</strong></span>
                {selectedCase.doctorName && <span>الطبيب: <strong className="text-navy">د. {selectedCase.doctorName}</strong></span>}
                {selectedCase.applianceType && <span>نوع الجهاز: {selectedCase.applianceType}</span>}
                {selectedCase.startDate && <span>تاريخ البدء: {new Date(selectedCase.startDate).toLocaleDateString('ar-SA')}</span>}
                {selectedCase.expectedDurationMonths && <span>المدة المتوقعة: {selectedCase.expectedDurationMonths} شهر</span>}
                {selectedCase.totalFee != null && <span>الرسوم: {selectedCase.totalFee} ر.س</span>}
              </div>
            </div>
            <div className="flex gap-2">
              {selectedCase.status === OrthoCaseStatusEnum.Active && (
                <>
                  <button
                    onClick={() => handleUpdateCaseStatus(OrthoCaseStatusEnum.OnHold)}
                    className="rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-200 transition-colors"
                  >
                    تعليق
                  </button>
                  <button
                    onClick={() => handleUpdateCaseStatus(OrthoCaseStatusEnum.Cancelled)}
                    className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => handleUpdateCaseStatus(OrthoCaseStatusEnum.Completed)}
                    className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 transition-colors"
                  >
                    إكمال
                  </button>
                </>
              )}
              {selectedCase.status === OrthoCaseStatusEnum.OnHold && (
                <button
                  onClick={() => handleUpdateCaseStatus(OrthoCaseStatusEnum.Active)}
                  className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 transition-colors"
                >
                  تنشيط
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">مرحلة: {selectedCase.currentStage || '-'}</span>
              <span className="font-medium text-navy">{selectedCase.stagePercentage}%</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full rounded-full bg-gray-100">
              <div
                className="h-2.5 rounded-full bg-orange transition-all"
                style={{ width: `${Math.min(selectedCase.stagePercentage, 100)}%` }}
              />
            </div>
          </div>

          {selectedCase.notes && (
            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              ملاحظات: {selectedCase.notes}
            </div>
          )}
        </div>

        {detailLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Treatment Stages */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <button
                onClick={() => setExpandedStages(!expandedStages)}
                className="flex w-full items-center justify-between p-4"
              >
                <h3 className="text-lg font-bold text-navy">مراحل العلاج ({selectedCase.stages?.length || 0})</h3>
                <svg className={`h-5 w-5 text-gray-400 transition-transform ${expandedStages ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedStages && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  {selectedCase.stages && selectedCase.stages.length > 0 ? (
                    <div className="space-y-3 pt-3">
                      {selectedCase.stages
                        .sort((a, b) => a.stageOrder - b.stageOrder)
                        .map((stage) => (
                          <div key={stage.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-start gap-3">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                                  {stage.stageOrder}
                                </div>
                                <div>
                                  <h4 className="font-semibold text-navy">{stage.stageName}</h4>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${stageStatusColors[stage.status] || 'bg-gray-100 text-gray-600'}`}>
                                      {stageStatusLabels[stage.status] || stage.statusDisplay}
                                    </span>
                                    {stage.targetDurationMonths && (
                                      <span className="text-xs text-gray-500">المدة المستهدفة: {stage.targetDurationMonths} شهر</span>
                                    )}
                                    {stage.startedAt && (
                                      <span className="text-xs text-gray-500">بدأ: {new Date(stage.startedAt).toLocaleDateString('ar-SA')}</span>
                                    )}
                                    {stage.completedAt && (
                                      <span className="text-xs text-gray-500">اكتمل: {new Date(stage.completedAt).toLocaleDateString('ar-SA')}</span>
                                    )}
                                  </div>
                                  {stage.notes && (
                                    <p className="mt-1 text-xs text-gray-400">{stage.notes}</p>
                                  )}
                                </div>
                              </div>
                              {getNextStageStatus(stage.status) !== null && (
                                <button
                                  onClick={() => handleUpdateStageStatus(stage.id, getNextStageStatus(stage.status)!)}
                                  className="shrink-0 rounded-lg bg-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-blue/90 transition-colors"
                                >
                                  {stage.status === 0 ? 'بدء المرحلة' : 'إكمال المرحلة'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-sm text-gray-400">لا توجد مراحل علاج محددة</div>
                  )}
                </div>
              )}
            </div>

            {/* Visits Timeline */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 p-4">
                <button
                  onClick={() => setExpandedVisits(!expandedVisits)}
                  className="flex items-center gap-2"
                >
                  <h3 className="text-lg font-bold text-navy">سجل الزيارات ({selectedCase.visits?.length || 0})</h3>
                  <svg className={`h-5 w-5 text-gray-400 transition-transform ${expandedVisits ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowVisitModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  إضافة زيارة
                </button>
              </div>
              {expandedVisits && (
                <div className="px-4 pb-4">
                  {selectedCase.visits && selectedCase.visits.length > 0 ? (
                    <div className="space-y-0 pt-3">
                      {selectedCase.visits
                        .sort((a, b) => b.visitNumber - a.visitNumber)
                        .map((visit) => (
                          <VisitTimelineItem key={visit.id} visit={visit} />
                        ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-sm text-gray-400">لا توجد زيارات مسجلة</div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Add Visit Modal */}
        {showVisitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowVisitModal(false)}>
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-navy">إضافة زيارة تقويم</h2>
                <button onClick={() => setShowVisitModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع الزيارة</label>
                    <select
                      value={visitForm.visitType}
                      onChange={(e) => setVisitForm({ ...visitForm, visitType: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                    >
                      <option value="">-- اختر --</option>
                      <option value="متابعة">متابعة</option>
                      <option value="تعديل سلك">تعديل سلك</option>
                      <option value="تركيب جهاز">تركيب جهاز</option>
                      <option value="إزالة جهاز">إزالة جهاز</option>
                      <option value="تركيب مثبت">تركيب مثبت</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">المرحلة الحالية</label>
                    <input
                      type="text"
                      value={visitForm.currentStage}
                      onChange={(e) => setVisitForm({ ...visitForm, currentStage: e.target.value })}
                      placeholder="مثال: المحاذاة"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">سلك علوي</label>
                    <input
                      type="text"
                      value={visitForm.wireUpper}
                      onChange={(e) => setVisitForm({ ...visitForm, wireUpper: e.target.value })}
                      placeholder="مثال: NiTi 0.016"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">سلك سفلي</label>
                    <input
                      type="text"
                      value={visitForm.wireLower}
                      onChange={(e) => setVisitForm({ ...visitForm, wireLower: e.target.value })}
                      placeholder="مثال: SS 0.019x0.025"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع المطاط</label>
                    <input
                      type="text"
                      value={visitForm.elasticsType}
                      onChange={(e) => setVisitForm({ ...visitForm, elasticsType: e.target.value })}
                      placeholder="مثال: مطاط بيني"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب</label>
                    <select
                      value={visitForm.doctorId}
                      onChange={(e) => setVisitForm({ ...visitForm, doctorId: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                    >
                      <option value="">-- بدون طبيب --</option>
                      {doctors.filter(d => d.isActive).map(d => (
                        <option key={d.id} value={d.id}>د. {d.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات سريرية</label>
                  <textarea
                    value={visitForm.clinicalNotes}
                    onChange={(e) => setVisitForm({ ...visitForm, clinicalNotes: e.target.value })}
                    rows={2}
                    placeholder="الملاحظات السريرية..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تعليمات المريض</label>
                  <textarea
                    value={visitForm.patientInstructions}
                    onChange={(e) => setVisitForm({ ...visitForm, patientInstructions: e.target.value })}
                    rows={2}
                    placeholder="تعليمات وإرشادات..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">موعد الزيارة القادمة</label>
                  <input
                    type="date"
                    value={visitForm.nextAppointmentDate}
                    onChange={(e) => setVisitForm({ ...visitForm, nextAppointmentDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleAddVisit}
                    disabled={saving}
                    className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                  >
                    {saving ? 'جاري الحفظ...' : 'إضافة الزيارة'}
                  </button>
                  <button
                    onClick={() => setShowVisitModal(false)}
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

  // List view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">تقويم الأسنان</h1>
          <p className="text-sm text-gray-500">إدارة حالات التقويم ومتابعة العلاج</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          حالة تقويم جديدة
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {statusTabs.map(tab => (
          <button
            key={String(tab.key)}
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" />
        </div>
      ) : cases.length > 0 ? (
        <div className="space-y-3">
          {cases.map(orthoCase => (
            <div
              key={orthoCase.id}
              onClick={() => fetchCaseDetail(orthoCase.id)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy/10 text-sm font-bold text-navy">
                    {orthoCase.caseNumber?.slice(-3) || '#'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-navy">{orthoCase.patientName}</h3>
                      <span className="text-xs text-gray-400">({orthoCase.caseNumber})</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      {orthoCase.doctorName && <span>د. {orthoCase.doctorName}</span>}
                      {orthoCase.applianceType && (
                        <span className="inline-flex items-center rounded-full bg-navy/5 px-2 py-0.5 text-xs">{orthoCase.applianceType}</span>
                      )}
                      {orthoCase.totalFee != null && <span>{orthoCase.totalFee} ر.س</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Progress bar mini */}
                  <div className="w-24">
                    <div className="h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-orange transition-all"
                        style={{ width: `${Math.min(orthoCase.stagePercentage, 100)}%` }}
                      />
                    </div>
                    <div className="mt-0.5 text-[10px] text-gray-400 text-center">{orthoCase.stagePercentage}%</div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${OrthoCaseStatusColors[orthoCase.status] || 'bg-gray-100 text-gray-700'}`}>
                    {OrthoCaseStatusLabels[orthoCase.status] || orthoCase.statusDisplay}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalCount > 20 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                السابق
              </button>
              <span className="text-sm text-gray-500">
                صفحة {page} من {Math.ceil(totalCount / 20)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(totalCount / 20)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                التالي
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">لا توجد حالات تقويم</p>
        </div>
      )}

      {/* Create Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">حالة تقويم جديدة</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {/* Patient selector with search */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">المريض <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="ابحث بالاسم أو الرقم..."
                  className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
                <select
                  value={createForm.patientId}
                  onChange={(e) => setCreateForm({ ...createForm, patientId: e.target.value })}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب</label>
                  <select
                    value={createForm.doctorId}
                    onChange={(e) => setCreateForm({ ...createForm, doctorId: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  >
                    <option value="">-- بدون طبيب --</option>
                    {doctors.filter(d => d.isActive).map(d => (
                      <option key={d.id} value={d.id}>د. {d.fullName} - {d.specialty}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع الجهاز</label>
                  <select
                    value={createForm.applianceType}
                    onChange={(e) => setCreateForm({ ...createForm, applianceType: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  >
                    <option value="">-- اختر --</option>
                    {applianceTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ البدء</label>
                  <input
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">المدة (أشهر)</label>
                  <input
                    type="number"
                    value={createForm.expectedDurationMonths}
                    onChange={(e) => setCreateForm({ ...createForm, expectedDurationMonths: e.target.value })}
                    placeholder="مثال: 18"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الرسوم</label>
                  <input
                    type="number"
                    value={createForm.totalFee}
                    onChange={(e) => setCreateForm({ ...createForm, totalFee: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  rows={2}
                  placeholder="ملاحظات إضافية..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreateCase}
                  disabled={saving || !createForm.patientId}
                  className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : 'إنشاء الحالة'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
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

function VisitTimelineItem({ visit }: { visit: OrthoVisitDto }) {
  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">
          {visit.visitNumber}
        </div>
        <div className="w-px flex-1 bg-gray-200" />
      </div>
      {/* Content */}
      <div className="flex-1 pb-2">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-navy">
              زيارة {visit.visitNumber}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(visit.visitDate).toLocaleDateString('ar-SA')}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {visit.visitType && (
              <span className="inline-flex items-center rounded-full bg-navy/10 px-2 py-0.5 text-[11px] font-medium text-navy">
                {visit.visitType}
              </span>
            )}
            {visit.currentStage && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                {visit.currentStage}
              </span>
            )}
          </div>
          {(visit.wireUpper || visit.wireLower) && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
              {visit.wireUpper && <span>سلك علوي: {visit.wireUpper}</span>}
              {visit.wireLower && <span>سلك سفلي: {visit.wireLower}</span>}
            </div>
          )}
          {visit.elasticsType && (
            <div className="mt-1 text-xs text-gray-600">مطاط: {visit.elasticsType}</div>
          )}
          {visit.clinicalNotes && (
            <p className="mt-2 text-xs text-gray-500 border-t border-gray-100 pt-2">{visit.clinicalNotes}</p>
          )}
          {visit.patientInstructions && (
            <p className="mt-1 text-xs text-orange-700 bg-orange-50 rounded p-2">تعليمات: {visit.patientInstructions}</p>
          )}
          {visit.nextAppointmentDate && (
            <div className="mt-2 text-xs text-gray-500">
              الموعد القادم: {new Date(visit.nextAppointmentDate).toLocaleDateString('ar-SA')}
            </div>
          )}
          {visit.doctorName && (
            <div className="mt-1 text-xs text-gray-400">الطبيب: د. {visit.doctorName}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrthodonticsPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <OrthodonticsContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
