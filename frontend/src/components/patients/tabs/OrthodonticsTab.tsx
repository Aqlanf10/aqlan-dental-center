'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { OrthoCaseDto, CreateOrthoCaseRequest, AddOrthoVisitRequest, DoctorDto } from '../../../types/api';
import { OrthoCaseStatusLabels, OrthoCaseStatusColors } from '../../../types/api';
import { Plus, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';

interface OrthodonticsTabProps {
  patientId: string;
}

const formatCurrency = (amount: number) =>
  `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
const formatDate = (date: string | null) => date ? new Date(date).toLocaleDateString('ar-SA') : '—';

export default function OrthodonticsTab({ patientId }: OrthodonticsTabProps) {
  const [cases, setCases] = useState<OrthoCaseDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddCase, setShowAddCase] = useState(false);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [showAddVisit, setShowAddVisit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [caseForm, setCaseForm] = useState({ doctorId: '', applianceType: '', startDate: '', expectedDurationMonths: '', totalFee: '', notes: '' });
  const [visitForm, setVisitForm] = useState({ visitType: '', clinicalNotes: '', patientInstructions: '', nextAppointmentDate: '', doctorId: '' });

  useEffect(() => { fetchCases(); }, [patientId]);
  useEffect(() => {
    api.get<DoctorDto[]>('/doctors').then(res => setDoctors((res.data ?? []).filter(d => d.isActive))).catch(() => {});
  }, []);

  const fetchCases = async () => {
    try {
      setIsLoading(true); setError(null);
      const res = await api.get<OrthoCaseDto[]>(`/ortho?patientId=${patientId}`);
      const items = Array.isArray(res.data) ? res.data : [];
      setCases(items);
    } catch { setError('حدث خطأ أثناء تحميل حالات التقويم'); }
    finally { setIsLoading(false); }
  };

  const handleAddCase = async () => {
    setSaving(true); setFormError(null);
    try {
      const req: CreateOrthoCaseRequest = {
        patientId, doctorId: caseForm.doctorId || null,
        applianceType: caseForm.applianceType || null, startDate: caseForm.startDate || null,
        expectedDurationMonths: caseForm.expectedDurationMonths ? Number(caseForm.expectedDurationMonths) : null,
        totalFee: caseForm.totalFee ? Number(caseForm.totalFee) : null, notes: caseForm.notes || null,
      };
      await api.post('/ortho', req);
      setShowAddCase(false);
      setCaseForm({ doctorId: '', applianceType: '', startDate: '', expectedDurationMonths: '', totalFee: '', notes: '' });
      fetchCases();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'خطأ في الحفظ'); }
    finally { setSaving(false); }
  };

  const handleAddVisit = async (caseId: string) => {
    setSaving(true); setFormError(null);
    try {
      const req: AddOrthoVisitRequest = {
        visitType: visitForm.visitType || null, clinicalNotes: visitForm.clinicalNotes || null,
        patientInstructions: visitForm.patientInstructions || null,
        nextAppointmentDate: visitForm.nextAppointmentDate || null,
        doctorId: visitForm.doctorId || null,
      };
      await api.post(`/ortho/${caseId}/visits`, req);
      setShowAddVisit(null);
      setVisitForm({ visitType: '', clinicalNotes: '', patientInstructions: '', nextAppointmentDate: '', doctorId: '' });
      fetchCases();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'خطأ في الحفظ'); }
    finally { setSaving(false); }
  };

  const handleUpdateCaseStatus = async (caseId: string, status: number) => {
    try { await api.patch(`/ortho/${caseId}/status`, { status }); fetchCases(); } catch { /* silent */ }
  };

  if (isLoading) return <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" /></div>;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1a3a5c]">حالات التقويم</h3>
        <button onClick={() => setShowAddCase(true)} className="inline-flex items-center gap-1 rounded-lg bg-[#f5922e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e07d1a] font-[Tajawal]">
          <Plus className="w-3.5 h-3.5" /> إضافة حالة
        </button>
      </div>

      {cases.length === 0 && !showAddCase && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <p className="mt-4 text-lg font-bold text-gray-400">لا توجد حالات تقويم مسجلة</p>
        </div>
      )}

      {cases.map(c => {
        const statusLabel = OrthoCaseStatusLabels[c.status] || c.statusDisplay;
        const statusColor = OrthoCaseStatusColors[c.status] || 'bg-gray-100 text-gray-700';
        const isExpanded = expandedCase === c.id;
        return (
          <div key={c.id} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 cursor-pointer" onClick={() => setExpandedCase(isExpanded ? null : c.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[#1a3a5c]">حالة #{c.caseNumber}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColor}`}>{statusLabel}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    {c.applianceType && <span>نوع الجهاز: <span className="font-medium text-[#1a3a5c]">{c.applianceType}</span></span>}
                    {c.currentStage && <span>المرحلة: <span className="font-medium text-[#1a3a5c]">{c.currentStage}</span></span>}
                    {c.doctorName && <span>الطبيب: <span className="font-medium text-[#1a3a5c]">{c.doctorName}</span></span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-left">
                    {c.totalFee != null && <p className="text-sm font-bold text-[#f5922e]">{formatCurrency(c.totalFee)}</p>}
                    {c.startDate && <p className="text-xs text-gray-400">{formatDate(c.startDate)}</p>}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>
            </div>
            {isExpanded && (
              <div className="border-t border-gray-100 p-4 space-y-3">
                {/* Status Actions */}
                {c.status === 0 && <button onClick={() => handleUpdateCaseStatus(c.id, 2)} className="text-xs text-green-600 hover:underline font-[Tajawal]">إكمال الحالة</button>}
                {c.status === 0 && <button onClick={() => handleUpdateCaseStatus(c.id, 2)} className="text-xs text-red-500 hover:underline font-[Tajawal] mr-3">إلغاء</button>}
                {/* Add Visit */}
                <button onClick={() => setShowAddVisit(c.id)} className="inline-flex items-center gap-1 text-xs text-[#3d7ab5] hover:underline font-[Tajawal]">
                  <Plus className="w-3 h-3" /> إضافة زيارة
                </button>
                {/* Visits list */}
                {c.visits && c.visits.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500">الزيارات ({c.visits.length})</p>
                    {c.visits.map(v => (
                      <div key={v.id} className="rounded border border-gray-100 p-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium text-[#1a3a5c]">زيارة #{v.visitNumber}</span>
                          <span className="text-xs text-gray-400">{formatDate(v.visitDate)}</span>
                        </div>
                        {v.clinicalNotes && <p className="text-xs text-gray-500 mt-1">{v.clinicalNotes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add Case Modal */}
      {showAddCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddCase(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">إضافة حالة تقويم</h2>
              <button onClick={() => setShowAddCase(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {formError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب</label>
                <select value={caseForm.doctorId} onChange={e => setCaseForm({...caseForm, doctorId: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]">
                  <option value="">-- اختر --</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>د. {d.fullName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع الجهاز</label>
                  <input type="text" value={caseForm.applianceType} onChange={e => setCaseForm({...caseForm, applianceType: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">المدة المتوقعة (أشهر)</label>
                  <input type="number" value={caseForm.expectedDurationMonths} onChange={e => setCaseForm({...caseForm, expectedDurationMonths: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ البدء</label>
                  <input type="date" value={caseForm.startDate} onChange={e => setCaseForm({...caseForm, startDate: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الرسوم الإجمالية</label>
                  <input type="number" value={caseForm.totalFee} onChange={e => setCaseForm({...caseForm, totalFee: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleAddCase} disabled={saving} className="flex-1 rounded-lg bg-[#3d7ab5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3d7ab5]/90 disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'جاري الحفظ...' : 'إضافة'}
                </button>
                <button onClick={() => setShowAddCase(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-[Tajawal]">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Visit Modal */}
      {showAddVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddVisit(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">إضافة زيارة تقويم</h2>
              <button onClick={() => setShowAddVisit(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع الزيارة</label>
                <input type="text" value={visitForm.visitType} onChange={e => setVisitForm({...visitForm, visitType: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات سريرية</label>
                <textarea value={visitForm.clinicalNotes} onChange={e => setVisitForm({...visitForm, clinicalNotes: e.target.value})} rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">تعليمات المريض</label>
                <textarea value={visitForm.patientInstructions} onChange={e => setVisitForm({...visitForm, patientInstructions: e.target.value})} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => showAddVisit && handleAddVisit(showAddVisit)} disabled={saving} className="flex-1 rounded-lg bg-[#3d7ab5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3d7ab5]/90 disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'جاري الحفظ...' : 'إضافة الزيارة'}
                </button>
                <button onClick={() => setShowAddVisit(null)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-[Tajawal]">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
