'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import type { DoctorDto, PatientDto, PagedResult, CreateAppointmentRequest, AppointmentDto } from '../../types/api';
import { ServiceTypesList } from '../../types/api';

interface AppointmentFormProps {
  appointment?: AppointmentDto;
  doctors: DoctorDto[];
  onSubmit: (data: CreateAppointmentRequest) => void;
  isLoading: boolean;
  error?: string | null;
}

interface FormErrors {
  patientId?: string;
  doctorId?: string;
  appointmentDate?: string;
  startTime?: string;
  serviceType?: string;
}

export default function AppointmentForm({
  appointment,
  doctors,
  onSubmit,
  isLoading,
  error,
}: AppointmentFormProps) {
  const router = useRouter();
  const isEdit = !!appointment;

  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [formData, setFormData] = useState<CreateAppointmentRequest>({
    patientId: appointment?.patientId || '',
    doctorId: appointment?.doctorId || '',
    appointmentDate: appointment?.appointmentDate ? appointment.appointmentDate.split('T')[0] : '',
    startTime: appointment?.startTime || '',
    endTime: appointment?.endTime || null,
    serviceType: appointment?.serviceType || '',
    notes: appointment?.notes || null,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    async function fetchPatients() {
      try {
        const result = await api.get<PagedResult<PatientDto>>('/patients?pageSize=100');
        setPatients(result.data.items);
      } catch {
        // Silent fail
      }
    }
    fetchPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 20);
    const term = patientSearch.toLowerCase();
    return patients.filter(
      (p) => p.fullName.toLowerCase().includes(term) || p.patientNumber.toLowerCase().includes(term)
    ).slice(0, 20);
  }, [patients, patientSearch]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.patientId) newErrors.patientId = 'المريض مطلوب';
    if (!formData.doctorId) newErrors.doctorId = 'الطبيب مطلوب';
    if (!formData.appointmentDate) newErrors.appointmentDate = 'التاريخ مطلوب';
    if (!formData.startTime) newErrors.startTime = 'وقت البداية مطلوب';
    if (!formData.serviceType) newErrors.serviceType = 'نوع الخدمة مطلوب';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  const handleChange = (field: keyof CreateAppointmentRequest, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const selectedPatient = patients.find((p) => p.id === formData.patientId);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-navy">
        {isEdit ? 'تعديل الموعد' : 'إضافة موعد جديد'}
      </h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Patient Searchable Select */}
        <div className="relative">
          <label className="mb-1.5 block text-sm font-medium text-navy">
            المريض <span className="text-red-500">*</span>
          </label>
          <div
            className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-blue/20 ${
              errors.patientId ? 'border-red-400' : 'border-gray-300 focus-within:border-blue'
            }`}
          >
            {selectedPatient ? (
              <div className="flex items-center justify-between">
                <span className="text-navy">{selectedPatient.fullName} ({selectedPatient.patientNumber})</span>
                <button
                  type="button"
                  onClick={() => { handleChange('patientId', ''); setPatientSearch(''); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => { setPatientSearch(e.target.value); setShowPatientDropdown(true); }}
                onFocus={() => setShowPatientDropdown(true)}
                placeholder="ابحث عن مريض بالاسم أو الرقم..."
                className="w-full outline-none placeholder-gray-400"
              />
            )}
          </div>
          {showPatientDropdown && !selectedPatient && (
            <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {filteredPatients.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">لم يتم العثور على مرضى</div>
              ) : (
                filteredPatients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      handleChange('patientId', p.id);
                      setShowPatientDropdown(false);
                      setPatientSearch('');
                    }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-navy/5"
                  >
                    <span className="font-medium text-navy">{p.fullName}</span>
                    <span className="text-xs text-gray-400">{p.patientNumber}</span>
                  </button>
                ))
              )}
            </div>
          )}
          {errors.patientId && <p className="mt-1 text-xs text-red-500">{errors.patientId}</p>}
        </div>

        {/* Doctor */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">
            الطبيب <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.doctorId}
            onChange={(e) => handleChange('doctorId', e.target.value)}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue/20 ${
              errors.doctorId ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-blue'
            }`}
          >
            <option value="">اختر الطبيب</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.fullName} - {d.specialty}</option>
            ))}
          </select>
          {errors.doctorId && <p className="mt-1 text-xs text-red-500">{errors.doctorId}</p>}
        </div>

        {/* Date */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">
            التاريخ <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.appointmentDate}
            onChange={(e) => handleChange('appointmentDate', e.target.value)}
            dir="ltr"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue/20 ${
              errors.appointmentDate ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-blue'
            }`}
          />
          {errors.appointmentDate && <p className="mt-1 text-xs text-red-500">{errors.appointmentDate}</p>}
        </div>

        {/* Time range */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              وقت البداية <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              dir="ltr"
              className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue/20 ${
                errors.startTime ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-blue'
              }`}
            />
            {errors.startTime && <p className="mt-1 text-xs text-red-500">{errors.startTime}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">وقت النهاية</label>
            <input
              type="time"
              value={formData.endTime || ''}
              onChange={(e) => handleChange('endTime', e.target.value || null)}
              dir="ltr"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
            />
          </div>
        </div>

        {/* Service Type */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">
            نوع الخدمة <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.serviceType}
            onChange={(e) => handleChange('serviceType', e.target.value)}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue/20 ${
              errors.serviceType ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-blue'
            }`}
          >
            <option value="">اختر نوع الخدمة</option>
            {ServiceTypesList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.serviceType && <p className="mt-1 text-xs text-red-500">{errors.serviceType}</p>}
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">ملاحظات</label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value || null)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
            placeholder="أدخل ملاحظات إضافية"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className={`rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              isEdit ? 'bg-blue hover:bg-blue/90' : 'bg-orange hover:bg-orange/90'
            }`}
          >
            {isLoading ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة الموعد'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
