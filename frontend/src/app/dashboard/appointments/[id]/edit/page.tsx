'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AuthProvider, useAuth } from '../../../../../components/auth/AuthContext';
import DashboardLayout from '../../../../../components/dashboard/DashboardLayout';
import AppointmentForm from '../../../../../components/appointments/AppointmentForm';
import AccessDenied from '../../../../../components/common/AccessDenied';
import { api } from '../../../../../lib/api';
import type { DoctorDto, AppointmentDto, PagedResult, CreateAppointmentRequest } from '../../../../../types/api';

function EditAppointmentContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<AppointmentDto | null>(null);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [aptResult, docResult] = await Promise.all([
          api.get<AppointmentDto>(`/appointments/${appointmentId}`),
          api.get<PagedResult<DoctorDto>>('/doctors?pageSize=100'),
        ]);
        setAppointment(aptResult.data);
        setDoctors(docResult.data.items.filter((d) => d.isActive));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل البيانات');
      } finally {
        setInitialLoading(false);
      }
    }
    fetchData();
  }, [appointmentId]);

  if (user?.role !== 'Admin' && user?.role !== 'Reception') {
    return <AccessDenied />;
  }

  const handleSubmit = async (data: CreateAppointmentRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.put(`/appointments/${appointmentId}`, data);
      router.push('/dashboard/appointments');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث الموعد');
    } finally {
      setIsLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <svg className="h-10 w-10 animate-spin text-navy" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </DashboardLayout>
    );
  }

  if (!appointment) {
    return (
      <DashboardLayout>
        <div className="py-16 text-center text-gray-500">لم يتم العثور على الموعد</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AppointmentForm
        appointment={appointment}
        doctors={doctors}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
      />
    </DashboardLayout>
  );
}

export default function EditAppointmentPage() {
  return (
    <AuthProvider>
      <EditAppointmentContent />
    </AuthProvider>
  );
}
