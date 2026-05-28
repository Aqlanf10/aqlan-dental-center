'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AuthProvider, useAuth } from '../../../../../components/auth/AuthContext';
import DashboardLayout from '../../../../../components/dashboard/DashboardLayout';
import DoctorForm from '../../../../../components/doctors/DoctorForm';
import AccessDenied from '../../../../../components/common/AccessDenied';
import LoadingState from '../../../../../components/common/LoadingState';
import { api } from '../../../../../lib/api';
import type { DoctorDto, CreateDoctorRequest } from '../../../../../types/api';

function EditDoctorContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const doctorId = params.id as string;

  const [doctor, setDoctor] = useState<DoctorDto | null>(null);
  const [isLoadingDoctor, setIsLoadingDoctor] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDoctor() {
      try {
        const result = await api.get<DoctorDto>(`/doctors/${doctorId}`);
        setDoctor(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل بيانات الطبيب');
      } finally {
        setIsLoadingDoctor(false);
      }
    }
    fetchDoctor();
  }, [doctorId]);

  if (user?.role !== 'Admin') {
    return <AccessDenied />;
  }

  const handleSubmit = async (data: CreateDoctorRequest) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await api.put(`/doctors/${doctorId}`, data);
      router.push(`/dashboard/doctors/${doctorId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث بيانات الطبيب');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingDoctor) {
    return (
      <DashboardLayout>
        <LoadingState />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DoctorForm
        doctor={doctor || undefined}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        error={error}
      />
    </DashboardLayout>
  );
}

export default function EditDoctorPage() {
  return (
    <AuthProvider>
      <EditDoctorContent />
    </AuthProvider>
  );
}
