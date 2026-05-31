'use client';

import { useState, useEffect } from 'react';
import { AuthProvider } from '../components/auth/AuthContext';
import Navbar from '../components/home/Navbar';
import HeroSection from '../components/home/HeroSection';
import ServicesSection from '../components/home/ServicesSection';
import Footer from '../components/home/Footer';
import LoginModal from '../components/auth/LoginModal';

function HomePage() {
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const handler = () => setLoginOpen(true);
    window.addEventListener('openLogin', handler);
    return () => window.removeEventListener('openLogin', handler);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar onLoginClick={() => setLoginOpen(true)} />

      <main className="flex-1">
        <HeroSection />
        <ServicesSection />

        {/* Booking CTA */}
        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
            <h2 className="text-2xl font-bold text-navy sm:text-3xl">احجز موعدك الآن</h2>
            <p className="mt-3 text-gray-500">لا تتردد في حجز موعدك للحصول على أفضل رعاية لأسنانك</p>
            <a
              href="/booking"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-orange/30 transition-all hover:bg-orange/90"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              حجز موعد
            </a>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="bg-gray-50 py-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-navy sm:text-3xl">اتصل بنا</h2>
              <p className="mt-3 text-gray-500">نسعد بتواصلكم معنا</p>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy/10 text-navy">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="mt-3 font-bold text-navy">الهاتف</h3>
                <p className="mt-1 text-sm text-gray-500" dir="ltr">+967-1-200200</p>
              </div>
              <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy/10 text-navy">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="mt-3 font-bold text-navy">البريد الإلكتروني</h3>
                <p className="mt-1 text-sm text-gray-500" dir="ltr">info@aqlandental.dev</p>
              </div>
              <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy/10 text-navy">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="mt-3 font-bold text-navy">العنوان</h3>
                <p className="mt-1 text-sm text-gray-500">صنعاء، شارع الزبيري</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <HomePage />
    </AuthProvider>
  );
}
