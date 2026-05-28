'use client';

import { AuthProvider, useAuth } from '../../../../components/auth/AuthContext';
import DashboardLayout from '../../../../components/dashboard/DashboardLayout';
import PatientDetails from '../../../../components/patients/PatientDetails';
import AccessDenied from '../../../../components/common/AccessDenied';
import { useParams } from 'next/navigation';

function PatientDetailContent() {
  const { user } = useAuth();
  const params = useParams();
  const patientId = params.id as string;

  if (user?.role === 'Patient') {
    return <AccessDenied />;
  }

  const canEdit = user?.role === 'Admin' || user?.role === 'Reception';
  const canDelete = user?.role === 'Admin' || user?.role === 'Reception';

  return (
    <DashboardLayout>
      <PatientDetails patientId={patientId} canEdit={canEdit} canDelete={canDelete} />
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
