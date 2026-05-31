'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!usernameOrEmail.trim()) {
      setError('يرجى إدخال البريد الإلكتروني أو اسم المستخدم');
      return;
    }

    setIsLoading(true);
    try {
      const result = await forgotPassword(usernameOrEmail.trim());
      if (result.success) {
        setSuccess(result.message);
        // In development mode, we get the reset token directly
        if (result.resetToken) {
          setResetToken(result.resetToken);
        }
      } else {
        setError(result.message);
      }
    } catch {
      setError('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-blue-900 to-navy p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <Logo size="md" showText={true} />
        </div>

        <h2 className="mb-2 text-center text-xl font-bold text-navy">نسيت كلمة المرور</h2>
        <p className="mb-6 text-center text-sm text-gray-500">
          أدخل البريد الإلكتروني أو اسم المستخدم وسنرسل لك رابط إعادة تعيين كلمة المرور
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
        )}

        {success && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-600">
              {success}
            </div>
            {resetToken && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
                <p className="font-medium text-blue-800 mb-2">رمز إعادة التعيين (وضع التطوير):</p>
                <p className="text-xs text-blue-600 break-all font-mono bg-white p-2 rounded border border-blue-200">
                  {resetToken}
                </p>
                <button
                  type="button"
                  onClick={() => router.push(`/reset-password?token=${encodeURIComponent(resetToken)}`)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  الانتقال لصفحة إعادة التعيين
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full rounded-lg bg-navy py-3 text-sm font-bold text-white transition-colors hover:bg-navy-light"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="usernameOrEmail" className="mb-1 block text-sm font-medium text-gray-700">
                البريد الإلكتروني أو اسم المستخدم
              </label>
              <input
                id="usernameOrEmail"
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue focus:ring-1 focus:ring-blue"
                dir="ltr"
                placeholder="example@domain.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-navy py-3 text-sm font-bold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
            >
              {isLoading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
            </button>

            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              العودة لتسجيل الدخول
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
