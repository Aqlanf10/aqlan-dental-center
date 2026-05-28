'use client';

import { AuthProvider, useAuth } from '../../../components/auth/AuthContext';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import PatientList from '../../../components/patients/PatientList';
import AccessDenied from '../../../components/common/AccessDenied';

function PatientsContent() {
  const { user } = useAuth();

  if (user?.role === 'Patient') {
    return <AccessDenied />;
  }

  return (
    <DashboardLayout>
      <PatientList />
    </DashboardLayout>
  );
}

export default function PatientsPage() {
  return (
    <AuthProvider>
      <PatientsContent />
    </AuthProvider>
  );
}
