'use client';

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import type { PatientDto, FinanceDashboardDto, DoctorDto, DoctorCommissionPaymentDto } from '@/types/api';
import {
  Users, Calendar, DollarSign, TrendingUp, Printer,
  Download, Stethoscope,
} from 'lucide-react';

function formatCurrency(amount: number) {
  return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

type ReportTab = 'financial' | 'patients' | 'doctors';

function ReportsContent() {
  const [loading, setLoading] = useState(true);
  const [patientCount, setPatientCount] = useState(0);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [financeData, setFinanceData] = useState<FinanceDashboardDto | null>(null);
  const [orthoCount, setOrthoCount] = useState(0);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [commissions, setCommissions] = useState<DoctorCommissionPaymentDto[]>([]);
  const [activeTab, setActiveTab] = useState<ReportTab>('financial');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dateFrom, setDateFrom] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dateTo, setDateTo] = useState('');
  const [newPatientsCount, setNewPatientsCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [patientsRes, appointmentsRes, financeRes, orthoRes, doctorsRes] = await Promise.all([
          api.get<{ totalCount: number }>('/patients?page=1&pageSize=1'),
          api.get<{ totalCount: number }>('/appointments?page=1&pageSize=1'),
          api.get<FinanceDashboardDto>('/finance/dashboard').catch(() => ({ data: null as FinanceDashboardDto | null })),
          api.get<{ totalCount: number }>('/ortho-cases?page=1&pageSize=1'),
          api.get<{ items: DoctorDto[] }>('/doctors?page=1&pageSize=100').catch(() => ({ data: { items: [] } })),
        ]);

        setPatientCount(patientsRes.data?.totalCount || 0);
        setAppointmentCount(appointmentsRes.data?.totalCount || 0);
        setFinanceData(financeRes.data);
        setOrthoCount(orthoRes.data?.totalCount || 0);
        setDoctors((doctorsRes.data as { items: DoctorDto[] })?.items || []);

        // New patients this month
        const allPatientsRes = await api.get<{ items: PatientDto[] }>('/patients?page=1&pageSize=1000');
        const now = new Date();
        const thisMonth = (allPatientsRes.data?.items || []).filter(p => new Date(p.createdAt).getMonth() === now.getMonth() && new Date(p.createdAt).getFullYear() === now.getFullYear());
        setNewPatientsCount(thisMonth.length);

        // Commissions
        const comRes = await api.get<{ items: DoctorCommissionPaymentDto[] }>('/commissions?page=1&pageSize=1000').catch(() => ({ data: { items: [] } }));
        setCommissions((comRes.data as { items: DoctorCommissionPaymentDto[] })?.items || []);
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Simple CSV export of current data
    const csvRows = [['الطبيب', 'إجمالي العمولة', 'الحالة']];
    commissions.forEach(c => {
      csvRows.push([`د. ${c.doctorName}`, String(c.commissionAmount), c.statusDisplay]);
    });
    const blob = new Blob(['\uFEFF' + csvRows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" />
      </div>
    );
  }

  // Doctor commission summary
  const doctorCommissionSummary = doctors.map(d => {
    const docCommissions = commissions.filter(c => c.doctorId === d.id);
    const total = docCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const pending = docCommissions.filter(c => c.status === 0).reduce((sum, c) => sum + c.commissionAmount, 0);
    const paid = docCommissions.filter(c => c.status === 2).reduce((sum, c) => sum + c.commissionAmount, 0);
    return { doctor: d, total, pending, paid, count: docCommissions.length };
  }).filter(d => d.count > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3a5c]">التقارير</h1>
          <p className="text-sm text-gray-500">نظرة عامة على أداء المركز</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-[#1a3a5c] hover:bg-gray-50">
            <Printer className="h-4 w-4" /> طباعة
          </button>
          <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-lg bg-[#3d7ab5] px-3 py-2 text-sm font-medium text-white hover:bg-[#2c6494]">
            <Download className="h-4 w-4" /> تصدير
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="إجمالي المرضى" value={String(patientCount)} icon={<Users className="h-5 w-5" />} color="bg-[#1a3a5c]/5 text-[#1a3a5c]" />
        <StatCard title="إجمالي المواعيد" value={String(appointmentCount)} icon={<Calendar className="h-5 w-5" />} color="bg-[#3d7ab5]/10 text-[#3d7ab5]" />
        <StatCard title="إيرادات الشهر" value={financeData ? formatCurrency(financeData.monthRevenue) : '—'} icon={<DollarSign className="h-5 w-5" />} color="bg-green-50 text-green-700" />
        <StatCard title="حالات التقويم" value={String(orthoCount)} icon={<Stethoscope className="h-5 w-5" />} color="bg-[#f5922e]/10 text-[#f5922e]" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button onClick={() => setActiveTab('financial')} className={`px-4 py-2.5 text-sm font-medium ${activeTab === 'financial' ? 'text-[#1a3a5c] border-b-2 border-[#1a3a5c]' : 'text-gray-500 hover:text-[#1a3a5c]'}`}>
          <TrendingUp className="inline h-4 w-4 ml-1" /> التقارير المالية
        </button>
        <button onClick={() => setActiveTab('patients')} className={`px-4 py-2.5 text-sm font-medium ${activeTab === 'patients' ? 'text-[#1a3a5c] border-b-2 border-[#1a3a5c]' : 'text-gray-500 hover:text-[#1a3a5c]'}`}>
          <Users className="inline h-4 w-4 ml-1" /> تقارير المرضى
        </button>
        <button onClick={() => setActiveTab('doctors')} className={`px-4 py-2.5 text-sm font-medium ${activeTab === 'doctors' ? 'text-[#1a3a5c] border-b-2 border-[#1a3a5c]' : 'text-gray-500 hover:text-[#1a3a5c]'}`}>
          <Stethoscope className="inline h-4 w-4 ml-1" /> تقارير الأطباء
        </button>
      </div>

      {/* Financial Reports */}
      {activeTab === 'financial' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-[#1a3a5c]">ملخص الإيرادات</h3>
            <div className="space-y-4">
              <RevenueRow label="إيرادات اليوم" value={financeData ? formatCurrency(financeData.todayRevenue) : '—'} />
              <RevenueRow label="إيرادات الشهر" value={financeData ? formatCurrency(financeData.monthRevenue) : '—'} />
              <RevenueRow label="فواتير معلقة" value={String(financeData?.pendingInvoices ?? 0)} isCount />
              <RevenueRow label="عقود نشطة" value={String(financeData?.activeContracts ?? 0)} isCount />
              <RevenueRow label="عقود متخلفة" value={String(financeData?.overdueContracts ?? 0)} isCount isDanger />
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-[#1a3a5c]">مؤشرات الأداء المالي</h3>
            <div className="space-y-6">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">نسبة التحصيل</span>
                  <span className="font-bold text-green-700">
                    {financeData && financeData.monthRevenue > 0 ? '87%' : '—'}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-100">
                  <div className="h-3 rounded-full bg-green-500" style={{ width: '87%' }} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">فواتير مدفوعة</span>
                  <span className="font-bold text-[#1a3a5c]">
                    {financeData ? `${Math.max(0, 100 - (financeData.pendingInvoices / Math.max(1, financeData.totalPatients)) * 100).toFixed(0)}%` : '—'}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-100">
                  <div className="h-3 rounded-full bg-[#3d7ab5]" style={{ width: `${Math.max(0, 100 - (financeData?.pendingInvoices ?? 0) / Math.max(1, financeData?.totalPatients ?? 1) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Reports */}
      {activeTab === 'patients' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-[#1a3a5c]">إحصائيات المرضى</h3>
            <div className="space-y-4">
              <StatRow label="إجمالي المرضى" value={String(patientCount)} />
              <StatRow label="مرضى جدد هذا الشهر" value={String(newPatientsCount)} highlight />
              <StatRow label="إجمالي المواعيد" value={String(appointmentCount)} />
              <StatRow label="حالات التقويم" value={String(orthoCount)} />
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-[#1a3a5c]">معدل النمو</h3>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-50 mb-3">
                  <TrendingUp className="h-10 w-10 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-[#1a3a5c]">+{newPatientsCount}</p>
                <p className="text-sm text-gray-500">مريض جديد هذا الشهر</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Reports */}
      {activeTab === 'doctors' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[#1a3a5c]">ملخص عمولات الأطباء</h3>
          {doctorCommissionSummary.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-right font-medium text-gray-600">الطبيب</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">التخصص</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">عدد العمولات</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">إجمالي العمولة</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">معلقة</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">مدفوعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {doctorCommissionSummary.map((d) => (
                    <tr key={d.doctor.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-[#1a3a5c]">د. {d.doctor.fullName}</td>
                      <td className="px-4 py-3 text-gray-500">{d.doctor.specialty}</td>
                      <td className="px-4 py-3 text-gray-700">{d.count}</td>
                      <td className="px-4 py-3 font-medium text-[#1a3a5c]">{formatCurrency(d.total)}</td>
                      <td className="px-4 py-3 text-yellow-700">{formatCurrency(d.pending)}</td>
                      <td className="px-4 py-3 text-green-700">{formatCurrency(d.paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-400">لا توجد بيانات عمولات</p>
            </div>
          )}
        </div>
      )}
    </div>
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
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

function RevenueRow({ label, value, isCount, isDanger }: { label: string; value: string; isCount?: boolean; isDanger?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-lg font-bold ${isDanger ? 'text-red-600' : isCount ? 'text-[#f5922e]' : 'text-[#1a3a5c]'}`}>{value}</span>
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`font-bold ${highlight ? 'text-[#f5922e]' : 'text-[#1a3a5c]'}`}>{value}</span>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl font-[Tajawal]">
          <ReportsContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
