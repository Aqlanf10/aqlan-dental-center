'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../../../../components/auth/AuthContext';
import DashboardLayout from '../../../../components/dashboard/DashboardLayout';
import PatientForm from '../../../../components/patients/PatientForm';
import AccessDenied from '../../../../components/common/AccessDenied';
import { api } from '../../../../lib/api';
import type { CreatePatientRequest } from '../../../../types/api';

function NewPatientContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user?.role !== 'Admin' && user?.role !== 'Reception') {
    return <AccessDenied />;
  }

  const handleSubmit = async (data: CreatePatientRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/patients', data);
      router.push('/dashboard/patients');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إضافة المريض');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <PatientForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
    </DashboardLayout>
  );
}

export default function NewPatientPage() {
  return (
    <AuthProvider>
      <NewPatientContent />
    </AuthProvider>
  );
}
