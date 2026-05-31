'use client';

import { ClinicalProcedureTypeEnum } from '@/types/api';

const typeLabels: Record<number, string> = {
  [ClinicalProcedureTypeEnum.Consultation]: 'استشارة',
  [ClinicalProcedureTypeEnum.Filling]: 'حشوة',
  [ClinicalProcedureTypeEnum.Extraction]: 'خلع',
  [ClinicalProcedureTypeEnum.Scaling]: 'تنظيف',
  [ClinicalProcedureTypeEnum.RootCanal]: 'علاج عصب',
  [ClinicalProcedureTypeEnum.Crown]: 'تلبيسة',
  [ClinicalProcedureTypeEnum.Prosthodontic]: 'تعويضات',
  [ClinicalProcedureTypeEnum.Other]: 'أخرى',
};

const typeColors: Record<number, string> = {
  [ClinicalProcedureTypeEnum.Consultation]: 'bg-blue-100 text-blue-700',
  [ClinicalProcedureTypeEnum.Filling]: 'bg-amber-100 text-amber-700',
  [ClinicalProcedureTypeEnum.Extraction]: 'bg-red-100 text-red-700',
  [ClinicalProcedureTypeEnum.Scaling]: 'bg-cyan-100 text-cyan-700',
  [ClinicalProcedureTypeEnum.RootCanal]: 'bg-purple-100 text-purple-700',
  [ClinicalProcedureTypeEnum.Crown]: 'bg-emerald-100 text-emerald-700',
  [ClinicalProcedureTypeEnum.Prosthodontic]: 'bg-pink-100 text-pink-700',
  [ClinicalProcedureTypeEnum.Other]: 'bg-gray-100 text-gray-700',
};

interface Props {
  procedureType: number;
}

export default function ClinicalProcedureTypeBadge({ procedureType }: Props) {
  const label = typeLabels[procedureType] || 'غير معروف';
  const color = typeColors[procedureType] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
