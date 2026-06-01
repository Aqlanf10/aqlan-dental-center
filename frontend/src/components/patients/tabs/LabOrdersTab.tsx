'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { LabOrderDto, CreateLabOrderRequest, DoctorDto } from '../../../types/api';
import { LabOrderStatusLabels, LabOrderStatusColors, LabOrderPriorityLabels } from '../../../types/api';
import { Plus, X, Loader2 } from 'lucide-react';

interface LabOrdersTabProps {
  patientId: string;
}

const formatCurrency = (amount: number) =>
  `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
const formatDate = (date: string | null) => date ? new Date(date).toLocaleDateString('ar-SA') : '—';

export default function LabOrdersTab({ patientId }: LabOrdersTabProps) {
  const [orders, setOrders] = useState<LabOrderDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    applianceType: '', labName: '', sentDate: '', expectedDate: '',
    priority: 1, instructions: '', cost: '', doctorId: '', notes: '',
  });

  useEffect(() => { fetchOrders(); }, [patientId]);
  useEffect(() => {
    api.get<DoctorDto[]>('/doctors').then(res => setDoctors((res.data ?? []).filter(d => d.isActive))).catch(() => {});
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true); setError(null);
      const res = await api.get<LabOrderDto[]>(`/lab-orders?patientId=${patientId}`);
      const items = Array.isArray(res.data) ? res.data : [];
      setOrders(items);
    } catch { setError('حدث خطأ أثناء تحميل طلبات المختبر'); }
    finally { setIsLoading(false); }
  };

  const handleAdd = async () => {
    setSaving(true); setFormError(null);
    try {
      const req: CreateLabOrderRequest = {
        patientId, applianceType: form.applianceType || null,
        labName: form.labName || null, sentDate: form.sentDate || null,
        expectedDate: form.expectedDate || null, priority: form.priority,
        instructions: form.instructions || null, cost: form.cost ? Number(form.cost) : null,
        doctorId: form.doctorId || null, notes: form.notes || null,
      };
      await api.post('/lab-orders', req);
      setShowAdd(false);
      setForm({ applianceType: '', labName: '', sentDate: '', expectedDate: '', priority: 1, instructions: '', cost: '', doctorId: '', notes: '' });
      fetchOrders();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'خطأ في الحفظ'); }
    finally { setSaving(false); }
  };

  const handleUpdateStatus = async (orderId: string, status: number) => {
    try { await api.patch(`/lab-orders/${orderId}/status`, { status }); fetchOrders(); } catch { /* silent */ }
  };

  if (isLoading) return <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" /></div>;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1a3a5c]">طلبات المختبر</h3>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 rounded-lg bg-[#f5922e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e07d1a] font-[Tajawal]">
          <Plus className="w-3.5 h-3.5" /> إنشاء طلب
        </button>
      </div>

      {orders.length === 0 && !showAdd && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          <p className="mt-4 text-lg font-bold text-gray-400">لا توجد طلبات مختبر مسجلة</p>
        </div>
      )}

      {orders.map(o => {
        const statusColor = LabOrderStatusColors[o.status] || 'bg-gray-100 text-gray-700';
        const priority = LabOrderPriorityLabels[o.priority] || '—';
        return (
          <div key={o.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-[#1a3a5c]">طلب #{o.orderNumber ?? '—'}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColor}`}>{LabOrderStatusLabels[o.status]}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">{priority}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  {o.applianceType && <span>نوع الجهاز: <span className="font-medium text-[#1a3a5c]">{o.applianceType}</span></span>}
                  {o.labName && <span>المختبر: <span className="font-medium text-[#1a3a5c]">{o.labName}</span></span>}
                </div>
                {/* Status actions */}
                <div className="mt-2 flex gap-2">
                  {o.status === 0 && <button onClick={() => handleUpdateStatus(o.id, 1)} className="text-xs text-[#3d7ab5] hover:underline font-[Tajawal]">بدء التصنيع</button>}
                  {o.status === 1 && <button onClick={() => handleUpdateStatus(o.id, 2)} className="text-xs text-green-600 hover:underline font-[Tajawal]">جاهز</button>}
                  {o.status === 2 && <button onClick={() => handleUpdateStatus(o.id, 3)} className="text-xs text-[#3d7ab5] hover:underline font-[Tajawal]">تم الاستلام</button>}
                </div>
              </div>
              <div className="text-left space-y-1">
                {o.cost != null && <p className="text-sm font-bold text-[#f5922e]">{formatCurrency(o.cost)}</p>}
                <p className="text-xs text-gray-400">{formatDate(o.expectedDate)}</p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add Order Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">إنشاء طلب مختبر</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            {formError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع الجهاز</label>
                  <input type="text" value={form.applianceType} onChange={e => setForm({...form, applianceType: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">اسم المختبر</label>
                  <input type="text" value={form.labName} onChange={e => setForm({...form, labName: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ الإرسال</label>
                  <input type="date" value={form.sentDate} onChange={e => setForm({...form, sentDate: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ الاستلام المتوقع</label>
                  <input type="date" value={form.expectedDate} onChange={e => setForm({...form, expectedDate: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الأولوية</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: Number(e.target.value)})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]">
                    {Object.entries(LabOrderPriorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">التكلفة</label>
                  <input type="number" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب</label>
                <select value={form.doctorId} onChange={e => setForm({...form, doctorId: e.target.value})} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]">
                  <option value="">-- اختر --</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>د. {d.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">تعليمات</label>
                <textarea value={form.instructions} onChange={e => setForm({...form, instructions: e.target.value})} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleAdd} disabled={saving} className="flex-1 rounded-lg bg-[#3d7ab5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3d7ab5]/90 disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'جاري الحفظ...' : 'إنشاء الطلب'}
                </button>
                <button onClick={() => setShowAdd(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-[Tajawal]">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
