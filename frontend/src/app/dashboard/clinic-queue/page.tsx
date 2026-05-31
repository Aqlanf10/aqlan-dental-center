'use client';

import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ClinicQueueBoard from '@/components/clinic-queue/ClinicQueueBoard';

export default function ClinicQueuePage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <ClinicQueueBoard />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
