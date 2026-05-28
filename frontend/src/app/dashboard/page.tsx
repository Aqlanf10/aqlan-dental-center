'use client';

import { AuthProvider, useAuth } from '../../components/auth/AuthContext';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import { useEffect } from 'react';

const roleRoutes: Record<string, string> = {
  Admin: '/dashboard/admin',
  Doctor: '/dashboard/doctor',
  Reception: '/dashboard/reception',
  Accountant: '/dashboard/finance',
  Patient: '/dashboard/patient',
};

function DashboardContent() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      const route = roleRoutes[user.role];
      if (route && window.location.pathname === '/dashboard') {
        window.location.href = route;
      }
    }
  }, [user, isLoading]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-20">
        <svg className="h-8 w-8 animate-spin text-navy" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    </DashboardLayout>
  );
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
