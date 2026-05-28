'use client';

import { AppointmentStatusEnum } from '../../types/api';

const statusLabels: Record<number, string> = {
  [AppointmentStatusEnum.Scheduled]: 'مجدول',
  [AppointmentStatusEnum.Confirmed]: 'مؤكد',
  [AppointmentStatusEnum.Completed]: 'مكتمل',
  [AppointmentStatusEnum.Cancelled]: 'ملغي',
  [AppointmentStatusEnum.NoShow]: 'لم يحضر',
};

interface StatusSelectProps {
  currentStatus: number;
  onStatusChange: (status: number) => void;
  disabled?: boolean;
}

export default function StatusSelect({ currentStatus, onStatusChange, disabled }: StatusSelectProps) {
  const statusEntries = Object.entries(AppointmentStatusEnum) as [string, number][];

  return (
    <select
      value={currentStatus}
      onChange={(e) => onStatusChange(Number(e.target.value))}
      disabled={disabled}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {statusEntries.map(([key, value]) => (
        <option key={key} value={value}>
          {statusLabels[value]}
        </option>
      ))}
    </select>
  );
}
