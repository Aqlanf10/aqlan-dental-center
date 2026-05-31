'use client';

import { DailyVisitDto, DailyVisitStatusEnum } from '@/types/api';
import DailyVisitStatusBadge from './DailyVisitStatusBadge';

interface Props {
  visit: DailyVisitDto;
  onStatusChange: (visitId: string, newStatus: number) => void;
  onCancel: (visitId: string) => void;
  canEdit: boolean;
  isDoctor: boolean;
}

const statusFlow: { value: number; label: string }[] = [
  { value: DailyVisitStatusEnum.CheckedIn, label: 'وصل' },
  { value: DailyVisitStatusEnum.Waiting, label: 'في الانتظار' },
  { value: DailyVisitStatusEnum.ReadyForDoctor, label: 'جاهز للطبيب' },
  { value: DailyVisitStatusEnum.InProgress, label: 'قيد المعالجة' },
  { value: DailyVisitStatusEnum.Completed, label: 'مكتمل' },
];

const terminalStatuses = new Set<number>([
  DailyVisitStatusEnum.Completed,
  DailyVisitStatusEnum.Cancelled,
  DailyVisitStatusEnum.NoShow,
]);

export default function DailyVisitCard({ visit, onStatusChange, onCancel, canEdit, isDoctor }: Props) {
  const isTerminal = terminalStatuses.has(visit.status);
  const isWalkIn = visit.visitType === 1;

  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${isTerminal ? 'opacity-70' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-navy">{visit.patientName}</h3>
            {visit.patientNumber && (
              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                {visit.patientNumber}
              </span>
            )}
            {isWalkIn && (
              <span className="shrink-0 rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-600">
                بدون موعد
              </span>
            )}
          </div>
          {visit.doctorName && (
            <p className="mt-0.5 text-sm text-gray-500">د. {visit.doctorName}</p>
          )}
        </div>
        <DailyVisitStatusBadge status={visit.status} />
      </div>

      {/* Details */}
      <div className="mt-3 space-y-1 text-sm text-gray-600">
        {visit.arrivalTime && (
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>وقت الوصول: {visit.arrivalTime}</span>
          </div>
        )}
        {visit.chiefComplaint && (
          <div className="flex items-start gap-1.5">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="line-clamp-2">{visit.chiefComplaint}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {canEdit && !isTerminal && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {statusFlow
              .filter(s => s.value !== visit.status)
              .map(s => (
                <button
                  key={s.value}
                  onClick={() => onStatusChange(visit.id, s.value)}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-navy"
                >
                  {s.label}
                </button>
              ))}
          </div>
          {visit.status !== DailyVisitStatusEnum.Cancelled && (
            <button
              onClick={() => onCancel(visit.id)}
              className="mt-2 text-xs font-medium text-red-500 hover:text-red-700"
            >
              إلغاء الزيارة
            </button>
          )}
        </div>
      )}

      {/* Doctor future actions */}
      {isDoctor && !isTerminal && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              disabled
              className="cursor-not-allowed rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-400"
              title="قريبًا"
            >
              فتح الزيارة السريرية — قريبًا
            </button>
            <button
              disabled
              className="cursor-not-allowed rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-400"
              title="قريبًا"
            >
              إرسال للطابور — قريبًا
            </button>
          </div>
        </div>
      )}

      {/* Future actions for reception/admin */}
      {canEdit && !isTerminal && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            disabled
            className="cursor-not-allowed rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-400"
            title="قريبًا"
          >
            الدفع / الخروج — قريبًا
          </button>
        </div>
      )}
    </div>
  );
}
