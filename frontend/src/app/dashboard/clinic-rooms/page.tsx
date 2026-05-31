'use client';

import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ClinicRoomsList from '@/components/clinic-rooms/ClinicRoomsList';

export default function ClinicRoomsPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <ClinicRoomsList />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
