'use client';

import { QueueStatusEnum, QueuePriorityEnum } from '@/types/api';

const priorityConfig: Record<number, { label: string; bg: string; text: string }> = {
  [QueuePriorityEnum.Normal]: { label: 'عادي', bg: 'bg-gray-100', text: 'text-gray-600' },
  [QueuePriorityEnum.Urgent]: { label: 'عاجل', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  [QueuePriorityEnum.VIP]: { label: 'VIP', bg: 'bg-purple-100', text: 'text-purple-700' },
  [QueuePriorityEnum.Emergency]: { label: 'طوارئ', bg: 'bg-red-100', text: 'text-red-700' },
};

const statusConfig: Record<number, { label: string; bg: string; text: string }> = {
  [QueueStatusEnum.Waiting]: { label: 'في الانتظار', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  [QueueStatusEnum.Called]: { label: 'تم النداء', bg: 'bg-blue-50', text: 'text-blue-700' },
  [QueueStatusEnum.InRoom]: { label: 'داخل الغرفة', bg: 'bg-green-50', text: 'text-green-700' },
  [QueueStatusEnum.InProgress]: { label: 'قيد المعالجة', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  [QueueStatusEnum.Completed]: { label: 'مكتمل', bg: 'bg-gray-50', text: 'text-gray-600' },
  [QueueStatusEnum.Cancelled]: { label: 'ملغي', bg: 'bg-red-50', text: 'text-red-600' },
  [QueueStatusEnum.NoShow]: { label: 'لم يحضر', bg: 'bg-orange-50', text: 'text-orange-600' },
};

export function getPriorityConfig(priority: number) {
  return priorityConfig[priority] || { label: priority.toString(), bg: 'bg-gray-100', text: 'text-gray-600' };
}

export function getQueueStatusConfig(status: number) {
  return statusConfig[status] || { label: status.toString(), bg: 'bg-gray-50', text: 'text-gray-600' };
}

export function QueuePriorityBadge({ priority }: { priority: number }) {
  const config = getPriorityConfig(priority);
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export function QueueStatusBadge({ status }: { status: number }) {
  const config = getQueueStatusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
