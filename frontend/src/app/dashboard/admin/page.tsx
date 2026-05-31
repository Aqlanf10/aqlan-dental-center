'use client';

import { useState, useEffect } from 'react';
import { AuthProvider } from '../../../components/auth/AuthContext';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import type { AdminDashboardStatsDto, FinanceDashboardDto } from '@/types/api';

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

function AdminContent() {
  const [stats, setStats] = useState<AdminDashboardStatsDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const res = await api.get<AdminDashboardStatsDto>('/admin/dashboard-stats').catch(() => null);
        if (res?.data) {
          setStats(res.data);
        } else {
          // Fallback: compute from individual endpoints
          const [patRes, finRes] = await Promise.all([
            api.get<{ totalCount: number }>('/patients?page=1&pageSize=1').catch(() => ({ data: { totalCount: 0 } })),
            api.get<FinanceDashboardDto>('/finance/dashboard').catch(() => ({ data: null as FinanceDashboardDto | null })),
          ]);
          const finance = finRes.data;
          setStats({
            totalPatients: patRes.data?.totalCount ?? 0,
            todayAppointments: 0,
            revenueMTD: finance?.monthRevenue ?? 0,
            pendingQueueItems: 0,
            overdueContracts: finance?.overdueContracts ?? 0,
            activeOrthoCases: 0,
            unpaidSupplierBills: 0,
            pendingCommissions: 0,
          });
        }
      } catch {
        // silent
      }
      setLoading(false);
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 font-[Tajawal]" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3a5c]">لوحة تحكم المدير</h1>
          <p className="text-sm text-gray-500">نظرة شاملة على أداء المركز</p>
        </div>

        {/* Stats Cards Row 1 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="إجمالي المرضى"
            value={stats?.totalPatients?.toString() ?? '--'}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            color="bg-purple-50 text-purple-700"
          />
          <StatCard
            title="مواعيد اليوم"
            value={stats?.todayAppointments?.toString() ?? '--'}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            color="bg-blue-50 text-blue-700"
          />
          <StatCard
            title="إيرادات الشهر"
            value={stats ? formatCurrency(stats.revenueMTD) : '--'}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="bg-green-50 text-green-700"
          />
          <StatCard
            title="عقود متخلفة"
            value={stats?.overdueContracts?.toString() ?? '--'}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            }
            color="bg-red-50 text-red-700"
          />
        </div>

        {/* Stats Cards Row 2 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="عناصر الطابور المعلقة"
            value={stats?.pendingQueueItems?.toString() ?? '--'}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            }
            color="bg-yellow-50 text-yellow-700"
          />
          <StatCard
            title="حالات التقويم النشطة"
            value={stats?.activeOrthoCases?.toString() ?? '--'}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
            color="bg-[#3d7ab5]/10 text-[#3d7ab5]"
          />
          <StatCard
            title="فواتير موردين غير مدفوعة"
            value={stats?.unpaidSupplierBills?.toString() ?? '--'}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            color="bg-orange-50 text-orange-700"
          />
          <StatCard
            title="عمولات معلقة"
            value={stats?.pendingCommissions?.toString() ?? '--'}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            color="bg-[#1a3a5c]/10 text-[#1a3a5c]"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-[#1a3a5c]">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthProvider>
      <AdminContent />
    </AuthProvider>
  );
}
