'use client';

import { TodayClinicalVisitsDto } from '@/types/api';

interface Props {
  data: TodayClinicalVisitsDto;
}

export default function ClinicalVisitStats({ data }: Props) {
  const stats = [
    { label: 'زيارات اليوم', value: data.totalCount, color: 'bg-navy' },
    { label: 'مفتوحة', value: data.openCount, color: 'bg-blue-500' },
    { label: 'قيد المعالجة', value: data.inProgressCount, color: 'bg-yellow-500' },
    { label: 'مكتملة', value: data.completedCount, color: 'bg-green-500' },
    { label: 'ملغية', value: data.cancelledCount, color: 'bg-red-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${stat.color}`} />
            <span className="text-xs text-gray-500">{stat.label}</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-navy">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
