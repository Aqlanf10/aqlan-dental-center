'use client';

import { useState, Suspense } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';

function ResetPasswordForm() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getPasswordStrength = (pwd: string): { level: number; label: string; color: string } => {
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { level: 1, label: 'ضعيفة', color: 'bg-red-500' };
    if (score <= 3) return { level: 2, label: 'متوسطة', color: 'bg-yellow-500' };
    if (score <= 4) return { level: 3, label: 'جيدة', color: 'bg-blue-500' };
    return { level: 4, label: 'قوية', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength(newPassword);

  const validate = (): boolean => {
    if (!token) {
      setError('رمز إعادة التعيين مطلوب');
      return false;
    }
    if (newPassword.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return false;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل');
      return false;
    }
    if (!/[a-z]/.test(newPassword)) {
      setError('كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل');
      return false;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
      return false;
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setError('كلمة المرور يجب أن تحتوي على حرف خاص واحد على الأقل');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('كلمة المرور وتأكيدها غير متطابقتين');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validate()) return;

    setIsLoading(true);
    try {
      const result = await resetPassword(token, newPassword);
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          router.push('/');
        }, 2000);
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

        <h2 className="mb-2 text-center text-xl font-bold text-navy">إعادة تعيين كلمة المرور</h2>
        <p className="mb-6 text-center text-sm text-gray-500">
          أدخل الرمز المرسل إليك وكلمة المرور الجديدة
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
        )}

        {success && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-600">
              {success}
            </div>
            <p className="text-center text-sm text-gray-500">سيتم تحويلك لصفحة تسجيل الدخول...</p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full rounded-lg bg-navy py-3 text-sm font-bold text-white transition-colors hover:bg-navy-light"
            >
              الانتقال لتسجيل الدخول
            </button>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="token" className="mb-1 block text-sm font-medium text-gray-700">
                رمز إعادة التعيين
              </label>
              <textarea
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue focus:ring-1 focus:ring-blue font-mono"
                dir="ltr"
                rows={3}
                placeholder="الصق رمز إعادة التعيين هنا"
                required
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-gray-700">
                كلمة المرور الجديدة
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition-colors focus:border-blue focus:ring-1 focus:ring-blue"
                dir="ltr"
                required
              />
              {newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          level <= strength.level ? strength.color : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">قوة كلمة المرور: {strength.label}</p>
                </div>
              )}
              <div className="mt-2 text-xs text-gray-400 space-y-1">
                <p className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                  {newPassword.length >= 8 ? '✓' : '○'} 8 أحرف على الأقل
                </p>
                <p className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>
                  {/[A-Z]/.test(newPassword) ? '✓' : '○'} حرف كبير واحد على الأقل
                </p>
                <p className={/[a-z]/.test(newPassword) ? 'text-green-600' : ''}>
                  {/[a-z]/.test(newPassword) ? '✓' : '○'} حرف صغير واحد على الأقل
                </p>
                <p className={/[0-9]/.test(newPassword) ? 'text-green-600' : ''}>
                  {/[0-9]/.test(newPassword) ? '✓' : '○'} رقم واحد على الأقل
                </p>
                <p className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-green-600' : ''}>
                  {/[^A-Za-z0-9]/.test(newPassword) ? '✓' : '○'} حرف خاص واحد على الأقل
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-700">
                تأكيد كلمة المرور
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition-colors focus:border-blue focus:ring-1 focus:ring-blue ${
                  confirmPassword && newPassword !== confirmPassword ? 'border-red-400' : 'border-gray-300'
                }`}
                dir="ltr"
                required
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-xs text-red-500">كلمة المرور غير متطابقة</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-navy py-3 text-sm font-bold text-white transition-colors hover:bg-navy-light disabled:opacity-60"
            >
              {isLoading ? 'جاري إعادة التعيين...' : 'إعادة تعيين كلمة المرور'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-blue-900 to-navy">
        <div className="text-white text-lg">جاري التحميل...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
