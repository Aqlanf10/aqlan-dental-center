'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TodayDailyVisitsDto,
  DailyVisitDto,
  DailyVisitStatusEnum,
} from '@/types/api';
import { api } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthContext';
import DailyVisitsStats from './DailyVisitsStats';
import DailyVisitCard from './DailyVisitCard';
import TodayAppointmentsPanel from './TodayAppointmentsPanel';
import WalkInVisitModal from './WalkInVisitModal';

type FilterTab = 'all' | 'appointments' | 'checkedIn' | 'waiting' | 'readyForDoctor' | 'inProgress' | 'completed';

const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'appointments', label: 'مواعيد اليوم' },
  { key: 'checkedIn', label: 'وصلوا' },
  { key: 'waiting', label: 'الانتظار' },
  { key: 'readyForDoctor', label: 'جاهز للطبيب' },
  { key: 'inProgress', label: 'قيد المعالجة' },
  { key: 'completed', label: 'مكتمل / ملغي / لم يحضر' },
];

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'حدث خطأ غير متوقع';
}

export default function DailyVisitsBoard() {
  const { user } = useAuth();
  const [data, setData] = useState<TodayDailyVisitsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showWalkInModal, setShowWalkInModal] = useState(false);

  const userRole = user?.role || '';
  const canEdit = ['Admin', 'Reception'].includes(userRole);
  const isDoctor = userRole === 'Doctor';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<TodayDailyVisitsDto>(`/daily-visits/today?date=${selectedDate}`);
      setData(res.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'فشل تحميل البيانات');
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get checked-in appointment IDs
  const checkedInAppointmentIds = new Set(
    (data?.visits || [])
      .filter(v => v.appointmentId && v.status !== DailyVisitStatusEnum.Cancelled)
      .map(v => v.appointmentId!)
  );

  // Filter visits based on tab
  const filteredVisits = (data?.visits || []).filter(visit => {
    switch (activeTab) {
      case 'all': return true;
      case 'checkedIn': return visit.status === DailyVisitStatusEnum.CheckedIn;
      case 'waiting': return visit.status === DailyVisitStatusEnum.Waiting;
      case 'readyForDoctor': return visit.status === DailyVisitStatusEnum.ReadyForDoctor;
      case 'inProgress': return visit.status === DailyVisitStatusEnum.InProgress;
      case 'completed':
        return visit.status === DailyVisitStatusEnum.Completed ||
               visit.status === DailyVisitStatusEnum.Cancelled ||
               visit.status === DailyVisitStatusEnum.NoShow;
      default: return true;
    }
  });

  // Filter appointments based on tab
  const filteredAppointments = activeTab === 'all' || activeTab === 'appointments'
    ? (data?.todayAppointments || [])
    : [];

  const handleCheckIn = async (appointmentId: string, chiefComplaint: string, notes: string) => {
    try {
      await api.post<DailyVisitDto>(`/daily-visits/appointments/${appointmentId}/check-in`, {
        chiefComplaint: chiefComplaint || null,
        notes: notes || null,
      });
      await fetchData();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'فشل تسجيل الوصول');
    }
  };

  const handleNoShow = async (appointmentId: string) => {
    if (!confirm('هل أنت متأكد من تسجيل عدم الحضور؟')) return;
    try {
      await api.post<DailyVisitDto>(`/daily-visits/appointments/${appointmentId}/no-show`);
      await fetchData();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'فشل تسجيل عدم الحضور');
    }
  };

  const handleWalkIn = async (walkInData: { patientId: string; doctorId?: string; chiefComplaint?: string; notes?: string }) => {
    try {
      await api.post<DailyVisitDto>('/daily-visits/walk-in', {
        patientId: walkInData.patientId,
        doctorId: walkInData.doctorId || null,
        visitDate: selectedDate,
        chiefComplaint: walkInData.chiefComplaint || null,
        notes: walkInData.notes || null,
      });
      setShowWalkInModal(false);
      await fetchData();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'فشل إنشاء الزيارة');
    }
  };

  const handleStatusChange = async (visitId: string, newStatus: number) => {
    try {
      await api.patch<DailyVisitDto>(`/daily-visits/${visitId}/status`, { status: newStatus });
      await fetchData();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'فشل تحديث الحالة');
    }
  };

  const handleCancel = async (visitId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء الزيارة؟')) return;
    try {
      await api.post<DailyVisitDto>(`/daily-visits/${visitId}/cancel`);
      await fetchData();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'فشل إلغاء الزيارة');
    }
  };

  const handleSendToQueue = async (dailyVisitId: string) => {
    try {
      await api.post(`/clinic-queue/daily-visits/${dailyVisitId}/send`, { priority: 0, notes: null });
      alert('تم إرسال المريض للطابور بنجاح');
      await fetchData();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || 'فشل إرسال المريض للطابور');
    }
  };

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-center text-red-600">
        <p>{error}</p>
        <button onClick={fetchData} className="mt-2 text-sm underline">إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">التشغيل اليومي</h1>
          <p className="text-sm text-gray-500">
            إدارة زيارات المرضى وتتبع الحالات اليومية
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
          />
          {canEdit && (
            <button
              onClick={() => setShowWalkInModal(true)}
              className="rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              + زيارة بدون موعد
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {data && <DailyVisitsStats data={data} />}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-navy shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Appointments Section */}
      {(activeTab === 'all' || activeTab === 'appointments') && filteredAppointments.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-navy">مواعيد اليوم</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAppointments.map(apt => (
              <TodayAppointmentsPanel
                key={apt.id}
                appointment={apt}
                onCheckIn={handleCheckIn}
                onNoShow={handleNoShow}
                isCheckedIn={checkedInAppointmentIds.has(apt.id)}
                canEdit={canEdit}
              />
            ))}
          </div>
        </div>
      )}

      {/* Visits Section */}
      {filteredVisits.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-navy">زيارات اليوم</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVisits.map(visit => (
              <DailyVisitCard
                key={visit.id}
                visit={visit}
                onStatusChange={handleStatusChange}
                onCancel={handleCancel}
                onSendToQueue={handleSendToQueue}
                canEdit={canEdit}
                isDoctor={isDoctor}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredVisits.length === 0 && (activeTab !== 'all' && activeTab !== 'appointments' || filteredAppointments.length === 0) && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">لا توجد زيارات أو مواعيد لهذا اليوم</p>
        </div>
      )}

      {/* Walk-in modal */}
      {showWalkInModal && (
        <WalkInVisitModal
          onSubmit={handleWalkIn}
          onClose={() => setShowWalkInModal(false)}
        />
      )}
    </div>
  );
}
