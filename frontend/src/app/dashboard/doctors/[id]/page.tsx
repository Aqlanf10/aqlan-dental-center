'use client';

import { AuthProvider, useAuth } from '../../../../components/auth/AuthContext';
import DashboardLayout from '../../../../components/dashboard/DashboardLayout';
import DoctorDetails from '../../../../components/doctors/DoctorDetails';
import AccessDenied from '../../../../components/common/AccessDenied';
import { useParams } from 'next/navigation';

function DoctorDetailContent() {
  const { user } = useAuth();
  const params = useParams();
  const doctorId = params.id as string;

  if (user?.role === 'Patient') {
    return <AccessDenied />;
  }

  const canEdit = user?.role === 'Admin';
  const canDelete = user?.role === 'Admin';

  return (
    <DashboardLayout>
      <DoctorDetails doctorId={doctorId} canEdit={canEdit} canDelete={canDelete} />
    </DashboardLayout>
  );
}

export default function DoctorDetailPage() {
  return (
    <AuthProvider>
      <DoctorDetailContent />
    </AuthProvider>
  );
}
