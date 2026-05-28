'use client';

import { useState } from 'react';
import Navbar from '../../components/home/Navbar';
import Footer from '../../components/home/Footer';
import LoginModal from '../../components/auth/LoginModal';
import { AuthProvider } from '../../components/auth/AuthContext';

const serviceOptions = [
  { value: 'orthodontics', label: 'تقويم الأسنان' },
  { value: 'implants', label: 'زراعة الأسنان' },
  { value: 'cosmetic', label: 'تجميل الأسنان' },
  { value: 'general', label: 'علاج الأسنان العام' },
];

function BookingPage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    service: '',
    doctor: '',
    date: '',
    time: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar onLoginClick={() => setLoginOpen(true)} />

      <main className="flex-1 bg-gray-50 py-10">
        <div className="mx-auto max-w-2xl px-4">
          <h1 className="mb-8 text-center text-2xl font-bold text-navy sm:text-3xl">حجز موعد</h1>

          {submitted ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-4 text-xl font-bold text-navy">تم إرسال طلب الحجز بنجاح</h2>
              <p className="mt-2 text-gray-500">سيتم التواصل معك قريباً.</p>
              <button
                onClick={() => { setSubmitted(false); setForm({ name: '', phone: '', service: '', doctor: '', date: '', time: '', notes: '' }); }}
                className="mt-6 rounded-lg bg-navy px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-light"
              >
                حجز موعد آخر
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
              <div className="space-y-5">
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">الاسم</label>
                  <input
                    id="name" name="name" type="text" required value={form.name} onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue focus:ring-1 focus:ring-blue"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">رقم الهاتف</label>
                  <input
                    id="phone" name="phone" type="tel" required value={form.phone} onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue focus:ring-1 focus:ring-blue"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label htmlFor="service" className="mb-1 block text-sm font-medium text-gray-700">نوع الخدمة</label>
                  <select
                    id="service" name="service" required value={form.service} onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue focus:ring-1 focus:ring-blue"
                  >
                    <option value="">اختر نوع الخدمة</option>
                    {serviceOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="doctor" className="mb-1 block text-sm font-medium text-gray-700">الطبيب المفضل</label>
                  <select
                    id="doctor" name="doctor" value={form.doctor} onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue focus:ring-1 focus:ring-blue"
                  >
                    <option value="">اختر الطبيب</option>
                  </select>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="date" className="mb-1 block text-sm font-medium text-gray-700">التاريخ المفضل</label>
                    <input
                      id="date" name="date" type="date" required value={form.date} onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue focus:ring-1 focus:ring-blue"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label htmlFor="time" className="mb-1 block text-sm font-medium text-gray-700">الوقت المفضل</label>
                    <input
                      id="time" name="time" type="time" required value={form.time} onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue focus:ring-1 focus:ring-blue"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">ملاحظات</label>
                  <textarea
                    id="notes" name="notes" rows={3} value={form.notes} onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue focus:ring-1 focus:ring-blue"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="mt-6 w-full rounded-lg bg-navy py-3 text-sm font-bold text-white transition-colors hover:bg-navy-light"
              >
                إرسال طلب الحجز
              </button>
              <p className="mt-4 text-center text-xs text-gray-400">
                هذه الخدمة متاحة حالياً كنموذج تجريبي فقط
              </p>
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
