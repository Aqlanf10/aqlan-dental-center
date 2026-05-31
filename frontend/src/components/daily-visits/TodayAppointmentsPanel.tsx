'use client';

import { useState } from 'react';
import { AppointmentDto } from '@/types/api';

interface Props {
  appointment: AppointmentDto;
  onCheckIn: (appointmentId: string, chiefComplaint: string, notes: string) => void;
  onNoShow: (appointmentId: string) => void;
  isCheckedIn: boolean;
  canEdit: boolean;
}

function appointmentStatusDisplay(status: number): string {
  const labels: Record<number, string> = { 0: 'مجدول', 1: 'مؤكد', 2: 'مكتمل', 3: 'ملغي', 4: 'لم يحضر' };
  return labels[status] || status.toString();
}

export default function TodayAppointmentsPanel({ appointment, onCheckIn, onNoShow, isCheckedIn, canEdit }: Props) {
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [notes, setNotes] = useState('');

  const isCancelled = appointment.status === 3;
  const isNoShow = appointment.status === 4;
  const isDisabled = isCancelled || isNoShow || isCheckedIn;

  const handleCheckIn = () => {
    onCheckIn(appointment.id, chiefComplaint, notes);
    setShowCheckInForm(false);
    setChiefComplaint('');
    setNotes('');
  };

  const statusLabel = appointmentStatusDisplay(appointment.status);

  return (
    <div className={`rounded-lg border bg-white p-3 shadow-sm ${isDisabled ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-navy">{appointment.patientName}</span>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
              {appointment.startTime}
            </span>
          </div>
          <p className="text-sm text-gray-500">د. {appointment.doctorName}</p>
          <p className="text-xs text-gray-400">{appointment.serviceType}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          appointment.status === 0 ? 'bg-blue-50 text-blue-700' :
          appointment.status === 1 ? 'bg-green-50 text-green-700' :
          appointment.status === 3 ? 'bg-red-50 text-red-700' :
          appointment.status === 4 ? 'bg-orange-50 text-orange-700' :
          'bg-gray-50 text-gray-700'
        }`}>
          {statusLabel}
        </span>
      </div>

      {isCheckedIn && (
        <div className="mt-2 text-xs font-medium text-green-600">
          تم تسجيل الوصول
        </div>
      )}

      {canEdit && !isDisabled && !showCheckInForm && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setShowCheckInForm(true)}
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
          >
            تسجيل وصول
          </button>
          <button
            onClick={() => onNoShow(appointment.id)}
            className="rounded-md border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-50"
          >
            لم يحضر
          </button>
        </div>
      )}

      {showCheckInForm && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">الشكوى الرئيسية</label>
            <input
              type="text"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="اختياري..."
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">ملاحظات</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اختياري..."
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCheckIn}
              className="rounded-md bg-green-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
            >
              تأكيد الوصول
            </button>
            <button
              onClick={() => { setShowCheckInForm(false); setChiefComplaint(''); setNotes(''); }}
              className="rounded-md border border-gray-200 px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
