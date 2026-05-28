'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DoctorDto, CreateDoctorRequest } from '../../types/api';

interface DoctorFormProps {
  doctor?: DoctorDto;
  onSubmit: (data: CreateDoctorRequest) => void;
  isLoading: boolean;
  error?: string | null;
}

interface FormErrors {
  fullName?: string;
  specialty?: string;
}

export default function DoctorForm({ doctor, onSubmit, isLoading, error }: DoctorFormProps) {
  const router = useRouter();
  const isEdit = !!doctor;

  const [formData, setFormData] = useState<CreateDoctorRequest>({
    fullName: doctor?.fullName || '',
    specialty: doctor?.specialty || '',
    phoneNumber: doctor?.phoneNumber || null,
    email: doctor?.email || null,
    color: doctor?.color || null,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'الاسم الكامل مطلوب';
    if (!formData.specialty.trim()) newErrors.specialty = 'التخصص مطلوب';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  const handleChange = (
    field: keyof CreateDoctorRequest,
    value: string | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-navy">
        {isEdit ? 'تعديل بيانات الطبيب' : 'إضافة طبيب جديد'}
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

        {/* Specialty */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">
            التخصص <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.specialty}
            onChange={(e) => handleChange('specialty', e.target.value)}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue/20 ${
              errors.specialty ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-blue'
            }`}
            placeholder="أدخل التخصص"
          />
          {errors.specialty && (
            <p className="mt-1 text-xs text-red-500">{errors.specialty}</p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">رقم الهاتف</label>
          <input
            type="tel"
            value={formData.phoneNumber || ''}
            onChange={(e) => handleChange('phoneNumber', e.target.value || null)}
            dir="ltr"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-left transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
            placeholder="05XXXXXXXX"
          />
        </div>

        {/* Email */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">البريد الإلكتروني</label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value || null)}
            dir="ltr"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-left transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
            placeholder="doctor@example.com"
          />
        </div>

        {/* Color */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">اللون</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={formData.color || '#3d7ab5'}
              onChange={(e) => handleChange('color', e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-gray-300"
            />
            <input
              type="text"
              value={formData.color || ''}
              onChange={(e) => handleChange('color', e.target.value || null)}
              dir="ltr"
              className="w-32 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-left transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
              placeholder="#3d7ab5"
            />
          </div>
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
              : 'إضافة الطبيب'}
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
