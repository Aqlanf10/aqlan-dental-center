'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Pagination from '@/components/common/Pagination';
import { api } from '@/lib/api';
import type { InventoryItemDto, CreateInventoryItemRequest, UpdateInventoryItemRequest } from '@/types/api';

function InventoryContent() {
  const [items, setItems] = useState<InventoryItemDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [form, setForm] = useState({
    name: '', category: '', quantity: '0', minQuantity: '5', unit: '',
    costPerUnit: '', batchNumber: '', expiryDate: '',
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const lowStockParam = lowStockOnly ? '&lowStock=true' : '';
      const categoryParam = categoryFilter ? `&category=${encodeURIComponent(categoryFilter)}` : '';
      const res = await api.get<{ items: InventoryItemDto[]; totalCount: number; totalPages: number }>(
        `/inventory?page=${page}&pageSize=${pageSize}${lowStockParam}${categoryParam}`
      );
      setItems(res.data.items || []);
      setTotalCount(res.data.totalCount || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch { setItems([]); }
    setLoading(false);
  }, [page, lowStockOnly, categoryFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const categories = Array.from(new Set(items.map(i => i.category).filter((c): c is string => !!c)));

  const openCreate = () => {
    setEditingItem(null);
    setForm({ name: '', category: '', quantity: '0', minQuantity: '5', unit: '', costPerUnit: '', batchNumber: '', expiryDate: '' });
    setShowCreate(true);
  };

  const openEdit = (item: InventoryItemDto) => {
    setEditingItem(item);
    setForm({
      name: item.name, category: item.category || '', quantity: String(item.quantity),
      minQuantity: String(item.minQuantity), unit: item.unit || '',
      costPerUnit: item.costPerUnit != null ? String(item.costPerUnit) : '',
      batchNumber: item.batchNumber || '', expiryDate: item.expiryDate || '',
    });
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editingItem) {
        const req: UpdateInventoryItemRequest = {
          name: form.name, category: form.category || null, quantity: Number(form.quantity),
          minQuantity: Number(form.minQuantity), unit: form.unit || null,
          costPerUnit: form.costPerUnit ? Number(form.costPerUnit) : null,
          batchNumber: form.batchNumber || null, expiryDate: form.expiryDate || null,
        };
        await api.put(`/inventory/${editingItem.id}`, req);
      } else {
        const req: CreateInventoryItemRequest = {
          name: form.name, category: form.category || null, quantity: Number(form.quantity),
          minQuantity: Number(form.minQuantity), unit: form.unit || null,
          costPerUnit: form.costPerUnit ? Number(form.costPerUnit) : null,
          batchNumber: form.batchNumber || null, expiryDate: form.expiryDate || null,
        };
        await api.post('/inventory', req);
      }
      setShowCreate(false);
      fetchItems();
    } catch { /* error */ }
    setSaving(false);
  };

  const filteredItems = items.filter(i =>
    !searchTerm || i.name.includes(searchTerm) || (i.batchNumber && i.batchNumber.includes(searchTerm))
  );

  // Stats
  const lowStockCount = items.filter(i => i.isLowStock).length;
  const expiringSoonCount = items.filter(i => {
    if (!i.expiryDate) return false;
    const expiry = new Date(i.expiryDate);
    const now = new Date();
    const diff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff > 0;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">المخزون</h1>
          <p className="text-sm text-gray-500">إدارة المخزون والمواد</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          إضافة مادة
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy/5 text-navy">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">إجمالي المواد</p>
              <p className="text-xl font-bold text-navy">{totalCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-red-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">مخزون منخفض</p>
              <p className="text-xl font-bold text-red-600">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-yellow-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">ينتهي خلال 30 يوم</p>
              <p className="text-xl font-bold text-yellow-600">{expiringSoonCount}</p>
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
          placeholder="بحث بالاسم أو رقم الدفعة..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange sm:w-72"
        />
        {categories.length > 0 && (
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange">
            <option value="">كل التصنيفات</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }}
            className="h-4 w-4 rounded border-gray-300 text-orange focus:ring-orange" />
          المخزون المنخفض فقط
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" /></div>
      ) : filteredItems.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-right font-medium text-gray-600">الاسم</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">التصنيف</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الكمية</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الحد الأدنى</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الوحدة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">تكلفة الوحدة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">تاريخ الانتهاء</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.map((i) => (
                <tr key={i.id} className={`hover:bg-gray-50 transition-colors ${i.isLowStock ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3 font-medium text-navy">{i.name}</td>
                  <td className="px-4 py-3 text-gray-500">{i.category || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${i.isLowStock ? 'text-red-600' : 'text-gray-700'}`}>{i.quantity}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{i.minQuantity}</td>
                  <td className="px-4 py-3 text-gray-500">{i.unit || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{i.costPerUnit != null ? `${i.costPerUnit} ر.س` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {i.expiryDate ? (
                      <span className={new Date(i.expiryDate) < new Date() ? 'text-red-600 font-medium' : ''}>
                        {new Date(i.expiryDate).toLocaleDateString('ar-SA')}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${i.isLowStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {i.isLowStock ? 'منخفض' : 'متوفر'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(i)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          <p className="mt-3 text-sm text-gray-500">لا توجد مواد في المخزون</p>
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">{editingItem ? 'تعديل المادة' : 'إضافة مادة جديدة'}</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الاسم <span className="text-red-500">*</span></label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم المادة"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">التصنيف</label>
                  <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="مثال: مستهلكات"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الكمية</label>
                  <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} min={0}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الحد الأدنى</label>
                  <input type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: e.target.value })} min={0}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الوحدة</label>
                  <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="مثال: قطعة"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تكلفة الوحدة</label>
                  <input type="number" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} placeholder="0.00" min={0} step={0.01}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">رقم الدفعة</label>
                  <input type="text" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ الانتهاء</label>
                <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving || !form.name}
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

export default function InventoryPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <InventoryContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
