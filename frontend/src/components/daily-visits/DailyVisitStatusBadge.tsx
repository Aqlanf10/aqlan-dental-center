'use client';

import { DailyVisitStatusEnum } from '@/types/api';

const statusConfig: Record<number, { label: string; bg: string; text: string; dot: string }> = {
  [DailyVisitStatusEnum.Scheduled]: {
    label: 'مجدول',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-400',
  },
  [DailyVisitStatusEnum.CheckedIn]: {
    label: 'وصل',
    bg: 'bg-green-50',
    text: 'text-green-700',
    dot: 'bg-green-400',
  },
  [DailyVisitStatusEnum.Waiting]: {
    label: 'في الانتظار',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    dot: 'bg-yellow-400',
  },
  [DailyVisitStatusEnum.ReadyForDoctor]: {
    label: 'جاهز للطبيب',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    dot: 'bg-purple-400',
  },
  [DailyVisitStatusEnum.InProgress]: {
    label: 'قيد المعالجة',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    dot: 'bg-indigo-400',
  },
  [DailyVisitStatusEnum.Completed]: {
    label: 'مكتمل',
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    dot: 'bg-gray-400',
  },
  [DailyVisitStatusEnum.Cancelled]: {
    label: 'ملغي',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-400',
  },
  [DailyVisitStatusEnum.NoShow]: {
    label: 'لم يحضر',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    dot: 'bg-orange-400',
  },
};

interface Props {
  status: number;
  size?: 'sm' | 'md';
}

export default function DailyVisitStatusBadge({ status, size = 'sm' }: Props) {
  const config = statusConfig[status] || {
    label: status.toString(),
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    dot: 'bg-gray-400',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function getStatusConfig(status: number) {
  return statusConfig[status];
}
