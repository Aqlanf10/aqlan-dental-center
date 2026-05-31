'use client';

import { useState, useEffect } from 'react';
import { PatientDto, DoctorDto } from '@/types/api';
import { api } from '@/lib/api';

interface Props {
  onSubmit: (data: { patientId: string; doctorId?: string; chiefComplaint?: string; notes?: string }) => void;
  onClose: () => void;
}

export default function WalkInVisitModal({ onSubmit, onClose }: Props) {
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [notes, setNotes] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        api.get<PatientDto[]>('/patients?page=1&pageSize=1000'),
        api.get<{ items: DoctorDto[] }>('/doctors?page=1&pageSize=100'),
      ]);
      // patients endpoint returns PagedResult
      const pRes = patientsRes.data as unknown as { items: PatientDto[] };
      setPatients(pRes.items || []);
      setDoctors(doctorsRes.data.items || []);
    } catch {
      // silent
    }
    setLoading(false);
  };

  const filteredPatients = patientSearch
    ? patients.filter(p =>
        p.fullName.includes(patientSearch) ||
        p.patientNumber.includes(patientSearch) ||
        p.phoneNumber.includes(patientSearch))
    : patients;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    onSubmit({
      patientId,
      doctorId: doctorId || undefined,
      chiefComplaint: chiefComplaint || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">زيارة بدون موعد</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient selection */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              المريض <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الرقم..."
              className="mb-2 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
            />
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
              size={5}
            >
              <option value="">-- اختر المريض --</option>
              {filteredPatients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.patientNumber} - {p.fullName} ({p.phoneNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Doctor selection */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">الطبيب (اختياري)</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
            >
              <option value="">-- بدون طبيب --</option>
              {doctors.filter(d => d.isActive).map(d => (
                <option key={d.id} value={d.id}>
                  د. {d.fullName} - {d.specialty}
                </option>
              ))}
            </select>
          </div>

          {/* Chief complaint */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">الشكوى الرئيسية</label>
            <textarea
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="اختياري..."
              rows={2}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اختياري..."
              rows={2}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!patientId}
              className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              إنشاء الزيارة
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
