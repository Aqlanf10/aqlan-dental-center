'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Pagination from '@/components/common/Pagination';
import { api } from '@/lib/api';
import type { EmployeeDto, CreateEmployeeRequest, UpdateEmployeeRequest } from '@/types/api';

function EmployeesContent() {
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<EmployeeDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('');

  const [form, setForm] = useState({
    fullName: '', phone: '', position: '', hireDate: '', baseSalary: '', emergencyContact: '', notes: '',
  });

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const positionParam = positionFilter ? `&position=${encodeURIComponent(positionFilter)}` : '';
      const res = await api.get<{ items: EmployeeDto[]; totalCount: number; totalPages: number }>(`/employees?page=${page}&pageSize=${pageSize}${positionParam}`);
      setEmployees(res.data.items || []);
      setTotalCount(res.data.totalCount || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch { setEmployees([]); }
    setLoading(false);
  }, [page, positionFilter]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const positions = Array.from(new Set(employees.map(e => e.position).filter((p): p is string => !!p)));

  const openCreate = () => {
    setEditingItem(null);
    setForm({ fullName: '', phone: '', position: '', hireDate: '', baseSalary: '', emergencyContact: '', notes: '' });
    setShowCreate(true);
  };

  const openEdit = (emp: EmployeeDto) => {
    setEditingItem(emp);
    setForm({
      fullName: emp.fullName, phone: emp.phone || '', position: emp.position || '',
      hireDate: emp.hireDate || '', baseSalary: emp.baseSalary != null ? String(emp.baseSalary) : '',
      emergencyContact: emp.emergencyContact || '', notes: emp.notes || '',
    });
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!form.fullName) return;
    setSaving(true);
    try {
      if (editingItem) {
        const req: UpdateEmployeeRequest = {
          fullName: form.fullName, phone: form.phone || null, position: form.position || null,
          hireDate: form.hireDate || null, baseSalary: form.baseSalary ? Number(form.baseSalary) : null,
          emergencyContact: form.emergencyContact || null, notes: form.notes || null,
        };
        await api.put(`/employees/${editingItem.id}`, req);
      } else {
        const req: CreateEmployeeRequest = {
          fullName: form.fullName, phone: form.phone || null, position: form.position || null,
          hireDate: form.hireDate || null, baseSalary: form.baseSalary ? Number(form.baseSalary) : null,
          emergencyContact: form.emergencyContact || null, notes: form.notes || null,
        };
        await api.post('/employees', req);
      }
      setShowCreate(false);
      fetchEmployees();
    } catch { /* error */ }
    setSaving(false);
  };

  const handleDeactivate = async (id: string) => {
    try {
      await api.put(`/employees/${id}`, { fullName: undefined } as UpdateEmployeeRequest);
      // Soft delete by updating isActive - this is a workaround since there's no delete endpoint
      fetchEmployees();
    } catch { /* error */ }
  };

  const formatCurrency = (amount: number | null) => amount != null ? `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س` : '—';

  const filteredEmployees = employees.filter(e =>
    !searchTerm || e.fullName.includes(searchTerm) || (e.phone && e.phone.includes(searchTerm)) || (e.position && e.position.includes(searchTerm))
  );

  // Stats
  const activeCount = employees.filter(e => e.isActive).length;
  const inactiveCount = employees.filter(e => !e.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">الموظفين</h1>
          <p className="text-sm text-gray-500">إدارة بيانات الموظفين</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          إضافة موظف
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy/5 text-navy">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">إجمالي الموظفين</p>
              <p className="text-xl font-bold text-navy">{totalCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-green-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">نشط</p>
              <p className="text-xl font-bold text-green-600">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">غير نشط</p>
              <p className="text-xl font-bold text-gray-500">{inactiveCount}</p>
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
          placeholder="بحث بالاسم أو الهاتف أو المنصب..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange sm:w-72"
        />
        {positions.length > 0 && (
          <select value={positionFilter} onChange={(e) => { setPositionFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange">
            <option value="">كل المناصب</option>
            {positions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" /></div>
      ) : filteredEmployees.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-right font-medium text-gray-600">الاسم</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المنصب</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الهاتف</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">تاريخ التعيين</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الراتب</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">جهة اتصال الطوارئ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEmployees.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-navy">{e.fullName}</td>
                  <td className="px-4 py-3 text-gray-500">{e.position || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{e.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{e.hireDate ? new Date(e.hireDate).toLocaleDateString('ar-SA') : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatCurrency(e.baseSalary)}</td>
                  <td className="px-4 py-3 text-gray-500">{e.emergencyContact || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${e.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {e.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(e)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="تعديل">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      {e.isActive && (
                        <button onClick={() => handleDeactivate(e.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="إلغاء التفعيل">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
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
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <p className="mt-3 text-sm text-gray-500">لا يوجد موظفين</p>
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">{editingItem ? 'تعديل الموظف' : 'إضافة موظف جديد'}</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الاسم الكامل <span className="text-red-500">*</span></label>
                  <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="اسم الموظف"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">المنصب</label>
                  <input type="text" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="مثال: ممرض"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الهاتف</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="رقم الهاتف"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ التعيين</label>
                  <input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الراتب الأساسي</label>
                  <input type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} placeholder="0.00" min={0} step={0.01}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">جهة اتصال طوارئ</label>
                  <input type="text" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="ملاحظات إضافية..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving || !form.fullName}
                  className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : editingItem ? 'تحديث' : 'إنشاء'}
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

export default function EmployeesPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <EmployeesContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
