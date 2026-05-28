'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../../../../components/auth/AuthContext';
import DashboardLayout from '../../../../components/dashboard/DashboardLayout';
import DoctorForm from '../../../../components/doctors/DoctorForm';
import AccessDenied from '../../../../components/common/AccessDenied';
import { api } from '../../../../lib/api';
import type { CreateDoctorRequest } from '../../../../types/api';

function NewDoctorContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user?.role !== 'Admin') {
    return <AccessDenied />;
  }

  const handleSubmit = async (data: CreateDoctorRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/doctors', data);
      router.push('/dashboard/doctors');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إضافة الطبيب');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <DoctorForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
    </DashboardLayout>
  );
}

export default function NewDoctorPage() {
  return (
    <AuthProvider>
      <NewDoctorContent />
    </AuthProvider>
  );
}
