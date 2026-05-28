'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PatientDto, CreatePatientRequest } from '../../types/api';

interface PatientFormProps {
  patient?: PatientDto;
  onSubmit: (data: CreatePatientRequest) => void;
  isLoading: boolean;
  error?: string | null;
}

interface FormErrors {
  fullName?: string;
  gender?: string;
  phoneNumber?: string;
}

export default function PatientForm({ patient, onSubmit, isLoading, error }: PatientFormProps) {
  const router = useRouter();
  const isEdit = !!patient;

  const [formData, setFormData] = useState<CreatePatientRequest>({
    fullName: patient?.fullName || '',
    gender: patient?.gender ?? 0,
    dateOfBirth: patient?.dateOfBirth ? patient.dateOfBirth.split('T')[0] : null,
    phoneNumber: patient?.phoneNumber || '',
    whatsAppNumber: patient?.whatsAppNumber || null,
    address: patient?.address || null,
    notes: patient?.notes || null,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'الاسم الكامل مطلوب';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'رقم الهاتف مطلوب';
    if (formData.gender === undefined || formData.gender === null) newErrors.gender = 'الجنس مطلوب';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  const handleChange = (
    field: keyof CreatePatientRequest,
    value: string | number | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-navy">
        {isEdit ? 'تعديل بيانات المريض' : 'إضافة مريض جديد'}
      </h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">
            الاسم الكامل <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue/20 ${
              errors.fullName ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-blue'
            }`}
            placeholder="أدخل الاسم الكامل"
          />
          {errors.fullName && (
            <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">
            الجنس <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.gender}
            onChange={(e) => handleChange('gender', Number(e.target.value))}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue/20 ${
              errors.gender ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-blue'
            }`}
          >
            <option value={1}>ذكر</option>
            <option value={2}>أنثى</option>
          </select>
          {errors.gender && (
            <p className="mt-1 text-xs text-red-500">{errors.gender}</p>
          )}
        </div>

        {/* Date of Birth */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">تاريخ الميلاد</label>
          <input
            type="date"
            value={formData.dateOfBirth || ''}
            onChange={(e) => handleChange('dateOfBirth', e.target.value || null)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">
            رقم الهاتف <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => handleChange('phoneNumber', e.target.value)}
            dir="ltr"
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue/20 ${
              errors.phoneNumber ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-blue'
            }`}
            placeholder="05XXXXXXXX"
          />
          {errors.phoneNumber && (
            <p className="mt-1 text-xs text-red-500">{errors.phoneNumber}</p>
          )}
        </div>

        {/* WhatsApp Number */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">رقم واتساب</label>
          <input
            type="tel"
            value={formData.whatsAppNumber || ''}
            onChange={(e) => handleChange('whatsAppNumber', e.target.value || null)}
            dir="ltr"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-left transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
            placeholder="05XXXXXXXX"
          />
        </div>

        {/* Address */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">العنوان</label>
          <textarea
            value={formData.address || ''}
            onChange={(e) => handleChange('address', e.target.value || null)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
            placeholder="أدخل العنوان"
          />
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
              isEdit
                ? 'bg-blue hover:bg-blue/90'
                : 'bg-orange hover:bg-orange/90'
            }`}
          >
            {isLoading
              ? 'جارٍ الحفظ...'
              : isEdit
              ? 'حفظ التعديلات'
              : 'إضافة المريض'}
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
