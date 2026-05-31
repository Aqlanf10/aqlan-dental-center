'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/home/Navbar';
import Footer from '../../components/home/Footer';
import LoginModal from '../../components/auth/LoginModal';
import { AuthProvider } from '../../components/auth/AuthContext';
import { api } from '../../lib/api';
import type { DoctorDto, PagedResult, CreatePublicBookingRequest } from '../../types/api';
import { ServiceTypesList } from '../../types/api';

function BookingPage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);

  const [form, setForm] = useState<CreatePublicBookingRequest>({
    patientName: '',
    phoneNumber: '',
    serviceType: '',
    preferredDoctorId: null,
    preferredDate: null,
    preferredTime: null,
    notes: null,
  });

  useEffect(() => {
    async function fetchDoctors() {
      try {
        const result = await api.get<PagedResult<DoctorDto>>('/doctors?pageSize=100');
        setDoctors(result.data.items.filter((d) => d.isActive));
      } catch {
        // Silently fail - doctor list is optional
      }
    }
    fetchDoctors();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value || null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await api.post('/public/booking-requests', form);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setError(null);
    setForm({
      patientName: '',
      phoneNumber: '',
      serviceType: '',
      preferredDoctorId: null,
      preferredDate: null,
      preferredTime: null,
      notes: null,
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar onLoginClick={() => setLoginOpen(true)} />

      <main className="flex-1 bg-gray-50 py-10">
        <div className="mx-auto max-w-2xl px-4">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-navy sm:text-3xl">حجز موعد</h1>
            <p className="mt-2 text-sm text-gray-500">
              أرسل طلب الحجز وسيقوم فريقنا بالتواصل معك لتأكيد الموعد
            </p>
          </div>

          {submitted ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-md">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-bold text-navy">تم إرسال طلب الحجز بنجاح</h2>
              <p className="mt-2 text-gray-500">
                سيتواصل معكم فريق المركز لتأكيد الموعد.
              </p>
              <button
                onClick={handleReset}
                className="mt-6 rounded-lg bg-orange px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange/90"
              >
                حجز موعد آخر
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 shadow-md sm:p-8">
              {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label htmlFor="patientName" className="mb-1.5 block text-sm font-medium text-navy">
                    الاسم <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="patientName"
                    name="patientName"
                    type="text"
                    required
                    value={form.patientName}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                    placeholder="أدخل اسمك الكامل"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phoneNumber" className="mb-1.5 block text-sm font-medium text-navy">
                    رقم الهاتف <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    required
                    value={form.phoneNumber}
                    onChange={handleChange}
                    dir="ltr"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-left transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                    placeholder="05XXXXXXXX"
                  />
                </div>

                {/* Service Type */}
                <div>
                  <label htmlFor="serviceType" className="mb-1.5 block text-sm font-medium text-navy">
                    نوع الخدمة <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="serviceType"
                    name="serviceType"
                    required
                    value={form.serviceType}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                  >
                    <option value="">اختر نوع الخدمة</option>
                    {ServiceTypesList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preferred Doctor */}
                <div>
                  <label htmlFor="preferredDoctorId" className="mb-1.5 block text-sm font-medium text-navy">
                    الطبيب المفضل
                  </label>
                  <select
                    id="preferredDoctorId"
                    name="preferredDoctorId"
                    value={form.preferredDoctorId || ''}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                  >
                    <option value="">اختر الطبيب</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} - {d.specialty}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & Time */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="preferredDate" className="mb-1.5 block text-sm font-medium text-navy">
                      التاريخ المفضل
                    </label>
                    <input
                      id="preferredDate"
                      name="preferredDate"
                      type="date"
                      value={form.preferredDate || ''}
                      onChange={handleChange}
                      dir="ltr"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="preferredTime" className="mb-1.5 block text-sm font-medium text-navy">
                      الوقت المفضل
                    </label>
                    <input
                      id="preferredTime"
                      name="preferredTime"
                      type="time"
                      value={form.preferredTime || ''}
                      onChange={handleChange}
                      dir="ltr"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-navy">
                    ملاحظات
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={form.notes || ''}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                    placeholder="أدخل أي ملاحظات إضافية"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 w-full rounded-lg bg-orange py-3 text-sm font-bold text-white transition-colors hover:bg-orange/90 disabled:opacity-60"
              >
                {isLoading ? 'جارٍ الإرسال...' : 'إرسال طلب الحجز'}
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <BookingPage />
    </AuthProvider>
  );
}
