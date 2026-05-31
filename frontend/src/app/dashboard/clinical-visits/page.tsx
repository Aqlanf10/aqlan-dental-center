'use client';

import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ClinicalVisitsBoard from '@/components/clinical-visits/ClinicalVisitsBoard';

export default function ClinicalVisitsPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <ClinicalVisitsBoard />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
