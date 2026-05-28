'use client';

import { useAuth } from '../auth/AuthContext';

interface TopbarProps {
  onMenuToggle: () => void;
}

const roleLabels: Record<string, string> = {
  Admin: 'مدير',
  Doctor: 'طبيب',
  Reception: 'استقبال',
  Accountant: 'محاسب',
  Patient: 'مريض',
};

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-navy-light bg-navy px-4 py-3 text-white lg:px-6">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 transition-colors hover:bg-navy-light lg:hidden"
        aria-label="فتح القائمة"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Clinic name - desktop */}
      <div className="hidden text-sm font-medium lg:block">
        مركز الدكتور عقلان الكامل لتقويم وزراعة وتجميل الأسنان
      </div>

      {/* Clinic name - mobile */}
      <div className="text-sm font-medium lg:hidden">
        مركز عقلان
      </div>

      {/* User info */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="text-left text-xs">
            <div className="font-medium">{user.fullName}</div>
            <div className="text-gray-300">{roleLabels[user.role] || user.role}</div>
          </div>
        )}
        <button
          onClick={logout}
          className="rounded-lg p-2 transition-colors hover:bg-red-500/20 hover:text-red-300"
          aria-label="تسجيل الخروج"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
