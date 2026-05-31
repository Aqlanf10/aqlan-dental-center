'use client';

import { ClinicalVisitDto } from '@/types/api';
import ClinicalVisitStatusBadge from './ClinicalVisitStatusBadge';

interface Props {
  visit: ClinicalVisitDto;
  onSelect: (visit: ClinicalVisitDto) => void;
}

export default function ClinicalVisitCard({ visit, onSelect }: Props) {
  return (
    <div
      className="cursor-pointer rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      onClick={() => onSelect(visit)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-navy">{visit.patientName}</h3>
            {visit.patientNumber && (
              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                {visit.patientNumber}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            {visit.doctorName && <span>د. {visit.doctorName}</span>}
            <span>•</span>
            <span>{new Date(visit.startedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <ClinicalVisitStatusBadge status={visit.status} />
      </div>

      {visit.chiefComplaint && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{visit.chiefComplaint}</p>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
        {visit.diagnosis && <span className="text-green-600">✓ تشخيص</span>}
        {visit.prescriptions.length > 0 && <span className="text-blue-600">💊 {visit.prescriptions.length} وصفة</span>}
        {visit.nextVisitRecommended && <span className="text-orange-600">📅 زيارة قادمة</span>}
      </div>
    </div>
  );
}
