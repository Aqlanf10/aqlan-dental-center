'use client';

import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DailyVisitsBoard from '@/components/daily-visits/DailyVisitsBoard';

export default function DailyVisitsPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <DailyVisitsBoard />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
