'use client';

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import type { PatientDto, AppointmentDto, FinanceDashboardDto } from '@/types/api';

function ReportsContent() {
  const [loading, setLoading] = useState(true);
  const [patientCount, setPatientCount] = useState(0);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [financeData, setFinanceData] = useState<FinanceDashboardDto | null>(null);
  const [orthoCount, setOrthoCount] = useState(0);
  const [genderData, setGenderData] = useState<{ male: number; female: number }>({ male: 0, female: 0 });
  const [appointmentStatusData, setAppointmentStatusData] = useState<Record<number, number>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [patientsRes, appointmentsRes, financeRes, orthoRes] = await Promise.all([
          api.get<{ totalCount: number }>('/patients?page=1&pageSize=1'),
          api.get<{ totalCount: number }>('/appointments?page=1&pageSize=1'),
          api.get<FinanceDashboardDto>('/finance/dashboard').catch(() => ({ data: null as FinanceDashboardDto | null })),
          api.get<{ totalCount: number }>('/ortho-cases?page=1&pageSize=1'),
        ]);

        setPatientCount(patientsRes.data?.totalCount || 0);
        setAppointmentCount(appointmentsRes.data?.totalCount || 0);
        setFinanceData(financeRes.data);
        setOrthoCount(orthoRes.data?.totalCount || 0);

        // Gender distribution
        const allPatientsRes = await api.get<{ items: PatientDto[] }>('/patients?page=1&pageSize=1000');
        const patients = allPatientsRes.data?.items || [];
        const male = patients.filter(p => p.gender === 0).length;
        const female = patients.filter(p => p.gender === 1).length;
        setGenderData({ male, female });

        // Appointment status distribution
        const allApptsRes = await api.get<{ items: AppointmentDto[] }>('/appointments?page=1&pageSize=1000');
        const appts = allApptsRes.data?.items || [];
        const statusCounts: Record<number, number> = {};
        appts.forEach(a => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });
        setAppointmentStatusData(statusCounts);
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
  }, []);

  const formatCurrency = (amount: number) => `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;

  const appointmentStatusLabels: Record<number, string> = {
    0: 'مجدول', 1: 'مؤكد', 2: 'مكتمل', 3: 'ملغي', 4: 'لم يحضر',
  };

  const appointmentStatusColors: Record<number, string> = {
    0: 'bg-blue-500', 1: 'bg-green-500', 2: 'bg-navy', 3: 'bg-red-500', 4: 'bg-gray-400',
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">التقارير</h1>
        <p className="text-sm text-gray-500">نظرة عامة على أداء المركز</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="إجمالي المرضى" value={String(patientCount)} icon="👥" color="bg-purple-50 text-purple-700" />
        <StatCard title="إجمالي المواعيد" value={String(appointmentCount)} icon="📅" color="bg-blue-50 text-blue-700" />
        <StatCard title="إيرادات الشهر" value={financeData ? formatCurrency(financeData.monthRevenue) : '—'} icon="💰" color="bg-green-50 text-green-700" />
        <StatCard title="حالات التقويم" value={String(orthoCount)} icon="🦷" color="bg-orange/5 text-orange" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Overview */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-navy">ملخص الإيرادات</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">إيرادات اليوم</span>
              <span className="text-lg font-bold text-navy">{financeData ? formatCurrency(financeData.todayRevenue) : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">إيرادات الشهر</span>
              <span className="text-lg font-bold text-navy">{financeData ? formatCurrency(financeData.monthRevenue) : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">فواتير معلقة</span>
              <span className="text-lg font-bold text-orange">{financeData?.pendingInvoices ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">عقود نشطة</span>
              <span className="text-lg font-bold text-green-600">{financeData?.activeContracts ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">عقود متخلفة</span>
              <span className="text-lg font-bold text-red-600">{financeData?.overdueContracts ?? '—'}</span>
            </div>
          </div>
        </div>

        {/* Patient Demographics */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-navy">توزيع المرضى</h3>
          <div className="space-y-6">
            {/* Gender Distribution */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-gray-600">حسب الجنس</h4>
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>ذكور</span>
                    <span className="font-medium text-navy">{genderData.male}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-gray-100">
                    <div className="h-3 rounded-full bg-blue-500 transition-all" style={{ width: `${patientCount > 0 ? (genderData.male / patientCount) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>إناث</span>
                    <span className="font-medium text-navy">{genderData.female}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-gray-100">
                    <div className="h-3 rounded-full bg-pink-500 transition-all" style={{ width: `${patientCount > 0 ? (genderData.female / patientCount) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Status Distribution */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-gray-600">حالة المواعيد</h4>
              <div className="space-y-2">
                {Object.entries(appointmentStatusData).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${appointmentStatusColors[Number(status)] || 'bg-gray-300'}`} />
                    <span className="flex-1 text-sm text-gray-600">{appointmentStatusLabels[Number(status)] || `حالة ${status}`}</span>
                    <span className="text-sm font-medium text-navy">{count}</span>
                  </div>
                ))}
                {Object.keys(appointmentStatusData).length === 0 && (
                  <p className="text-sm text-gray-400">لا توجد بيانات مواعيد</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-navy">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <ReportsContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
