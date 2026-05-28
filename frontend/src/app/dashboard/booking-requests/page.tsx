'use client';

import { AuthProvider, useAuth } from '../../../components/auth/AuthContext';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import BookingRequestList from '../../../components/booking-requests/BookingRequestList';
import AccessDenied from '../../../components/common/AccessDenied';

function BookingRequestsContent() {
  const { user } = useAuth();

  if (user?.role !== 'Admin' && user?.role !== 'Reception') {
    return <AccessDenied />;
  }

  const canDelete = user?.role === 'Admin';
  const canUpdateStatus = user?.role === 'Admin' || user?.role === 'Reception';
  const canConvert = user?.role === 'Admin' || user?.role === 'Reception';

  return (
    <DashboardLayout>
      <BookingRequestList canDelete={canDelete} canUpdateStatus={canUpdateStatus} canConvert={canConvert} />
    </DashboardLayout>
  );
}

export default function BookingRequestsPage() {
  return (
    <AuthProvider>
      <BookingRequestsContent />
    </AuthProvider>
  );
}
