'use client';

import { ClinicQueueItemDto, QueueStatusEnum } from '@/types/api';
import { QueuePriorityBadge, QueueStatusBadge } from './QueueBadges';

interface Props {
  item: ClinicQueueItemDto;
  onCall: (id: string) => void;
  onEnterRoom: (id: string) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onChangePriority: (id: string, priority: number) => void;
  onOpenClinicalVisit: (dailyVisitId: string) => void;
  canEdit: boolean;
  isDoctor: boolean;
}

const terminalStatuses = new Set<number>([
  QueueStatusEnum.Completed,
  QueueStatusEnum.Cancelled,
  QueueStatusEnum.NoShow,
]);

export default function QueueItemCard({ item, onCall, onEnterRoom, onComplete, onCancel, onChangePriority, onOpenClinicalVisit, canEdit, isDoctor }: Props) {
  const isTerminal = terminalStatuses.has(item.status);

  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${isTerminal ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
              {item.queueNumber}
            </span>
            <h3 className="truncate font-semibold text-navy">{item.patientName}</h3>
            {item.patientNumber && (
              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                {item.patientNumber}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            {item.doctorName && <span>د. {item.doctorName}</span>}
            {item.roomName && <span>• غرفة: {item.roomName}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <QueueStatusBadge status={item.status} />
          <QueuePriorityBadge priority={item.priority} />
        </div>
      </div>

      {item.notes && (
        <p className="mt-2 text-xs text-gray-400">{item.notes}</p>
      )}

      {canEdit && !isTerminal && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3">
          {item.status === QueueStatusEnum.Waiting && (
            <button
              onClick={() => onCall(item.id)}
              className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              نداء المريض
            </button>
          )}
          {(item.status === QueueStatusEnum.Waiting || item.status === QueueStatusEnum.Called) && (
            <button
              onClick={() => onEnterRoom(item.id)}
              className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
            >
              دخول الغرفة
            </button>
          )}
          {(item.status === QueueStatusEnum.InRoom || item.status === QueueStatusEnum.InProgress) && (
            <button
              onClick={() => onComplete(item.id)}
              className="rounded-md bg-gray-600 px-3 py-1 text-xs font-medium text-white hover:bg-gray-700"
            >
              إكمال
            </button>
          )}
          <select
            value={item.priority}
            onChange={(e) => onChangePriority(item.id, parseInt(e.target.value))}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs"
          >
            <option value={0}>عادي</option>
            <option value={1}>عاجل</option>
            <option value={2}>VIP</option>
            <option value={3}>طوارئ</option>
          </select>
          <button
            onClick={() => onCancel(item.id)}
            className="text-xs font-medium text-red-500 hover:text-red-700"
          >
            إلغاء
          </button>
        </div>
      )}

      {!isTerminal && (item.status === QueueStatusEnum.InRoom || item.status === QueueStatusEnum.InProgress) && (canEdit || isDoctor) && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <button
            onClick={() => onOpenClinicalVisit(item.dailyVisitId)}
            className="rounded-md bg-orange px-3 py-1 text-xs font-medium text-white hover:bg-orange-600"
          >
            فتح الزيارة السريرية
          </button>
        </div>
      )}
    </div>
  );
}
