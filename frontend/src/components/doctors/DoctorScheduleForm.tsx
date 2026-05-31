'use client';

import { useState } from 'react';
import { api } from '../../lib/api';
import type {
  DoctorWeeklyScheduleDto,
  CreateDoctorWeeklyScheduleRequest,
} from '../../types/api';

const DAYS = [
  { value: 0, label: 'السبت' },
  { value: 1, label: 'الأحد' },
  { value: 2, label: 'الاثنين' },
  { value: 3, label: 'الثلاثاء' },
  { value: 4, label: 'الأربعاء' },
  { value: 5, label: 'الخميس' },
  { value: 6, label: 'الجمعة' },
];

interface DoctorScheduleFormProps {
  doctorId: string;
  schedule: DoctorWeeklyScheduleDto | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function DoctorScheduleForm({ doctorId, schedule, onSave, onCancel }: DoctorScheduleFormProps) {
  const [form, setForm] = useState<CreateDoctorWeeklyScheduleRequest>({
    dayOfWeek: schedule?.dayOfWeek ?? 0,
    startTime: schedule?.startTime ?? '08:00',
    endTime: schedule?.endTime ?? '17:00',
    breakStartTime: schedule?.breakStartTime ?? null,
    breakEndTime: schedule?.breakEndTime ?? null,
    defaultAppointmentDurationMinutes: schedule?.defaultAppointmentDurationMinutes ?? 30,
    isAvailableForBooking: schedule?.isAvailableForBooking ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.put(`/doctors/${doctorId}/weekly-schedule`, form);
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
      >
        <h3 className="text-lg font-bold text-navy">
          {schedule ? 'تعديل جدول العمل' : 'إضافة جدول عمل'}
        </h3>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-4">
          {/* Day of Week - only show when creating */}
          {!schedule && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">اليوم</label>
              <select
                value={form.dayOfWeek}
                onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">وقت البداية</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">وقت النهاية</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">بداية الاستراحة</label>
              <input
                type="time"
                value={form.breakStartTime ?? ''}
                onChange={(e) => setForm({ ...form, breakStartTime: e.target.value || null })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">نهاية الاستراحة</label>
              <input
                type="time"
                value={form.breakEndTime ?? ''}
                onChange={(e) => setForm({ ...form, breakEndTime: e.target.value || null })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">مدة الموعد (دقيقة)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={form.defaultAppointmentDurationMinutes}
                onChange={(e) => setForm({ ...form, defaultAppointmentDurationMinutes: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isAvailableForBooking}
                  onChange={(e) => setForm({ ...form, isAvailableForBooking: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue focus:ring-blue"
                />
                <span className="text-sm font-medium text-gray-700">متاح للحجز</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue/90 disabled:opacity-50"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </form>
    </div>
  );
}
