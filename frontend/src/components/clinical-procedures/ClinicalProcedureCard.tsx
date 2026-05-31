'use client';

import { ClinicalProcedureDto, ClinicalProcedureStatusEnum } from '@/types/api';
import ClinicalProcedureTypeBadge from './ClinicalProcedureTypeBadge';
import ClinicalProcedureStatusBadge from './ClinicalProcedureStatusBadge';

interface Props {
  procedure: ClinicalProcedureDto;
  canEdit: boolean;
  isVisitActive: boolean;
  onEdit: (procedure: ClinicalProcedureDto) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: number) => void;
}

export default function ClinicalProcedureCard({ procedure, canEdit, isVisitActive, onEdit, onDelete, onStatusChange }: Props) {
  const canModify = canEdit && isVisitActive;
  const canChangeStatus = canModify && procedure.status !== ClinicalProcedureStatusEnum.Completed && procedure.status !== ClinicalProcedureStatusEnum.Cancelled;

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <ClinicalProcedureTypeBadge procedureType={procedure.procedureType} />
            <ClinicalProcedureStatusBadge status={procedure.status} />
          </div>
          <p className="font-medium text-navy text-sm">{procedure.title}</p>
          {(procedure.toothNumber || procedure.toothSurface) && (
            <div className="flex gap-2 text-xs text-gray-500 mt-1">
              {procedure.toothNumber && <span>السن: {procedure.toothNumber}</span>}
              {procedure.toothSurface && <span>السطح: {procedure.toothSurface}</span>}
            </div>
          )}
          {procedure.description && <p className="text-xs text-gray-600 mt-1">{procedure.description}</p>}
          {procedure.clinicalNotes && <p className="text-xs text-gray-400 mt-1">ملاحظات: {procedure.clinicalNotes}</p>}
        </div>
        {canModify && (
          <div className="flex flex-col gap-1 text-xs">
            {canChangeStatus && (
              <>
                {procedure.status === ClinicalProcedureStatusEnum.Planned && (
                  <button onClick={() => onStatusChange(procedure.id, ClinicalProcedureStatusEnum.InProgress)} className="text-blue-600 hover:underline">بدء</button>
                )}
                {procedure.status === ClinicalProcedureStatusEnum.Planned && (
                  <button onClick={() => onStatusChange(procedure.id, ClinicalProcedureStatusEnum.Completed)} className="text-green-600 hover:underline">إكمال</button>
                )}
                {procedure.status === ClinicalProcedureStatusEnum.InProgress && (
                  <button onClick={() => onStatusChange(procedure.id, ClinicalProcedureStatusEnum.Completed)} className="text-green-600 hover:underline">إكمال</button>
                )}
                {procedure.status !== ClinicalProcedureStatusEnum.Cancelled && (
                  <button onClick={() => onStatusChange(procedure.id, ClinicalProcedureStatusEnum.Cancelled)} className="text-red-500 hover:underline">إلغاء</button>
                )}
              </>
            )}
            {procedure.status !== ClinicalProcedureStatusEnum.Completed && procedure.status !== ClinicalProcedureStatusEnum.Cancelled && (
              <button onClick={() => onEdit(procedure)} className="text-blue-600 hover:underline">تعديل</button>
            )}
            <button onClick={() => onDelete(procedure.id)} className="text-red-500 hover:underline">حذف</button>
          </div>
        )}
      </div>
    </div>
  );
}
