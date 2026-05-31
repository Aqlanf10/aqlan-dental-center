'use client';

import { ClinicalVisitStatusEnum } from '@/types/api';

interface Props {
  status: number;
}

const statusConfig: Record<number, { label: string; className: string }> = {
  [ClinicalVisitStatusEnum.Open]: { label: 'مفتوحة', className: 'bg-blue-100 text-blue-700' },
  [ClinicalVisitStatusEnum.InProgress]: { label: 'قيد المعالجة', className: 'bg-yellow-100 text-yellow-700' },
  [ClinicalVisitStatusEnum.Completed]: { label: 'مكتملة', className: 'bg-green-100 text-green-700' },
  [ClinicalVisitStatusEnum.Cancelled]: { label: 'ملغية', className: 'bg-red-100 text-red-700' },
};

export default function ClinicalVisitStatusBadge({ status }: Props) {
  const config = statusConfig[status] || { label: String(status), className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
