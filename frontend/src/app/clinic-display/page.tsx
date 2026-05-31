'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PublicClinicDisplayDto } from '../../types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ClinicDisplayPage() {
  const [data, setData] = useState<PublicClinicDisplayDto | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchDisplay = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/public/clinic-display/today`);
      if (!res.ok) throw new Error('فشل في تحميل البيانات');
      const json = await res.json();
      setData(json.data ?? json);
      setError(null);
    } catch {
      setError('فشل في الاتصال بالخادم');
    }
  }, []);

  useEffect(() => {
    fetchDisplay();
    const interval = setInterval(fetchDisplay, 8000);
    return () => clearInterval(interval);
  }, [fetchDisplay]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0: // Waiting
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-500/20 px-3 py-1 text-sm font-bold text-yellow-300">
            في الانتظار
          </span>
        );
      case 1: // Called
        return (
          <span className="inline-flex items-center rounded-full bg-orange/30 px-3 py-1 text-sm font-bold text-orange animate-pulse">
            تم النداء
          </span>
        );
      case 2: // InRoom
        return (
          <span className="inline-flex items-center rounded-full bg-green-500/20 px-3 py-1 text-sm font-bold text-green-400">
            داخل الغرفة
          </span>
        );
      default:
        return null;
    }
  };

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy p-8">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-4 text-2xl text-red-300">{error}</p>
          <button
            onClick={fetchDisplay}
            className="mt-6 rounded-lg bg-blue px-6 py-3 text-lg font-bold text-white transition-colors hover:bg-blue/80"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const activeItems = (data?.queueItems ?? []).filter(
    (item) => item.status === 0 || item.status === 1 || item.status === 2
  );

  return (
    <div className="min-h-screen bg-navy-dark text-white" dir="rtl">
      {/* Header */}
      <header className="bg-navy px-8 py-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-wide">
              {data?.clinicName || 'مركز الدكتور عقلان الكامل'}
            </h1>
            <p className="mt-1 text-lg text-blue-200">
              {data ? formatDate(new Date(data.date)) : formatDate(currentTime)}
            </p>
          </div>
          <div className="text-left">
            <p className="text-3xl font-bold tabular-nums" dir="ltr">
              {formatTime(currentTime)}
            </p>
          </div>
        </div>
      </header>

      {/* Currently Called — Highlighted */}
      {data?.currentlyCalled && (
        <div className="mx-8 mt-6 rounded-2xl bg-gradient-to-l from-orange to-orange/80 p-8 shadow-2xl animate-pulse-slow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold text-white/80">يتم النداء الآن</p>
              <p className="mt-2 text-5xl font-extrabold text-white">
                {data.currentlyCalled.patientDisplayName}
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg text-white/70">رقم الطابور</p>
              <p className="mt-1 text-7xl font-black text-white">
                {data.currentlyCalled.queueNumber}
              </p>
            </div>
            {data.currentlyCalled.roomName && (
              <div className="rounded-xl bg-white/20 px-8 py-4">
                <p className="text-lg text-white/70">الغرفة</p>
                <p className="mt-1 text-3xl font-bold text-white">
                  {data.currentlyCalled.roomName}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="mx-8 mt-6 grid grid-cols-4 gap-4">
        <StatCard label="في الانتظار" value={data?.waitingCount ?? 0} color="bg-yellow-500/20 text-yellow-300" />
        <StatCard label="تم النداء" value={data?.calledCount ?? 0} color="bg-orange/20 text-orange" />
        <StatCard label="داخل الغرفة" value={data?.inRoomCount ?? 0} color="bg-green-500/20 text-green-400" />
        <StatCard label="مكتمل" value={data?.completedCount ?? 0} color="bg-blue-500/20 text-blue-300" />
      </div>

      {/* Queue List */}
      <div className="mx-8 mt-6 mb-8">
        <h2 className="mb-4 text-2xl font-bold text-blue-200">قائمة الانتظار</h2>
        {activeItems.length === 0 ? (
          <div className="rounded-xl bg-navy/50 py-16 text-center">
            <p className="text-2xl text-gray-400">لا يوجد مرضى في الانتظار حاليًا</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeItems.map((item) => (
              <div
                key={`${item.queueNumber}-${item.patientDisplayName}`}
                className="flex items-center justify-between rounded-xl bg-navy/60 px-6 py-4 backdrop-blur"
              >
                <div className="flex items-center gap-5">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue/30 text-2xl font-bold text-white">
                    {item.queueNumber}
                  </span>
                  <div>
                    <p className="text-xl font-bold text-white">{item.patientDisplayName}</p>
                    {item.roomName && (
                      <p className="text-sm text-blue-300">{item.roomName}</p>
                    )}
                  </div>
                </div>
                {getStatusBadge(item.status)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-navy/80 px-8 py-3 text-center text-sm text-gray-400">
        يتم التحديث تلقائيًا كل ٨ ثوانٍ
      </footer>

      {/* Custom animation */}
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex items-center gap-4 rounded-xl px-6 py-4 ${color}`}>
      <span className="text-4xl font-black">{value}</span>
      <span className="text-lg font-bold">{label}</span>
    </div>
  );
}
