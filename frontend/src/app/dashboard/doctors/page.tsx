'use client';

import { AuthProvider, useAuth } from '../../../components/auth/AuthContext';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import DoctorList from '../../../components/doctors/DoctorList';
import AccessDenied from '../../../components/common/AccessDenied';

function DoctorsContent() {
  const { user } = useAuth();

  if (user?.role === 'Patient') {
    return <AccessDenied />;
  }

  const canCreate = user?.role === 'Admin';
  const canDelete = user?.role === 'Admin';

  return (
    <DashboardLayout>
      <DoctorList canCreate={canCreate} canDelete={canDelete} />
    </DashboardLayout>
  );
}

export default function DoctorsPage() {
  return (
    <AuthProvider>
      <DoctorsContent />
    </AuthProvider>
  );
}
