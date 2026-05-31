'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Pagination from '@/components/common/Pagination';
import { api } from '@/lib/api';
import {
  LabOrderDto,
  PatientDto,
  DoctorDto,
  LabOrderStatusLabels,
  LabOrderStatusColors,
  LabOrderPriorityLabels,
  CreateLabOrderRequest,
  UpdateLabOrderRequest,
} from '@/types/api';

function LabContent() {
  const [orders, setOrders] = useState<LabOrderDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState({
    patientId: '', orthoCaseId: '', applianceType: '', labName: '',
    sentDate: '', expectedDate: '', priority: 1, instructions: '',
    cost: '', doctorId: '', notes: '',
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter !== '' ? `&status=${statusFilter}` : '';
      const res = await api.get<{ items: LabOrderDto[]; totalCount: number; totalPages: number }>(
        `/lab-orders?page=${page}&pageSize=${pageSize}${statusParam}`
      );
      setOrders(res.data.items || []);
      setTotalCount(res.data.totalCount || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch { setOrders([]); }
    setLoading(false);
  }, [statusFilter, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, dRes] = await Promise.all([
          api.get<{ items: PatientDto[] }>('/patients?page=1&pageSize=1000'),
          api.get<{ items: DoctorDto[] }>('/doctors?page=1&pageSize=100'),
        ]);
        setPatients(pRes.data.items || []);
        setDoctors(dRes.data.items || []);
      } catch { /* silent */ }
    };
    load();
  }, []);

  const handleCreate = async () => {
    if (!form.patientId) return;
    setSaving(true);
    try {
      const req: CreateLabOrderRequest = {
        patientId: form.patientId,
        orthoCaseId: form.orthoCaseId || null,
        applianceType: form.applianceType || null,
        labName: form.labName || null,
        sentDate: form.sentDate || null,
        expectedDate: form.expectedDate || null,
        priority: form.priority,
        instructions: form.instructions || null,
        cost: form.cost ? Number(form.cost) : null,
        doctorId: form.doctorId || null,
        notes: form.notes || null,
      };
      await api.post('/lab-orders', req);
      setShowCreate(false);
      setForm({ patientId: '', orthoCaseId: '', applianceType: '', labName: '', sentDate: '', expectedDate: '', priority: 1, instructions: '', cost: '', doctorId: '', notes: '' });
      fetchOrders();
    } catch { /* error */ }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      const req: UpdateLabOrderRequest = { status: newStatus };
      if (newStatus === 3) req.receivedDate = new Date().toISOString().split('T')[0];
      await api.put(`/lab-orders/${id}`, req);
      fetchOrders();
    } catch { /* error */ }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.put(`/lab-orders/${id}`, { status: 4 } as UpdateLabOrderRequest);
      fetchOrders();
    } catch { /* error */ }
  };

  const filteredOrders = orders.filter(o =>
    !searchTerm || o.patientName.includes(searchTerm) || (o.orderNumber && o.orderNumber.includes(searchTerm)) || (o.labName && o.labName.includes(searchTerm))
  );

  // Stats
  const sentCount = orders.filter(o => o.status === 0).length;
  const manufacturingCount = orders.filter(o => o.status === 1).length;
  const readyCount = orders.filter(o => o.status === 2).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">المختبر</h1>
          <p className="text-sm text-gray-500">إدارة طلبات المختبر والأجهزة</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          طلب مختبر جديد
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">مرسل</p>
              <p className="text-xl font-bold text-navy">{sentCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">قيد التصنيع</p>
              <p className="text-xl font-bold text-navy">{manufacturingCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">جاهز للاستلام</p>
              <p className="text-xl font-bold text-navy">{readyCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy/5 text-navy">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">إجمالي الطلبات</p>
              <p className="text-xl font-bold text-navy">{totalCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث بالمريض أو رقم الطلب أو المختبر..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange sm:w-72"
        />
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange">
          <option value="">كل الحالات</option>
          {Object.entries(LabOrderStatusLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" /></div>
      ) : filteredOrders.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-right font-medium text-gray-600">رقم الطلب</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المريض</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المختبر</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الجهاز</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الأولوية</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">التكلفة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">تاريخ الإرسال</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-navy">{o.orderNumber || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{o.patientName}</td>
                  <td className="px-4 py-3 text-gray-500">{o.labName || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{o.applianceType || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${o.priority === 0 ? 'bg-red-100 text-red-700' : o.priority === 2 ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>
                      {LabOrderPriorityLabels[o.priority] || o.priorityDisplay}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${LabOrderStatusColors[o.status] || 'bg-gray-100 text-gray-700'}`}>
                      {LabOrderStatusLabels[o.status] || o.statusDisplay}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{o.cost != null ? `${o.cost} ر.س` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{o.sentDate || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {o.status < 3 && o.status !== 4 && (
                        <button onClick={() => handleStatusChange(o.id, o.status + 1)}
                          className="rounded-lg bg-orange/10 px-3 py-1 text-xs font-medium text-orange hover:bg-orange/20 transition-colors">
                          {o.status === 0 ? 'تصنيع' : o.status === 1 ? 'جاهز' : 'استلام'}
                        </button>
                      )}
                      {o.status < 3 && o.status !== 4 && (
                        <button onClick={() => handleCancel(o.id)}
                          className="rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors">
                          إلغاء
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          <p className="mt-3 text-sm text-gray-500">لا توجد طلبات مختبر</p>
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">طلب مختبر جديد</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">المريض <span className="text-red-500">*</span></label>
                <select value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange">
                  <option value="">-- اختر المريض --</option>
                  {patients.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.patientNumber} - {p.fullName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">المختبر</label>
                  <input type="text" value={form.labName} onChange={(e) => setForm({ ...form, labName: e.target.value })} placeholder="اسم المختبر"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">نوع الجهاز</label>
                  <input type="text" value={form.applianceType} onChange={(e) => setForm({ ...form, applianceType: e.target.value })} placeholder="مثال: طقم أسنان"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ الإرسال</label>
                  <input type="date" value={form.sentDate} onChange={(e) => setForm({ ...form, sentDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ الاستلام المتوقع</label>
                  <input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الأولوية</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange">
                    {Object.entries(LabOrderPriorityLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">التكلفة</label>
                  <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="0.00"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الطبيب</label>
                  <select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange">
                    <option value="">-- بدون --</option>
                    {doctors.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>د. {d.fullName}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">تعليمات</label>
                <textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={2} placeholder="تعليمات للمختبر..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCreate} disabled={saving || !form.patientId}
                  className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : 'إنشاء الطلب'}
                </button>
                <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LabPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <LabContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
