'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '../../../../components/auth/AuthContext';
import DashboardLayout from '../../../../components/dashboard/DashboardLayout';
import AppointmentForm from '../../../../components/appointments/AppointmentForm';
import AccessDenied from '../../../../components/common/AccessDenied';
import { api } from '../../../../lib/api';
import type { DoctorDto, PagedResult, CreateAppointmentRequest } from '../../../../types/api';

function NewAppointmentContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);

  useEffect(() => {
    async function fetchDoctors() {
      try {
        const result = await api.get<PagedResult<DoctorDto>>('/doctors?pageSize=100');
        setDoctors(result.data.items.filter((d) => d.isActive));
      } catch {
        // Silent
      }
    }
    fetchDoctors();
  }, []);

  if (user?.role !== 'Admin' && user?.role !== 'Reception') {
    return <AccessDenied />;
  }

  const handleSubmit = async (data: CreateAppointmentRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/appointments', data);
      router.push('/dashboard/appointments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إضافة الموعد');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <AppointmentForm
        doctors={doctors}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
      />
    </DashboardLayout>
  );
}

export default function NewAppointmentPage() {
  return (
    <AuthProvider>
      <NewAppointmentContent />
    </AuthProvider>
  );
}
