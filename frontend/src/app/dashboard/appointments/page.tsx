'use client';

import { AuthProvider, useAuth } from '../../../components/auth/AuthContext';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import AppointmentList from '../../../components/appointments/AppointmentList';
import AccessDenied from '../../../components/common/AccessDenied';

function AppointmentsContent() {
  const { user } = useAuth();

  if (user?.role === 'Patient') {
    return <AccessDenied />;
  }

  const canCreate = user?.role === 'Admin' || user?.role === 'Reception';
  const canDelete = user?.role === 'Admin';
  const canUpdateStatus = user?.role === 'Admin' || user?.role === 'Doctor' || user?.role === 'Reception';

  return (
    <DashboardLayout>
      <AppointmentList canCreate={canCreate} canDelete={canDelete} canUpdateStatus={canUpdateStatus} />
    </DashboardLayout>
  );
}

export default function AppointmentsPage() {
  return (
    <AuthProvider>
      <AppointmentsContent />
    </AuthProvider>
  );
}
