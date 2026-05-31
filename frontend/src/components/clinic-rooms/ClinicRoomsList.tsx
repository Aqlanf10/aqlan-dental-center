'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClinicRoomDto } from '@/types/api';
import { api } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthContext';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'حدث خطأ غير متوقع';
}

export default function ClinicRoomsList() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ClinicRoomDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRoom, setEditRoom] = useState<ClinicRoomDto | null>(null);
  const [formName, setFormName] = useState('');
  const [formRoomNumber, setFormRoomNumber] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const isAdmin = user?.role === 'Admin';

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ClinicRoomDto[]>('/clinic-rooms');
      setRooms(res.data);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const openCreate = () => {
    setEditRoom(null);
    setFormName('');
    setFormRoomNumber('');
    setFormDescription('');
    setShowForm(true);
  };

  const openEdit = (room: ClinicRoomDto) => {
    setEditRoom(room);
    setFormName(room.name);
    setFormRoomNumber(room.roomNumber || '');
    setFormDescription(room.description || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    try {
      if (editRoom) {
        await api.put(`/clinic-rooms/${editRoom.id}`, { name: formName, roomNumber: formRoomNumber || null, description: formDescription || null });
      } else {
        await api.post('/clinic-rooms', { name: formName, roomNumber: formRoomNumber || null, description: formDescription || null });
      }
      setShowForm(false);
      await fetchRooms();
    } catch (err: unknown) { alert(getErrorMessage(err)); }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">الغرف</h1>
          <p className="text-sm text-gray-500">إدارة غرف العيادة وحالة الإشغال</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">+ إضافة غرفة</button>
        )}
      </div>

      {rooms.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">لا توجد غرف مضافة بعد</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map(room => (
            <div key={room.id} className={`rounded-lg border-2 bg-white p-4 shadow-sm ${room.isOccupied ? 'border-red-200' : 'border-green-200'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-navy">{room.name}</h3>
                  {room.roomNumber && <p className="text-xs text-gray-500">رقم: {room.roomNumber}</p>}
                  {room.description && <p className="mt-1 text-xs text-gray-400">{room.description}</p>}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${room.isOccupied ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {room.isOccupied ? 'مشغولة' : 'متاحة'}
                </span>
              </div>
              {room.isOccupied && room.currentPatientName && (
                <div className="mt-3 rounded-md bg-red-50 p-2 text-sm">
                  <span className="font-medium text-red-700">المريض:</span>{' '}
                  <span className="text-red-600">{room.currentPatientName}</span>
                </div>
              )}
              {isAdmin && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <button onClick={() => openEdit(room)} className="text-xs font-medium text-blue-600 hover:text-blue-800">تعديل</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-navy">{editRoom ? 'تعديل الغرفة' : 'إضافة غرفة'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">اسم الغرفة <span className="text-red-500">*</span></label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">رقم الغرفة</label>
                <input type="text" value={formRoomNumber} onChange={(e) => setFormRoomNumber(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">الوصف</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">{editRoom ? 'تحديث' : 'إنشاء'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
