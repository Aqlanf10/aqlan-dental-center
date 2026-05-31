'use client';

import { useState, useEffect, useCallback } from 'react';
import { TodayQueueDto, ClinicRoomDto, QueueStatusEnum } from '@/types/api';
import { api } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthContext';
import QueueStats from './QueueStats';
import QueueItemCard from './QueueItemCard';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'حدث خطأ غير متوقع';
}

type FilterTab = 'all' | 'waiting' | 'called' | 'inRoom' | 'completed';

const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'waiting', label: 'في الانتظار' },
  { key: 'called', label: 'تم النداء' },
  { key: 'inRoom', label: 'داخل الغرفة' },
  { key: 'completed', label: 'مكتمل / ملغي' },
];

export default function ClinicQueueBoard() {
  const { user } = useAuth();
  const [data, setData] = useState<TodayQueueDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [enterRoomModal, setEnterRoomModal] = useState<{ queueItemId: string; rooms: ClinicRoomDto[] } | null>(null);

  const userRole = user?.role || '';
  const canEdit = ['Admin', 'Reception'].includes(userRole);
  const isDoctor = userRole === 'Doctor';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<TodayQueueDto>(`/clinic-queue/today?date=${selectedDate}`);
      setData(res.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredItems = (data?.queueItems || []).filter(item => {
    switch (activeTab) {
      case 'waiting': return item.status === QueueStatusEnum.Waiting;
      case 'called': return item.status === QueueStatusEnum.Called;
      case 'inRoom': return item.status === QueueStatusEnum.InRoom || item.status === QueueStatusEnum.InProgress;
      case 'completed': return item.status === QueueStatusEnum.Completed || item.status === QueueStatusEnum.Cancelled;
      default: return true;
    }
  });

  const handleCall = async (id: string) => {
    try {
      await api.post(`/clinic-queue/${id}/call`, { notes: null });
      await fetchData();
    } catch (err: unknown) { alert(getErrorMessage(err)); }
  };

  const handleEnterRoom = async (id: string) => {
    if (!data) return;
    const availableRooms = data.rooms.filter(r => !r.isOccupied);
    setEnterRoomModal({ queueItemId: id, rooms: availableRooms });
  };

  const confirmEnterRoom = async (roomId: string) => {
    if (!enterRoomModal) return;
    try {
      await api.post(`/clinic-queue/${enterRoomModal.queueItemId}/enter-room`, { roomId });
      setEnterRoomModal(null);
      await fetchData();
    } catch (err: unknown) { alert(getErrorMessage(err)); }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('هل أنت متأكد من إكمال هذا العنصر؟')) return;
    try {
      await api.post(`/clinic-queue/${id}/complete`);
      await fetchData();
    } catch (err: unknown) { alert(getErrorMessage(err)); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('هل أنت متأكد من إلغاء هذا العنصر؟')) return;
    try {
      await api.post(`/clinic-queue/${id}/cancel`);
      await fetchData();
    } catch (err: unknown) { alert(getErrorMessage(err)); }
  };

  const handleChangePriority = async (id: string, priority: number) => {
    try {
      await api.patch(`/clinic-queue/${id}/priority`, { priority });
      await fetchData();
    } catch (err: unknown) { alert(getErrorMessage(err)); }
  };

  if (loading && !data) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" /></div>;
  }

  if (error) {
    return <div className="rounded-lg bg-red-50 p-4 text-center text-red-600"><p>{error}</p><button onClick={fetchData} className="mt-2 text-sm underline">إعادة المحاولة</button></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">طابور العيادة</h1>
          <p className="text-sm text-gray-500">إدارة طابور المرضى والنداء وتوزيع الغرف</p>
        </div>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
      </div>

      {data && <QueueStats data={data} />}

      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{tab.label}</button>
        ))}
      </div>

      {filteredItems.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map(item => (
            <QueueItemCard key={item.id} item={item} onCall={handleCall} onEnterRoom={handleEnterRoom} onComplete={handleComplete} onCancel={handleCancel} onChangePriority={handleChangePriority} canEdit={canEdit} isDoctor={isDoctor} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">لا توجد عناصر في الطابور لهذا اليوم</p>
        </div>
      )}

      {enterRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEnterRoomModal(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-navy">اختر الغرفة</h2>
            {enterRoomModal.rooms.length === 0 ? (
              <p className="text-sm text-gray-500">لا توجد غرف متاحة حاليًا</p>
            ) : (
              <div className="space-y-2">
                {enterRoomModal.rooms.map(room => (
                  <button key={room.id} onClick={() => confirmEnterRoom(room.id)} className="w-full rounded-lg border border-gray-200 p-3 text-right transition-colors hover:border-orange hover:bg-orange-50">
                    <div className="font-medium text-navy">{room.name}</div>
                    {room.roomNumber && <div className="text-xs text-gray-500">رقم: {room.roomNumber}</div>}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setEnterRoomModal(null)} className="mt-4 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
}
