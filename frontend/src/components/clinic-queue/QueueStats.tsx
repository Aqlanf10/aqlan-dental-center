'use client';

import { TodayQueueDto } from '@/types/api';

interface Props {
  data: TodayQueueDto;
}

const stats = [
  { key: 'waitingCount', label: 'في الانتظار', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: '⏳' },
  { key: 'calledCount', label: 'تم النداء', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '📢' },
  { key: 'inRoomCount', label: 'داخل الغرفة', color: 'bg-green-50 text-green-700 border-green-200', icon: '🚪' },
  { key: 'inProgressCount', label: 'قيد المعالجة', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: '🔄' },
  { key: 'completedCount', label: 'مكتمل', color: 'bg-gray-50 text-gray-700 border-gray-200', icon: '✔️' },
  { key: 'cancelledCount', label: 'ملغي', color: 'bg-red-50 text-red-600 border-red-200', icon: '✖️' },
] as const;

export default function QueueStats({ data }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => {
        const value = data[stat.key as keyof TodayQueueDto] as number;
        return (
          <div key={stat.key} className={`rounded-lg border p-3 ${stat.color}`}>
            <div className="text-lg">{stat.icon}</div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
            <div className="text-xs font-medium opacity-80">{stat.label}</div>
          </div>
        );
      })}
    </div>
  );
}
