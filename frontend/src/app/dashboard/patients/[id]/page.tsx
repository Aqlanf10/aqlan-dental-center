'use client';

import { AuthProvider, useAuth } from '../../../../components/auth/AuthContext';
import DashboardLayout from '../../../../components/dashboard/DashboardLayout';
import PatientDetails from '../../../../components/patients/PatientDetails';
import AccessDenied from '../../../../components/common/AccessDenied';
import { useParams } from 'next/navigation';
import type { UserRole } from '../../../../types/api';

function PatientDetailContent() {
  const { user } = useAuth();
  const params = useParams();
  const patientId = params.id as string;

  if (user?.role === 'Patient') {
    return <AccessDenied />;
  }

  const canEdit = user?.role === 'Admin' || user?.role === 'Reception';
  const canDelete = user?.role === 'Admin';

  return (
    <DashboardLayout>
      <PatientDetails patientId={patientId} canEdit={canEdit} canDelete={canDelete} userRole={user?.role as UserRole} />
    </DashboardLayout>
  );
}

export default function PatientDetailPage() {
  return (
    <AuthProvider>
      <PatientDetailContent />
    </AuthProvider>
  );
}
