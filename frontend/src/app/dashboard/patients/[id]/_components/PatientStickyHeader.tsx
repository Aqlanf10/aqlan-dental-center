'use client';

import React, { useEffect, useState } from 'react';
import {
  User, Phone, AlertTriangle, ArrowRight, Edit, Trash2,
  Printer, MessageCircle, Calendar
} from 'lucide-react';
import { api } from '../../../../../lib/api';
import type { PatientDto, PatientFinanceSummaryDto, MedicalHistoryDto } from '../../../../../types/api';

interface Props {
  patient: PatientDto;
  financeSummary?: PatientFinanceSummaryDto | null;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
  onPrint?: () => void;
}

export default function PatientStickyHeader({
  patient,
  financeSummary,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onBack,
  onPrint,
}: Props) {
  const [allergies, setAllergies] = useState<string[]>([]);

  // Fetch medical history for allergies alerts
  useEffect(() => {
    async function loadAllergies() {
      try {
        const res = await api.get<MedicalHistoryDto>(`/patients/${patient.id}/medical-history`);
        const alerts: string[] = [];
        if (res.data?.drugAllergies) {
          res.data.drugAllergies.split(',').forEach(a => {
            const trimmed = a.trim();
            if (trimmed) alerts.push(trimmed);
          });
        }
        if (res.data?.bleedingDisorders) alerts.push('اضطرابات نزيف');
        if (res.data?.isPregnant === 'yes') alerts.push('حامل');
        setAllergies(alerts);
      } catch {
        // silent
      }
    }
    loadAllergies();
  }, [patient.id]);

  // Calculate age from DOB
  const age = patient.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  // Financial balance
  const balance = financeSummary?.totalOutstanding ?? 0;

  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;

  return (
    <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm px-4 py-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">

        {/* Right Section: Patient Info */}
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="العودة"
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Patient Avatar */}
          <div className="bg-[#3d7ab5]/10 dark:bg-sky-900/50 p-2.5 rounded-full text-[#3d7ab5] dark:text-sky-400">
            <User className="w-5 h-5" />
          </div>

          {/* Name and Data */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#1a3a5c] dark:text-slate-100 font-[Tajawal]">
                {patient.fullName}
              </h1>
              <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                {patient.patientNumber}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
              {age !== null && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {age} سنة
                </span>
              )}
              {patient.genderDisplay && (
                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                  {patient.genderDisplay}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span dir="ltr">{patient.phoneNumber}</span>
              </span>
              {patient.whatsAppNumber && (
                <span className="flex items-center gap-1 text-green-600">
                  <MessageCircle className="w-3 h-3" />
                  <span dir="ltr">{patient.whatsAppNumber}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Left Section: Alerts + Finance + Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Allergy Alerts */}
          {allergies.map((alert, index) => (
            <span
              key={index}
              className="flex items-center gap-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-md text-xs font-medium border border-red-100 dark:border-red-800"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> {alert}
            </span>
          ))}

          {/* Balance Alert */}
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
                ? `مديونية: ${formatCurrency(balance)}`
                : 'لا توجد مديونية'}
            </span>
          </div>

          {/* Quick Action Buttons */}
          {patient.phoneNumber && (
            <a
              href={`tel:${patient.phoneNumber}`}
              className="inline-flex items-center gap-1 rounded-lg border border-[#3d7ab5]/30 px-2.5 py-1.5 text-xs font-medium text-[#3d7ab5] transition-colors hover:bg-[#3d7ab5]/5"
              title="اتصال هاتفي"
            >
              <Phone className="w-3.5 h-3.5" />
              اتصال
            </a>
          )}
          {patient.whatsAppNumber && (
            <a
              href={`https://wa.me/${patient.whatsAppNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-2.5 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-50"
              title="واتساب"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              واتساب
            </a>
          )}
          {onPrint && (
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              title="طباعة"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          )}
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
    </div>
  );
}
