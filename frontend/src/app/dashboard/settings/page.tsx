'use client';

import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import SettingsContent from '@/components/settings/SettingsContent';

export default function SettingsPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <SettingsContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
