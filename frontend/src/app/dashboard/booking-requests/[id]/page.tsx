'use client';

import { AuthProvider, useAuth } from '../../../../components/auth/AuthContext';
import DashboardLayout from '../../../../components/dashboard/DashboardLayout';
import BookingRequestDetails from '../../../../components/booking-requests/BookingRequestDetails';
import AccessDenied from '../../../../components/common/AccessDenied';
import { useParams } from 'next/navigation';

function BookingRequestDetailContent() {
  const { user } = useAuth();
  const params = useParams();
  const requestId = params.id as string;

  if (user?.role !== 'Admin' && user?.role !== 'Reception') {
    return <AccessDenied />;
  }

  const canUpdateStatus = user?.role === 'Admin' || user?.role === 'Reception';
  const canConvert = user?.role === 'Admin' || user?.role === 'Reception';
  const canDelete = user?.role === 'Admin';

  return (
    <DashboardLayout>
      <BookingRequestDetails
        requestId={requestId}
        canUpdateStatus={canUpdateStatus}
        canConvert={canConvert}
        canDelete={canDelete}
      />
    </DashboardLayout>
  );
}

export default function BookingRequestDetailPage() {
  return (
    <AuthProvider>
      <BookingRequestDetailContent />
    </AuthProvider>
  );
}
