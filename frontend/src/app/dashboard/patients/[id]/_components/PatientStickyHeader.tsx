'use client';

import React from 'react';
import { User, Phone, AlertTriangle, ArrowRight, Edit, Trash2 } from 'lucide-react';
import type { PatientDto, PatientFinanceSummaryDto } from '../../../../../types/api';

interface Props {
  patient: PatientDto;
  financeSummary?: PatientFinanceSummaryDto | null;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export default function PatientStickyHeader({ patient, financeSummary, canEdit, canDelete, onEdit, onDelete, onBack }: Props) {
  // استخراج العمر من تاريخ الميلاد
  const age = patient.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  // التنبيهات الطبية من التاريخ المرضي
  const alerts: string[] = [];
  // يمكن إضافة منطق استخراج التنبيهات من بيانات المريض لاحقاً

  // الرصيد المالي
  const balance = financeSummary?.totalOutstanding ?? 0;

  return (
    <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm px-4 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
      
      {/* القسم الأيمن: معلومات المريض الأساسية */}
      <div className="flex items-center gap-3">
        {/* زر العودة */}
        <button
          onClick={onBack}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="العودة"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* أيقونة المريض */}
        <div className="bg-[#3d7ab5]/10 dark:bg-sky-900/50 p-2.5 rounded-full text-[#3d7ab5] dark:text-sky-400">
          <User className="w-5 h-5" />
        </div>

        {/* الاسم والبيانات */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#1a3a5c] dark:text-slate-100 font-[Tajawal]">
              {patient.fullName}
            </h1>
            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              {patient.patientNumber}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {age !== null && <span>{age} سنة</span>}
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span dir="ltr">{patient.phoneNumber}</span>
            </span>
            {patient.genderDisplay && (
              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                {patient.genderDisplay}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* القسم الأيسر: التنبيهات + المالية + الإجراءات */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* تنبيهات طبية */}
        {alerts.map((alert, index) => (
          <span
            key={index}
            className="flex items-center gap-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-md text-xs font-medium border border-red-100 dark:border-red-800"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> {alert}
          </span>
        ))}

        {/* الرصيد المالي */}
        <div
          className={`px-3 py-1.5 rounded-lg border font-bold text-xs flex flex-col items-center justify-center ${
            balance > 0
              ? 'bg-orange-50 border-orange-200 text-orange-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <span className="text-[10px] font-normal opacity-70">الرصيد المالي</span>
          <span>
            {balance > 0
              ? `مديونية: ${balance.toLocaleString()} ر.ي`
              : 'لا توجد مديونية'}
          </span>
        </div>

        {/* أزرار الإجراءات السريعة */}
        {canEdit && (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded-lg bg-[#3d7ab5] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#3d7ab5]/90"
          >
            <Edit className="w-3.5 h-3.5" />
            تعديل
          </button>
        )}
        {canDelete && (
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            حذف
          </button>
        )}
      </div>
    </div>
  );
}
