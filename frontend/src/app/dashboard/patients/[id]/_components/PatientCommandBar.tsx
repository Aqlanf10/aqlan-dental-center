'use client';

import React, { useState } from 'react';
import {
  Stethoscope, FilePlus, Pill,
  Wallet, Receipt, Undo2,
  Camera, Paperclip, Printer, ChevronDown, Download
} from 'lucide-react';

export interface CommandBarActions {
  onNewSession?: () => void;
  onTreatmentPlan?: () => void;
  onPrescription?: () => void;
  onCollectPayment?: () => void;
  onNewInvoice?: () => void;
  onReturnNotice?: () => void;
  onUploadPhoto?: () => void;
  onUploadRadiograph?: () => void;
  onUploadDocument?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
}

interface PatientCommandBarProps extends CommandBarActions {
  userRole?: string;
  activeAction?: string | null;
}

export default function PatientCommandBar({
  userRole,
  activeAction,
  onNewSession,
  onTreatmentPlan,
  onPrescription,
  onCollectPayment,
  onNewInvoice,
  onReturnNotice,
  onUploadPhoto,
  onUploadRadiograph,
  onUploadDocument,
  onPrint,
  onExport,
}: PatientCommandBarProps) {
  const [showPrintMenu, setShowPrintMenu] = useState(false);


  // Role-based visibility
  const isAdmin = userRole === 'Admin';
  const isReception = userRole === 'Reception';
  const isDoctor = userRole === 'Doctor';
  const isAccountant = userRole === 'Accountant';

  const showFinance = isAdmin || isReception || isAccountant;
  const showClinic = isAdmin || isDoctor || isReception;

  const btnBase = 'flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all min-w-[72px] focus:outline-none focus:ring-2 focus:ring-[#3d7ab5]/40';
  const btnNormal = `${btnBase} hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300`;
  const btnActive = `${btnBase} bg-[#3d7ab5]/10 text-[#3d7ab5] dark:bg-sky-900/30 dark:text-sky-400 ring-1 ring-[#3d7ab5]/30`;

  const getBtnClass = (actionKey: string) =>
    activeAction === actionKey ? btnActive : btnNormal;

  const IconWrapper = 'p-2 rounded-md mb-0.5';

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 px-3 py-2 overflow-x-auto">
      <div className="flex items-start gap-2 min-w-max" dir="rtl">

        {/* ─── Clinic Group ─── */}
        {showClinic && (
          <div className="flex gap-1 pl-4 border-r border-slate-300 dark:border-slate-600">
            <button
              className={getBtnClass('newSession')}
              title="بدء جلسة سريرية جديدة"
              onClick={onNewSession}
            >
              <div className={`${IconWrapper} bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400`}>
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium font-[Tajawal]">جلسة جديدة</span>
            </button>
            <button
              className={getBtnClass('treatmentPlan')}
              title="إنشاء خطة علاج"
              onClick={onTreatmentPlan}
            >
              <div className={`${IconWrapper} bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400`}>
                <FilePlus className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium font-[Tajawal]">خطة علاج</span>
            </button>
            <button
              className={getBtnClass('prescription')}
              title="كتابة وصفة طبية"
              onClick={onPrescription}
            >
              <div className={`${IconWrapper} bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400`}>
                <Pill className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium font-[Tajawal]">وصفة طبية</span>
            </button>
          </div>
        )}

        {/* ─── Finance V3 Group ─── */}
        {showFinance && (
          <div className="flex gap-1 pl-4 border-r border-slate-300 dark:border-slate-600">
            <button
              className={getBtnClass('collectPayment')}
              title="تسجيل دفعة مالية"
              onClick={onCollectPayment}
            >
              <div className={`${IconWrapper} bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400`}>
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium font-[Tajawal]">قبض دفعة</span>
            </button>
            <button
              className={getBtnClass('newInvoice')}
              title="إنشاء فاتورة جديدة"
              onClick={onNewInvoice}
            >
              <div className={`${IconWrapper} bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400`}>
                <Receipt className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium font-[Tajawal]">فاتورة جديدة</span>
            </button>
            <button
              className={getBtnClass('returnNotice')}
              title="إصدار إشعار مرتجع / دائن"
              onClick={onReturnNotice}
            >
              <div className={`${IconWrapper} bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400`}>
                <Undo2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium font-[Tajawal]">إشعار مرتجع</span>
            </button>
          </div>
        )}

        {/* ─── Attachments Group ─── */}
        <div className="flex gap-1 pl-4 border-r border-slate-300 dark:border-slate-600 relative">
          <button
            className={getBtnClass('uploadPhoto')}
            title="إضافة صورة سريرية"
            onClick={onUploadPhoto}
          >
            <div className={`${IconWrapper} bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400`}>
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-[Tajawal]">صورة سريرية</span>
          </button>
          <button
            className={getBtnClass('uploadRadiograph')}
            title="رفع أشعة"
            onClick={onUploadRadiograph}
          >
            <div className={`${IconWrapper} bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400`}>
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-[Tajawal]">أشعة</span>
          </button>
          <button
            className={getBtnClass('uploadDocument')}
            title="إرفاق مستند"
            onClick={onUploadDocument}
          >
            <div className={`${IconWrapper} bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400`}>
              <Paperclip className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-[Tajawal]">مستند</span>
          </button>
        </div>

        {/* ─── Print Group ─── */}
        <div className="flex gap-1 relative">
          <button
            className={getBtnClass('print')}
            title="طباعة ملخص المريض"
            onClick={() => {
              setShowPrintMenu(false);
              onPrint?.();
            }}
          >
            <div className={`${IconWrapper} bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300`}>
              <Printer className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-[Tajawal]">طباعة</span>
          </button>
          <button
            className={btnNormal}
            title="المزيد من خيارات الطباعة"
            onClick={() => setShowPrintMenu(!showPrintMenu)}
          >
            <div className={`${IconWrapper} bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1`}>
              <ChevronDown className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-[Tajawal]">المزيد</span>
          </button>

          {/* Dropdown Print Menu */}
          {showPrintMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPrintMenu(false)} />
              <div className="absolute top-full right-0 mt-1 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 py-1">
                <button
                  onClick={() => { setShowPrintMenu(false); onPrint?.(); }}
                  className="w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 font-[Tajawal] flex items-center gap-2"
                >
                  <Printer className="w-4 h-4 text-slate-400" />
                  طباعة ملخص المريض
                </button>
                <button
                  onClick={() => setShowPrintMenu(false)}
                  className="w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 font-[Tajawal] flex items-center gap-2"
                >
                  <Printer className="w-4 h-4 text-slate-400" />
                  طباعة كشف مالي
                </button>
                <button
                  onClick={() => setShowPrintMenu(false)}
                  className="w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 font-[Tajawal] flex items-center gap-2"
                >
                  <Printer className="w-4 h-4 text-slate-400" />
                  طباعة وصفة طبية
                </button>
                <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                <button
                  onClick={() => { setShowPrintMenu(false); onExport?.(); }}
                  className="w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 font-[Tajawal] flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  تصدير PDF
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
