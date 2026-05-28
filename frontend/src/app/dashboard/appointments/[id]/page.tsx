'use client';

import { AuthProvider, useAuth } from '../../../../components/auth/AuthContext';
import DashboardLayout from '../../../../components/dashboard/DashboardLayout';
import AppointmentDetails from '../../../../components/appointments/AppointmentDetails';
import AccessDenied from '../../../../components/common/AccessDenied';
import { useParams } from 'next/navigation';

function AppointmentDetailContent() {
  const { user } = useAuth();
  const params = useParams();
  const appointmentId = params.id as string;

  if (user?.role === 'Patient') {
    return <AccessDenied />;
  }

  const canEdit = user?.role === 'Admin' || user?.role === 'Reception';
  const canDelete = user?.role === 'Admin';
  const canUpdateStatus = user?.role === 'Admin' || user?.role === 'Doctor' || user?.role === 'Reception';

  return (
    <DashboardLayout>
      <AppointmentDetails
        appointmentId={appointmentId}
        canEdit={canEdit}
        canDelete={canDelete}
        canUpdateStatus={canUpdateStatus}
      />
    </DashboardLayout>
  );
}

export default function AppointmentDetailPage() {
  return (
    <AuthProvider>
      <AppointmentDetailContent />
    </AuthProvider>
  );
}
