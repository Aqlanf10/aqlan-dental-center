'use client';

import React, { useState } from 'react';
import {
  Stethoscope, FilePlus, Pill,
  Wallet, Receipt, Undo2,
  Camera, Paperclip, Printer, ChevronDown,
} from 'lucide-react';

export default function PatientCommandBar() {
  const [showPrintMenu, setShowPrintMenu] = useState(false);

  const ButtonStyle =
    'flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[72px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3d7ab5]/40';
  const IconWrapper = 'p-2 rounded-md mb-0.5';

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 px-3 py-2 overflow-x-auto">
      <div className="flex items-start gap-2 min-w-max" dir="rtl">

        {/* ─── مجموعة العيادة ─── */}
        <div className="flex gap-1 pl-4 border-r border-slate-300 dark:border-slate-600">
          <button className={ButtonStyle} title="بدء جلسة سريرية جديدة">
            <div className={`${IconWrapper} bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400`}>
              <Stethoscope className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-[Tajawal]">جلسة جديدة</span>
          </button>
          <button className={ButtonStyle} title="إنشاء خطة علاج">
            <div className={`${IconWrapper} bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400`}>
              <FilePlus className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-[Tajawal]">خطة علاج</span>
          </button>
          <button className={ButtonStyle} title="كتابة وصفة طبية">
            <div className={`${IconWrapper} bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400`}>
              <Pill className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-[Tajawal]">وصفة طبية</span>
          </button>
        </div>

        {/* ─── مجموعة المالية V3 ─── */}
        <div className="flex gap-1 pl-4 border-r border-slate-300 dark:border-slate-600">
          <button className={ButtonStyle} title="تسجيل دفعة مالية">
            <div className={`${IconWrapper} bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400`}>
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-[Tajawal]">قبض دفعة</span>
          </button>
          <button className={ButtonStyle} title="إنشاء فاتورة جديدة">
            <div className={`${IconWrapper} bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400`}>
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-[Tajawal]">فاتورة جديدة</span>
          </button>
          <button className={ButtonStyle} title="إصدار إشعار مرتجع / دائن">
            <div className={`${IconWrapper} bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400`}>
              <Undo2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-[Tajawal]">إشعار مرتجع</span>
          </button>
        </div>

        {/* ─── مجموعة المرفقات ─── */}
        <div className="flex gap-1 pl-4 border-r border-slate-300 dark:border-slate-600">
          <button className={ButtonStyle} title="إضافة صورة أو أشعة">
            <div className={`${IconWrapper} bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400`}>
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-[Tajawal]">صورة/أشعة</span>
          </button>
          <button className={ButtonStyle} title="إرفاق ملف أو مستند">
            <div className={`${IconWrapper} bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400`}>
              <Paperclip className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium font-[Tajawal]">إرفاق ملف</span>
          </button>
        </div>

        {/* ─── مجموعة الطباعة ─── */}
        <div className="flex gap-1 relative">
          <button
            className={ButtonStyle}
            title="طباعة وتصدير"
            onClick={() => setShowPrintMenu(!showPrintMenu)}
          >
            <div className={`${IconWrapper} bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1`}>
              <Printer className="w-5 h-5" />
              <ChevronDown className="w-3 h-3" />
            </div>
            <span className="text-[10px] font-medium font-[Tajawal]">طباعة وتصدير</span>
          </button>

          {/* قائمة الطباعة المنسدلة */}
          {showPrintMenu && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 py-1">
              <button className="w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 font-[Tajawal]">
                طباعة ملخص المريض
              </button>
              <button className="w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 font-[Tajawal]">
                طباعة كشف مالي
              </button>
              <button className="w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 font-[Tajawal]">
                طباعة وصفة طبية
              </button>
              <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
              <button className="w-full text-right px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 font-[Tajawal]">
                تصدير PDF
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
