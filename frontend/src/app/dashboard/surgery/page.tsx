'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import {
  SurgeryCaseDto,
  PatientDto,
  DoctorDto,
  SurgeryCaseStatusLabels,
  SurgeryCaseStatusColors,
  SurgeryCaseStatusEnum,
  CreateSurgeryCaseRequest,
  UpdateSurgeryCaseRequest,
  UpdateSurgeryStatusRequest,
} from '@/types/api';

type StatusFilter = 'all' | number;

const statusTabs: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: SurgeryCaseStatusEnum.Scheduled, label: 'مجدول' },
  { key: SurgeryCaseStatusEnum.InProgress, label: 'جارٍ' },
  { key: SurgeryCaseStatusEnum.Completed, label: 'مكتمل' },
  { key: SurgeryCaseStatusEnum.Cancelled, label: 'ملغي' },
];

const surgeryTypes = [
  'خلع سن',
  'خلع ضرس العقل',
  'خلع جراحي',
  'زراعة سن',
  'جراحة اللثة',
  'جراحة الفك',
  'تقييم وحجم العظم',
  'رفع الجيب الفكي',
  'استئصال ورم',
  'إزالة كيس',
  'جراحة ذروية',
  'أخرى',
];

const anesthesiaTypes = [
  'تخدير موضعي',
  'تخدير موضعي مع سيديشن',
  'تخدير عام',
];

const surgeryLocations = [
  'عيادة 1',
  'عيادة 2',
  'غرفة العمليات',
  'مستشفى خارجي',
];

function SurgeryContent() {
  // List state
  const [cases, setCases] = useState<SurgeryCaseDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  // Detail state
  const [selectedCase, setSelectedCase] = useState<SurgeryCaseDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Dropdown data
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    patientId: '',
    doctorId: '',
    surgeryType: '',
    teethInvolved: '',
    surgeryDate: '',
    surgeryLocation: '',
    anesthesiaType: '',
    preopNotes: '',
    notes: '',
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    surgeryType: '',
    teethInvolved: '',
    surgeryDate: '',
    surgeryLocation: '',
    anesthesiaType: '',
    preopNotes: '',
    operativeNotes: '',
    postopInstructions: '',
    complications: '',
    followupDate: '',
    notes: '',
  });

  // Collapsible sections
  const [expandedPreop, setExpandedPreop] = useState(true);
  const [expandedOperative, setExpandedOperative] = useState(true);
  const [expandedPostop, setExpandedPostop] = useState(true);

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
      const res = await api.get<{ items: SurgeryCaseDto[]; totalCount: number }>(
        `/surgery-cases?page=${page}&pageSize=20${statusParam}`
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
      const res = await api.get<SurgeryCaseDto>(`/surgery-cases/${id}`);
      setSelectedCase(res.data);
    } catch {
      // error
    }
    setDetailLoading(false);
  };

  const handleCreateCase = async () => {
    if (!createForm.patientId || !createForm.surgeryType) return;
    setSaving(true);
    try {
      const request: CreateSurgeryCaseRequest = {
        patientId: createForm.patientId,
        doctorId: createForm.doctorId || null,
        surgeryType: createForm.surgeryType,
        teethInvolved: createForm.teethInvolved || null,
        surgeryDate: createForm.surgeryDate || null,
        surgeryLocation: createForm.surgeryLocation || null,
        anesthesiaType: createForm.anesthesiaType || null,
        preopNotes: createForm.preopNotes || null,
        notes: createForm.notes || null,
      };
      await api.post('/surgery-cases', request);
      setShowCreateModal(false);
      setCreateForm({ patientId: '', doctorId: '', surgeryType: '', teethInvolved: '', surgeryDate: '', surgeryLocation: '', anesthesiaType: '', preopNotes: '', notes: '' });
      fetchCases();
    } catch {
      // error
    }
    setSaving(false);
  };

  const handleUpdateCase = async () => {
    if (!selectedCase) return;
    setSaving(true);
    try {
      const request: UpdateSurgeryCaseRequest = {
        surgeryType: editForm.surgeryType || null,
        teethInvolved: editForm.teethInvolved || null,
        surgeryDate: editForm.surgeryDate || null,
        surgeryLocation: editForm.surgeryLocation || null,
        anesthesiaType: editForm.anesthesiaType || null,
        preopNotes: editForm.preopNotes || null,
        operativeNotes: editForm.operativeNotes || null,
        postopInstructions: editForm.postopInstructions || null,
        complications: editForm.complications || null,
        followupDate: editForm.followupDate || null,
        notes: editForm.notes || null,
      };
      await api.put(`/surgery-cases/${selectedCase.id}`, request);
      setShowEditModal(false);
      fetchCaseDetail(selectedCase.id);
      fetchCases();
    } catch {
      // error
    }
    setSaving(false);
  };

  const handleUpdateStatus = async (newStatus: number) => {
    if (!selectedCase) return;
    try {
      const request: UpdateSurgeryStatusRequest = { status: newStatus };
      await api.patch(`/surgery-cases/${selectedCase.id}/status`, request);
      fetchCaseDetail(selectedCase.id);
      fetchCases();
    } catch {
      // error
    }
  };

  const openEditModal = () => {
    if (!selectedCase) return;
    setEditForm({
      surgeryType: selectedCase.surgeryType || '',
      teethInvolved: selectedCase.teethInvolved || '',
      surgeryDate: selectedCase.surgeryDate ? selectedCase.surgeryDate.split('T')[0] : '',
      surgeryLocation: selectedCase.surgeryLocation || '',
      anesthesiaType: selectedCase.anesthesiaType || '',
      preopNotes: selectedCase.preopNotes || '',
      operativeNotes: selectedCase.operativeNotes || '',
      postopInstructions: selectedCase.postopInstructions || '',
      complications: selectedCase.complications || '',
      followupDate: selectedCase.followupDate ? selectedCase.followupDate.split('T')[0] : '',
      notes: selectedCase.notes || '',
    });
    setShowEditModal(true);
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
                <h2 className="text-xl font-bold text-navy">عملية جراحية {selectedCase.caseNumber}</h2>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SurgeryCaseStatusColors[selectedCase.status] || 'bg-gray-100 text-gray-700'}`}>
                  {SurgeryCaseStatusLabels[selectedCase.status] || selectedCase.statusDisplay}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                <span>المريض: <strong className="text-navy">{selectedCase.patientName}</strong></span>
                {selectedCase.doctorName && <span>الطبيب: <strong className="text-navy">د. {selectedCase.doctorName}</strong></span>}
                <span>نوع العملية: <strong className="text-navy">{selectedCase.surgeryType}</strong></span>
                {selectedCase.teethInvolved && <span>الأسنان: {selectedCase.teethInvolved}</span>}
                {selectedCase.surgeryDate && <span>التاريخ: {new Date(selectedCase.surgeryDate).toLocaleDateString('ar-SA')}</span>}
                {selectedCase.surgeryLocation && <span>المكان: {selectedCase.surgeryLocation}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={openEditModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-navy/90 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                تعديل
              </button>
              {/* Status progression */}
              {selectedCase.status === SurgeryCaseStatusEnum.Scheduled && (
                <button
                  onClick={() => handleUpdateStatus(SurgeryCaseStatusEnum.InProgress)}
                  className="rounded-lg bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-200 transition-colors"
                >
                  بدء العملية
                </button>
              )}
              {selectedCase.status === SurgeryCaseStatusEnum.InProgress && (
                <button
                  onClick={() => handleUpdateStatus(SurgeryCaseStatusEnum.Completed)}
                  className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 transition-colors"
                >
                  إكمال العملية
                </button>
              )}
              {(selectedCase.status === SurgeryCaseStatusEnum.Scheduled || selectedCase.status === SurgeryCaseStatusEnum.InProgress) && (
                <button
                  onClick={() => handleUpdateStatus(SurgeryCaseStatusEnum.Cancelled)}
                  className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
                >
                  إلغاء
                </button>
              )}
            </div>
          </div>

          {selectedCase.anesthesiaType && (
            <div className="mt-3 inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
              التخدير: {selectedCase.anesthesiaType}
            </div>
          )}

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
            {/* Pre-op Section */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <button
                onClick={() => setExpandedPreop(!expandedPreop)}
                className="flex w-full items-center justify-between p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-navy">قبل العملية</h3>
                </div>
                <svg className={`h-5 w-5 text-gray-400 transition-transform ${expandedPreop ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedPreop && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  <div className="space-y-3 pt-3">
                    <DetailRow label="ملاحظات قبل العملية" value={selectedCase.preopNotes} />
                    {selectedCase.surgeryDate && (
                      <DetailRow label="تاريخ العملية" value={new Date(selectedCase.surgeryDate).toLocaleDateString('ar-SA')} />
                    )}
                    {selectedCase.surgeryLocation && (
                      <DetailRow label="مكان العملية" value={selectedCase.surgeryLocation} />
                    )}
                    {selectedCase.anesthesiaType && (
                      <DetailRow label="نوع التخدير" value={selectedCase.anesthesiaType} />
                    )}
                    {selectedCase.teethInvolved && (
                      <DetailRow label="الأسنان المعنية" value={selectedCase.teethInvolved} />
                    )}
                    {!selectedCase.preopNotes && !selectedCase.surgeryDate && !selectedCase.surgeryLocation && !selectedCase.anesthesiaType && !selectedCase.teethInvolved && (
                      <div className="py-3 text-center text-sm text-gray-400">لا توجد بيانات قبل العملية</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Operative Section */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <button
                onClick={() => setExpandedOperative(!expandedOperative)}
                className="flex w-full items-center justify-between p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100">
                    <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-navy">أثناء العملية</h3>
                </div>
                <svg className={`h-5 w-5 text-gray-400 transition-transform ${expandedOperative ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedOperative && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  <div className="space-y-3 pt-3">
                    <DetailRow label="ملاحظات العملية" value={selectedCase.operativeNotes} />
                    <DetailRow label="المضاعفات" value={selectedCase.complications} />
                    {!selectedCase.operativeNotes && !selectedCase.complications && (
                      <div className="py-3 text-center text-sm text-gray-400">لا توجد بيانات أثناء العملية</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Post-op Section */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <button
                onClick={() => setExpandedPostop(!expandedPostop)}
                className="flex w-full items-center justify-between p-4"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-navy">بعد العملية</h3>
                </div>
                <svg className={`h-5 w-5 text-gray-400 transition-transform ${expandedPostop ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedPostop && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  <div className="space-y-3 pt-3">
                    <DetailRow label="تعليمات بعد العملية" value={selectedCase.postopInstructions} />
                    {selectedCase.followupDate && (
                      <DetailRow label="موعد المتابعة" value={new Date(selectedCase.followupDate).toLocaleDateString('ar-SA')} />
                    )}
                    {!selectedCase.postopInstructions && !selectedCase.followupDate && (
                      <div className="py-3 text-center text-sm text-gray-400">لا توجد بيانات بعد العملية</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowEditModal(false)}>
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-navy">تعديل العملية الجراحية</h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع العملية</label>
                    <select
                      value={editForm.surgeryType}
                      onChange={(e) => setEditForm({ ...editForm, surgeryType: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                    >
                      <option value="">-- اختر --</option>
                      {surgeryTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">الأسنان المعنية</label>
                    <input
                      type="text"
                      value={editForm.teethInvolved}
                      onChange={(e) => setEditForm({ ...editForm, teethInvolved: e.target.value })}
                      placeholder="مثال: 16, 17"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ العملية</label>
                    <input
                      type="date"
                      value={editForm.surgeryDate}
                      onChange={(e) => setEditForm({ ...editForm, surgeryDate: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">مكان العملية</label>
                    <select
                      value={editForm.surgeryLocation}
                      onChange={(e) => setEditForm({ ...editForm, surgeryLocation: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                    >
                      <option value="">-- اختر --</option>
                      {surgeryLocations.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع التخدير</label>
                    <select
                      value={editForm.anesthesiaType}
                      onChange={(e) => setEditForm({ ...editForm, anesthesiaType: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                    >
                      <option value="">-- اختر --</option>
                      {anesthesiaTypes.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">موعد المتابعة</label>
                    <input
                      type="date"
                      value={editForm.followupDate}
                      onChange={(e) => setEditForm({ ...editForm, followupDate: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات قبل العملية</label>
                  <textarea
                    value={editForm.preopNotes}
                    onChange={(e) => setEditForm({ ...editForm, preopNotes: e.target.value })}
                    rows={2}
                    placeholder="ملاحظات قبل العملية..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات العملية</label>
                  <textarea
                    value={editForm.operativeNotes}
                    onChange={(e) => setEditForm({ ...editForm, operativeNotes: e.target.value })}
                    rows={2}
                    placeholder="ملاحظات أثناء العملية..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تعليمات بعد العملية</label>
                  <textarea
                    value={editForm.postopInstructions}
                    onChange={(e) => setEditForm({ ...editForm, postopInstructions: e.target.value })}
                    rows={2}
                    placeholder="تعليمات وإرشادات بعد العملية..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">المضاعفات</label>
                  <textarea
                    value={editForm.complications}
                    onChange={(e) => setEditForm({ ...editForm, complications: e.target.value })}
                    rows={2}
                    placeholder="أي مضاعفات حدثت..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات عامة</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={2}
                    placeholder="ملاحظات إضافية..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleUpdateCase}
                    disabled={saving}
                    className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                  >
                    {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                  </button>
                  <button
                    onClick={() => setShowEditModal(false)}
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
          <h1 className="text-2xl font-bold text-navy">الجراحة</h1>
          <p className="text-sm text-gray-500">إدارة العمليات الجراحية والمتابعة</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          حالة جراحة جديدة
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
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-right font-medium text-gray-600">رقم الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المريض</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الطبيب</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">نوع العملية</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الأسنان</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cases.map(surgeryCase => (
                <tr
                  key={surgeryCase.id}
                  onClick={() => fetchCaseDetail(surgeryCase.id)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-navy">{surgeryCase.caseNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{surgeryCase.patientName}</td>
                  <td className="px-4 py-3 text-gray-700">{surgeryCase.doctorName ? `د. ${surgeryCase.doctorName}` : '-'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-navy/5 px-2.5 py-0.5 text-xs font-medium text-navy">
                      {surgeryCase.surgeryType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{surgeryCase.teethInvolved || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SurgeryCaseStatusColors[surgeryCase.status] || 'bg-gray-100 text-gray-700'}`}>
                      {SurgeryCaseStatusLabels[surgeryCase.status] || surgeryCase.statusDisplay}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {surgeryCase.surgeryDate ? new Date(surgeryCase.surgeryDate).toLocaleDateString('ar-SA') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalCount > 20 && (
            <div className="flex items-center justify-center gap-2 border-t border-gray-100 p-3">
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">لا توجد حالات جراحية</p>
        </div>
      )}

      {/* Create Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">حالة جراحة جديدة</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {/* Patient selector */}
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
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع العملية <span className="text-red-500">*</span></label>
                  <select
                    value={createForm.surgeryType}
                    onChange={(e) => setCreateForm({ ...createForm, surgeryType: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  >
                    <option value="">-- اختر --</option>
                    {surgeryTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الأسنان المعنية</label>
                  <input
                    type="text"
                    value={createForm.teethInvolved}
                    onChange={(e) => setCreateForm({ ...createForm, teethInvolved: e.target.value })}
                    placeholder="مثال: 16, 17, 18"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ العملية</label>
                  <input
                    type="date"
                    value={createForm.surgeryDate}
                    onChange={(e) => setCreateForm({ ...createForm, surgeryDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">مكان العملية</label>
                  <select
                    value={createForm.surgeryLocation}
                    onChange={(e) => setCreateForm({ ...createForm, surgeryLocation: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  >
                    <option value="">-- اختر --</option>
                    {surgeryLocations.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع التخدير</label>
                  <select
                    value={createForm.anesthesiaType}
                    onChange={(e) => setCreateForm({ ...createForm, anesthesiaType: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  >
                    <option value="">-- اختر --</option>
                    {anesthesiaTypes.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات قبل العملية</label>
                <textarea
                  value={createForm.preopNotes}
                  onChange={(e) => setCreateForm({ ...createForm, preopNotes: e.target.value })}
                  rows={2}
                  placeholder="ملاحظات قبل العملية..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات عامة</label>
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
                  disabled={saving || !createForm.patientId || !createForm.surgeryType}
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

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export default function SurgeryPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <SurgeryContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
