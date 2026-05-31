'use client';

import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import Logo from '../Logo';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login } = useAuth();
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ emailOrPhone?: string; password?: string }>({});

  const validate = () => {
    const errors: { emailOrPhone?: string; password?: string } = {};
    if (!emailOrPhone.trim()) errors.emailOrPhone = 'هذا الحقل مطلوب';
    if (!password.trim()) errors.password = 'هذا الحقل مطلوب';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setIsLoading(true);
    try {
      await login(emailOrPhone, password);

      // Check if must change password
      const stored = localStorage.getItem('token');
      if (stored) {
        try {
          const base64Url = stored.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);
          if (payload.mustChangePassword === 'true') {
            onClose();
            router.push('/change-password');
            return;
          }
        } catch {
          // Ignore JWT decode errors
        }
      }

      onClose();
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في الاتصال. يرجى المحاولة لاحقاً';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="إغلاق"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6 flex justify-center">
          <Logo size="md" showText={true} />
        </div>

        <h2 className="mb-6 text-center text-xl font-bold text-navy">تسجيل الدخول</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="emailOrPhone" className="mb-1 block text-sm font-medium text-gray-700">
              البريد الإلكتروني أو رقم الهاتف
            </label>
            <input
              id="emailOrPhone"
              type="text"
              value={emailOrPhone}
              onChange={(e) => {
                setEmailOrPhone(e.target.value);
                setFieldErrors((prev) => ({ ...prev, emailOrPhone: undefined }));
              }}
              className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors focus:border-blue focus:ring-1 focus:ring-blue ${
                fieldErrors.emailOrPhone ? 'border-red-400' : 'border-gray-300'
              }`}
              dir="rtl"
            />
            {fieldErrors.emailOrPhone && <p className="mt-1 text-xs text-red-500">{fieldErrors.emailOrPhone}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors focus:border-blue focus:ring-1 focus:ring-blue ${
                fieldErrors.password ? 'border-red-400' : 'border-gray-300'
              }`}
              dir="rtl"
            />
            {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
          </div>

          <div className="text-left">
            <a
              href="/forgot-password"
              className="text-xs text-blue hover:text-navy-light transition-colors"
            >
              نسيت كلمة المرور؟
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-navy py-3 text-sm font-bold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                جاري تسجيل الدخول...
              </span>
            ) : (
              'تسجيل الدخول'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
