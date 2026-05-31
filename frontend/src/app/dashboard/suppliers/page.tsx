'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import type {
  SupplierDto,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  PurchaseOrderDto,
  SupplierBillDto,
  PagedResult,
} from '@/types/api';
import {
  PurchaseOrderStatusLabels,
  SupplierBillStatusLabels,
  SupplierBillStatusColors,
} from '@/types/api';

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA');
}

type TabKey = 'list' | 'purchaseOrders' | 'bills';

function SuppliersContent() {
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('list');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDto | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDto[]>([]);
  const [bills, setBills] = useState<SupplierBillDto[]>([]);

  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    phoneNumber: '',
    email: '',
    address: '',
    taxNumber: '',
    notes: '',
  });

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PagedResult<SupplierDto>>('/suppliers?pageSize=100');
      setSuppliers(res.data?.items ?? []);
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const loadSupplierDetails = useCallback(async (supplier: SupplierDto) => {
    setSelectedSupplier(supplier);
    setActiveTab('purchaseOrders');
    try {
      const [poRes, billRes] = await Promise.all([
        api.get<PagedResult<PurchaseOrderDto>>(`/suppliers/${supplier.id}/purchase-orders?pageSize=50`).catch(() => null),
        api.get<PagedResult<SupplierBillDto>>(`/suppliers/${supplier.id}/bills?pageSize=50`).catch(() => null),
      ]);
      setPurchaseOrders(poRes?.data?.items ?? []);
      setBills(billRes?.data?.items ?? []);
    } catch {
      // silent
    }
  }, []);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editingSupplier) {
        const req: UpdateSupplierRequest = {
          name: form.name,
          contactPerson: form.contactPerson || null,
          phoneNumber: form.phoneNumber || null,
          email: form.email || null,
          address: form.address || null,
          taxNumber: form.taxNumber || null,
          notes: form.notes || null,
        };
        await api.put(`/suppliers/${editingSupplier.id}`, req);
      } else {
        const req: CreateSupplierRequest = {
          name: form.name,
          contactPerson: form.contactPerson || null,
          phoneNumber: form.phoneNumber || null,
          email: form.email || null,
          address: form.address || null,
          taxNumber: form.taxNumber || null,
          notes: form.notes || null,
        };
        await api.post('/suppliers', req);
      }
      setShowCreate(false);
      setEditingSupplier(null);
      setForm({ name: '', contactPerson: '', phoneNumber: '', email: '', address: '', taxNumber: '', notes: '' });
      loadSuppliers();
    } catch {
      // silent
    }
    setSaving(false);
  };

  const openEdit = (supplier: SupplierDto) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phoneNumber: supplier.phoneNumber || '',
      email: supplier.email || '',
      address: supplier.address || '',
      taxNumber: supplier.taxNumber || '',
      notes: supplier.notes || '',
    });
    setShowCreate(true);
  };

  const filteredSuppliers = suppliers.filter((s) =>
    !searchTerm || s.name.includes(searchTerm) || s.supplierNumber.includes(searchTerm) || (s.phoneNumber && s.phoneNumber.includes(searchTerm))
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-[#1a3a5c]">الموردين</h1>
        <p className="text-sm text-gray-500">إدارة الموردين وأوامر الشراء والفواتير</p>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="بحث بالاسم أو الرقم أو الهاتف..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e] sm:w-64"
        />
        <button
          onClick={() => { setEditingSupplier(null); setForm({ name: '', contactPerson: '', phoneNumber: '', email: '', address: '', taxNumber: '', notes: '' }); setShowCreate(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#f5922e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#e07d1a]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          مورد جديد
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Supplier List */}
        <div className="lg:col-span-1">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" />
            </div>
          ) : filteredSuppliers.length > 0 ? (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredSuppliers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadSupplierDetails(s)}
                  className={`w-full rounded-lg border p-3 text-right transition-colors hover:bg-gray-50 ${
                    selectedSupplier?.id === s.id ? 'border-[#3d7ab5] bg-[#3d7ab5]/5' : 'border-gray-200 bg-white'
                  }`}
                >
                  <p className="font-bold text-[#1a3a5c]">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.supplierNumber}</p>
                  {s.phoneNumber && <p className="text-xs text-gray-400 mt-1" dir="ltr">{s.phoneNumber}</p>}
                </button>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-gray-400">لا يوجد موردين</p>
          )}
        </div>

        {/* Supplier Details */}
        <div className="lg:col-span-2">
          {selectedSupplier ? (
            <div className="space-y-4">
              {/* Supplier Info Card */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#1a3a5c]">{selectedSupplier.name}</h2>
                    <p className="text-sm text-gray-500">{selectedSupplier.supplierNumber}</p>
                  </div>
                  <button onClick={() => openEdit(selectedSupplier)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#3d7ab5] hover:bg-[#3d7ab5]/5">تعديل</button>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  {selectedSupplier.contactPerson && <p><span className="text-gray-500">جهة الاتصال:</span> <span className="text-[#1a3a5c] font-medium">{selectedSupplier.contactPerson}</span></p>}
                  {selectedSupplier.phoneNumber && <p><span className="text-gray-500">الهاتف:</span> <span className="text-[#1a3a5c] font-medium" dir="ltr">{selectedSupplier.phoneNumber}</span></p>}
                  {selectedSupplier.email && <p><span className="text-gray-500">البريد:</span> <span className="text-[#1a3a5c] font-medium" dir="ltr">{selectedSupplier.email}</span></p>}
                  {selectedSupplier.taxNumber && <p><span className="text-gray-500">الرقم الضريبي:</span> <span className="text-[#1a3a5c] font-medium" dir="ltr">{selectedSupplier.taxNumber}</span></p>}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b border-gray-200">
                <button onClick={() => setActiveTab('purchaseOrders')} className={`px-4 py-2.5 text-sm font-medium ${activeTab === 'purchaseOrders' ? 'text-[#1a3a5c] border-b-2 border-[#1a3a5c]' : 'text-gray-500 hover:text-[#1a3a5c]'}`}>أوامر الشراء</button>
                <button onClick={() => setActiveTab('bills')} className={`px-4 py-2.5 text-sm font-medium ${activeTab === 'bills' ? 'text-[#1a3a5c] border-b-2 border-[#1a3a5c]' : 'text-gray-500 hover:text-[#1a3a5c]'}`}>الفواتير</button>
              </div>

              {/* Purchase Orders Tab */}
              {activeTab === 'purchaseOrders' && (
                purchaseOrders.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="px-4 py-3 text-right font-medium text-gray-600">رقم الأمر</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">الإجمالي</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {purchaseOrders.map((po) => (
                          <tr key={po.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-[#1a3a5c]">{po.poNumber}</td>
                            <td className="px-4 py-3 text-gray-500">{formatDate(po.orderDate)}</td>
                            <td className="px-4 py-3 text-gray-700">{formatCurrency(po.totalAmount)}</td>
                            <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">{PurchaseOrderStatusLabels[po.status] || po.statusDisplay}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-400">لا توجد أوامر شراء</p>
                )
              )}

              {/* Bills Tab */}
              {activeTab === 'bills' && (
                bills.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="px-4 py-3 text-right font-medium text-gray-600">رقم الفاتورة</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">الإجمالي</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">المدفوع</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {bills.map((b) => (
                          <tr key={b.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-[#1a3a5c]">{b.billNumber}</td>
                            <td className="px-4 py-3 text-gray-500">{formatDate(b.billDate)}</td>
                            <td className="px-4 py-3 text-gray-700">{formatCurrency(b.totalAmount)}</td>
                            <td className="px-4 py-3 text-gray-500">{formatCurrency(b.paidAmount)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SupplierBillStatusColors[b.status] || 'bg-gray-100 text-gray-700'}`}>
                                {SupplierBillStatusLabels[b.status] || b.statusDisplay}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-400">لا توجد فواتير</p>
                )
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-300">
              <p className="text-sm text-gray-400">اختر موردًا لعرض التفاصيل</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setShowCreate(false); setEditingSupplier(null); }}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c]">{editingSupplier ? 'تعديل مورد' : 'مورد جديد'}</h2>
              <button onClick={() => { setShowCreate(false); setEditingSupplier(null); }} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الاسم <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">جهة الاتصال</label>
                  <input type="text" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الهاتف</label>
                  <input type="text" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" dir="ltr" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الرقم الضريبي</label>
                  <input type="text" value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" dir="ltr" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">العنوان</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving || !form.name} className="flex-1 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07d1a] disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : editingSupplier ? 'تحديث' : 'إنشاء'}
                </button>
                <button onClick={() => { setShowCreate(false); setEditingSupplier(null); }} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl font-[Tajawal]">
          <SuppliersContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
