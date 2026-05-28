'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AuthProvider, useAuth } from '../../../../../components/auth/AuthContext';
import DashboardLayout from '../../../../../components/dashboard/DashboardLayout';
import PatientForm from '../../../../../components/patients/PatientForm';
import AccessDenied from '../../../../../components/common/AccessDenied';
import LoadingState from '../../../../../components/common/LoadingState';
import { api } from '../../../../../lib/api';
import type { PatientDto, CreatePatientRequest } from '../../../../../types/api';

function EditPatientContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<PatientDto | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPatient() {
      try {
        const result = await api.get<PatientDto>(`/patients/${patientId}`);
        setPatient(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل بيانات المريض');
      } finally {
        setIsLoadingPatient(false);
      }
    }
    fetchPatient();
  }, [patientId]);

  if (user?.role !== 'Admin' && user?.role !== 'Reception') {
    return <AccessDenied />;
  }

  const handleSubmit = async (data: CreatePatientRequest) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await api.put(`/patients/${patientId}`, data);
      router.push(`/dashboard/patients/${patientId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث بيانات المريض');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingPatient) {
    return (
      <DashboardLayout>
        <LoadingState />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PatientForm
        patient={patient || undefined}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        error={error}
      />
    </DashboardLayout>
  );
}

export default function EditPatientPage() {
  return (
    <AuthProvider>
      <EditPatientContent />
    </AuthProvider>
  );
}
