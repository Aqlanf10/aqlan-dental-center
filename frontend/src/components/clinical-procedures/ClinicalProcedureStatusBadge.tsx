'use client';

import { ClinicalProcedureStatusEnum } from '@/types/api';

const statusLabels: Record<number, string> = {
  [ClinicalProcedureStatusEnum.Planned]: 'مخطط',
  [ClinicalProcedureStatusEnum.InProgress]: 'قيد التنفيذ',
  [ClinicalProcedureStatusEnum.Completed]: 'مكتمل',
  [ClinicalProcedureStatusEnum.Cancelled]: 'ملغي',
};

const statusColors: Record<number, string> = {
  [ClinicalProcedureStatusEnum.Planned]: 'bg-gray-100 text-gray-700',
  [ClinicalProcedureStatusEnum.InProgress]: 'bg-blue-100 text-blue-700',
  [ClinicalProcedureStatusEnum.Completed]: 'bg-green-100 text-green-700',
  [ClinicalProcedureStatusEnum.Cancelled]: 'bg-red-100 text-red-700',
};

interface Props {
  status: number;
}

export default function ClinicalProcedureStatusBadge({ status }: Props) {
  const label = statusLabels[status] || 'غير معروف';
  const color = statusColors[status] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
