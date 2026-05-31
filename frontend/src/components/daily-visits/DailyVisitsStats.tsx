'use client';

import { TodayDailyVisitsDto } from '@/types/api';

interface Props {
  data: TodayDailyVisitsDto;
}

const stats = [
  { key: 'totalAppointments', label: 'مواعيد اليوم', icon: '📅', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'checkedInCount', label: 'وصلوا', icon: '✅', color: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'waitingCount', label: 'في الانتظار', icon: '⏳', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { key: 'readyForDoctorCount', label: 'جاهزون للطبيب', icon: '🩺', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'inProgressCount', label: 'قيد المعالجة', icon: '🔄', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'completedCount', label: 'مكتمل', icon: '✔️', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { key: 'noShowCount', label: 'لم يحضر', icon: '❌', color: 'bg-orange-50 text-orange-700 border-orange-200' },
] as const;

export default function DailyVisitsStats({ data }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {stats.map((stat) => {
        const value = data[stat.key as keyof TodayDailyVisitsDto] as number;
        return (
          <div
            key={stat.key}
            className={`rounded-lg border p-3 ${stat.color}`}
          >
            <div className="text-lg">{stat.icon}</div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium opacity-80">{stat.label}</div>
          </div>
        );
      })}
    </div>
  );
}
