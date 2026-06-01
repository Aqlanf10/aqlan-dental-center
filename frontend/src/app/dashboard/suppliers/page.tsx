'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import SearchInput from '@/components/common/SearchInput';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { api } from '@/lib/api';
import type {
  SupplierDto,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  PurchaseOrderDto,
  SupplierBillDto,
  CreatePurchaseOrderRequest,
  CreatePurchaseOrderLineRequest,
  CreateSupplierBillRequest,
  PagedResult,
} from '@/types/api';
import {
  PurchaseOrderStatusLabels,
  SupplierBillStatusLabels,
  SupplierBillStatusColors,
  PaymentMethodLabels,
} from '@/types/api';
import {
  Plus, Edit3, Trash2, ShoppingCart, FileText, CreditCard,
  XCircle, Truck, Building2,
} from 'lucide-react';

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA');
}

type TabKey = 'list' | 'purchaseOrders' | 'bills' | 'statement';

interface POLineForm { itemName: string; quantity: string; unitPrice: string; }

function SuppliersContent() {
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('list');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDto | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDto[]>([]);
  const [bills, setBills] = useState<SupplierBillDto[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<SupplierDto | null>(null);

  // PO Modal
  const [showPOModal, setShowPOModal] = useState(false);
  const [poLines, setPoLines] = useState<POLineForm[]>([{ itemName: '', quantity: '1', unitPrice: '' }]);
  const [poSaving, setPoSaving] = useState(false);
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [poNotes, setPoNotes] = useState('');

  // Bill Modal
  const [showBillModal, setShowBillModal] = useState(false);
  const [billSaving, setBillSaving] = useState(false);
  const [billForm, setBillForm] = useState({ billDate: new Date().toISOString().split('T')[0], dueDate: '', totalAmount: '', notes: '' });

  // Pay Bill Modal
  const [showPayBillModal, setShowPayBillModal] = useState(false);
  const [payBillTarget, setPayBillTarget] = useState<SupplierBillDto | null>(null);
  const [payBillAmount, setPayBillAmount] = useState('');
  const [payBillMethod, setPayBillMethod] = useState(0);
  const [payBillSaving, setPayBillSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', contactPerson: '', phoneNumber: '', email: '', address: '', taxNumber: '', notes: '',
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
    if (!form.name) { setError('يرجى إدخال اسم المورد'); return; }
    setSaving(true);
    setError('');
    try {
      if (editingSupplier) {
        const req: UpdateSupplierRequest = {
          name: form.name, contactPerson: form.contactPerson || null, phoneNumber: form.phoneNumber || null,
          email: form.email || null, address: form.address || null, taxNumber: form.taxNumber || null, notes: form.notes || null,
        };
        await api.put(`/suppliers/${editingSupplier.id}`, req);
      } else {
        const req: CreateSupplierRequest = {
          name: form.name, contactPerson: form.contactPerson || null, phoneNumber: form.phoneNumber || null,
          email: form.email || null, address: form.address || null, taxNumber: form.taxNumber || null, notes: form.notes || null,
        };
        await api.post('/suppliers', req);
      }
      setShowCreate(false);
      setEditingSupplier(null);
      setForm({ name: '', contactPerson: '', phoneNumber: '', email: '', address: '', taxNumber: '', notes: '' });
      loadSuppliers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ';
      setError(msg);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await api.delete(`/suppliers/${deleteTarget.id}`); setDeleteTarget(null); loadSuppliers(); } catch { /* silent */ }
  };

  const openEdit = (supplier: SupplierDto) => {
    setEditingSupplier(supplier);
    setForm({ name: supplier.name, contactPerson: supplier.contactPerson || '', phoneNumber: supplier.phoneNumber || '', email: supplier.email || '', address: supplier.address || '', taxNumber: supplier.taxNumber || '', notes: supplier.notes || '' });
    setShowCreate(true);
  };

  // PO handlers
  const addPOLine = () => setPoLines([...poLines, { itemName: '', quantity: '1', unitPrice: '' }]);
  const removePOLine = (idx: number) => { if (poLines.length > 1) setPoLines(poLines.filter((_, i) => i !== idx)); };
  const updatePOLine = (idx: number, field: keyof POLineForm, value: string) => {
    const updated = [...poLines]; updated[idx] = { ...updated[idx], [field]: value }; setPoLines(updated);
  };

  const handleCreatePO = async () => {
    if (!selectedSupplier) return;
    const validLines = poLines.filter(l => l.itemName && Number(l.unitPrice) > 0);
    if (validLines.length === 0) return;
    setPoSaving(true);
    try {
      const req: CreatePurchaseOrderRequest = {
        supplierId: selectedSupplier.id, orderDate: poDate, notes: poNotes || null,
        items: validLines.map(l => ({ itemName: l.itemName, quantity: Number(l.quantity) || 1, unitPrice: Number(l.unitPrice) } as CreatePurchaseOrderLineRequest)),
      };
      await api.post('/purchase-orders', req);
      setShowPOModal(false);
      setPoLines([{ itemName: '', quantity: '1', unitPrice: '' }]);
      loadSupplierDetails(selectedSupplier);
    } catch { /* silent */ }
    setPoSaving(false);
  };

  // Bill handlers
  const handleCreateBill = async () => {
    if (!selectedSupplier || !billForm.totalAmount || Number(billForm.totalAmount) <= 0) return;
    setBillSaving(true);
    try {
      const req: CreateSupplierBillRequest = {
        supplierId: selectedSupplier.id, billDate: billForm.billDate,
        dueDate: billForm.dueDate || null, totalAmount: Number(billForm.totalAmount), notes: billForm.notes || null,
      };
      await api.post('/supplier-bills', req);
      setShowBillModal(false);
      setBillForm({ billDate: new Date().toISOString().split('T')[0], dueDate: '', totalAmount: '', notes: '' });
      loadSupplierDetails(selectedSupplier);
    } catch { /* silent */ }
    setBillSaving(false);
  };

  // Pay Bill handler
  const handlePayBill = async () => {
    if (!payBillTarget || !payBillAmount || Number(payBillAmount) <= 0) return;
    setPayBillSaving(true);
    try {
      await api.post(`/supplier-bills/${payBillTarget.id}/pay`, { amount: Number(payBillAmount), paymentMethod: payBillMethod });
      setShowPayBillModal(false);
      setPayBillTarget(null);
      if (selectedSupplier) loadSupplierDetails(selectedSupplier);
    } catch { /* silent */ }
    setPayBillSaving(false);
  };

  const filteredSuppliers = suppliers.filter((s) =>
    !searchTerm || s.name.includes(searchTerm) || s.supplierNumber.includes(searchTerm) || (s.phoneNumber && s.phoneNumber.includes(searchTerm))
  );

  const totalBillsAmount = bills.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalBillsPaid = bills.reduce((sum, b) => sum + b.paidAmount, 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3a5c]">الموردين</h1>
          <p className="text-sm text-gray-500">إدارة الموردين وأوامر الشراء والفواتير</p>
        </div>
        <button
          onClick={() => { setEditingSupplier(null); setForm({ name: '', contactPerson: '', phoneNumber: '', email: '', address: '', taxNumber: '', notes: '' }); setError(''); setShowCreate(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#f5922e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#e07d1a]"
        >
          <Plus className="h-4 w-4" />
          مورد جديد
        </button>
      </div>

      {/* Stats */}
      {selectedSupplier && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a3a5c]/5 text-[#1a3a5c]">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">أوامر الشراء</p>
                <p className="text-xl font-bold text-[#1a3a5c]">{purchaseOrders.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 text-yellow-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">إجمالي الفواتير</p>
                <p className="text-xl font-bold text-[#1a3a5c]">{formatCurrency(totalBillsAmount)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm border border-green-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">المدفوع</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalBillsPaid)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Supplier List */}
        <div className="lg:col-span-1">
          <div className="mb-3">
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="بحث بالاسم أو الرقم..." />
          </div>
          {loading ? (
            <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" /></div>
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
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-bold text-[#1a3a5c] truncate">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.supplierNumber}</p>
                      {s.phoneNumber && <p className="text-xs text-gray-400 mt-1" dir="ltr">{s.phoneNumber}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(s); }} className="rounded p-1.5 text-gray-400 hover:bg-[#3d7ab5]/5 hover:text-[#3d7ab5]"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-400">لا يوجد موردين</p>
            </div>
          )}
        </div>

        {/* Supplier Details */}
        <div className="lg:col-span-2">
          {selectedSupplier ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#1a3a5c]">{selectedSupplier.name}</h2>
                    <p className="text-sm text-gray-500">{selectedSupplier.supplierNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setPoLines([{ itemName: '', quantity: '1', unitPrice: '' }]); setPoDate(new Date().toISOString().split('T')[0]); setPoNotes(''); setShowPOModal(true); }} className="inline-flex items-center gap-1 rounded-lg bg-[#3d7ab5] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2c6494]">
                      <ShoppingCart className="h-3.5 w-3.5" /> أمر شراء
                    </button>
                    <button onClick={() => { setBillForm({ billDate: new Date().toISOString().split('T')[0], dueDate: '', totalAmount: '', notes: '' }); setShowBillModal(true); }} className="inline-flex items-center gap-1 rounded-lg bg-[#f5922e] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e07d1a]">
                      <FileText className="h-3.5 w-3.5" /> فاتورة
                    </button>
                  </div>
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
                <button onClick={() => setActiveTab('statement')} className={`px-4 py-2.5 text-sm font-medium ${activeTab === 'statement' ? 'text-[#1a3a5c] border-b-2 border-[#1a3a5c]' : 'text-gray-500 hover:text-[#1a3a5c]'}`}>كشف حساب</button>
              </div>

              {activeTab === 'purchaseOrders' && (
                purchaseOrders.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-4 py-3 text-right font-medium text-gray-600">رقم الأمر</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">الإجمالي</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                      </tr></thead>
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
                ) : <div className="py-8 text-center text-sm text-gray-400"><Truck className="h-10 w-10 mx-auto text-gray-300 mb-2" />لا توجد أوامر شراء</div>
              )}

              {activeTab === 'bills' && (
                bills.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-4 py-3 text-right font-medium text-gray-600">رقم الفاتورة</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">الإجمالي</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">المدفوع</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-600">إجراء</th>
                      </tr></thead>
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
                            <td className="px-4 py-3">
                              {b.paidAmount < b.totalAmount && (
                                <button onClick={() => { setPayBillTarget(b); setPayBillAmount(String(b.totalAmount - b.paidAmount)); setPayBillMethod(0); setShowPayBillModal(true); }} className="rounded-lg bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 inline-flex items-center gap-1">
                                  <CreditCard className="h-3 w-3" /> دفع
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="py-8 text-center text-sm text-gray-400"><FileText className="h-10 w-10 mx-auto text-gray-300 mb-2" />لا توجد فواتير</div>
              )}

              {activeTab === 'statement' && (
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="font-bold text-[#1a3a5c] mb-4">كشف حساب المورد</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-gray-500">إجمالي الفواتير</span><span className="font-bold text-[#1a3a5c]">{formatCurrency(totalBillsAmount)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-500">إجمالي المدفوع</span><span className="font-bold text-green-600">{formatCurrency(totalBillsPaid)}</span></div>
                    <div className="border-t pt-3 flex justify-between text-sm"><span className="text-gray-500 font-medium">الرصيد المستحق</span><span className="font-bold text-red-600">{formatCurrency(totalBillsAmount - totalBillsPaid)}</span></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-300">
              <p className="text-sm text-gray-400">اختر موردًا لعرض التفاصيل</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Supplier Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setShowCreate(false); setEditingSupplier(null); }}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c]">{editingSupplier ? 'تعديل مورد' : 'مورد جديد'}</h2>
              <button onClick={() => { setShowCreate(false); setEditingSupplier(null); }} className="text-gray-400 hover:text-gray-600"><XCircle className="h-5 w-5" /></button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
            <div className="space-y-4">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">الاسم <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">جهة الاتصال</label>
                  <input type="text" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">الهاتف</label>
                  <input type="text" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" dir="ltr" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" dir="ltr" /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">الرقم الضريبي</label>
                  <input type="text" value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" dir="ltr" /></div>
              </div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">العنوان</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving || !form.name} className="flex-1 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07d1a] disabled:opacity-50">{saving ? 'جاري الحفظ...' : editingSupplier ? 'تحديث' : 'إنشاء'}</button>
                <button onClick={() => { setShowCreate(false); setEditingSupplier(null); }} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPOModal(false)}>
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c]">أمر شراء جديد — {selectedSupplier?.name}</h2>
              <button onClick={() => setShowPOModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ الأمر</label>
                  <input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                  <input type="text" value={poNotes} onChange={(e) => setPoNotes(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" /></div>
              </div>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b">
                    <th className="px-3 py-2 text-right font-medium text-gray-600">الصنف</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">الكمية</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">سعر الوحدة</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {poLines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1.5"><input type="text" value={line.itemName} onChange={(e) => updatePOLine(idx, 'itemName', e.target.value)} placeholder="اسم الصنف" className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-[#f5922e] focus:outline-none" /></td>
                        <td className="px-2 py-1.5"><input type="number" value={line.quantity} onChange={(e) => updatePOLine(idx, 'quantity', e.target.value)} min={1} className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-[#f5922e] focus:outline-none" /></td>
                        <td className="px-2 py-1.5"><input type="number" value={line.unitPrice} onChange={(e) => updatePOLine(idx, 'unitPrice', e.target.value)} min={0} placeholder="0.00" className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-[#f5922e] focus:outline-none" /></td>
                        <td className="px-2 py-1.5">{poLines.length > 1 && <button onClick={() => removePOLine(idx)} className="text-red-400 hover:text-red-600"><XCircle className="h-4 w-4" /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={addPOLine} className="inline-flex items-center gap-1 text-sm text-[#3d7ab5] hover:text-[#2c6494]"><Plus className="h-4 w-4" /> إضافة سطر</button>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCreatePO} disabled={poSaving} className="flex-1 rounded-lg bg-[#3d7ab5] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2c6494] disabled:opacity-50">{poSaving ? 'جاري الحفظ...' : 'إنشاء أمر الشراء'}</button>
                <button onClick={() => setShowPOModal(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Bill Modal */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowBillModal(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c]">فاتورة جديدة — {selectedSupplier?.name}</h2>
              <button onClick={() => setShowBillModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ الفاتورة</label>
                  <input type="date" value={billForm.billDate} onChange={(e) => setBillForm({ ...billForm, billDate: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ الاستحقاق</label>
                  <input type="date" value={billForm.dueDate} onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" /></div>
              </div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">المبلغ الإجمالي <span className="text-red-500">*</span></label>
                <input type="number" value={billForm.totalAmount} onChange={(e) => setBillForm({ ...billForm, totalAmount: e.target.value })} placeholder="0.00" min={0} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea value={billForm.notes} onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleCreateBill} disabled={billSaving || !billForm.totalAmount} className="flex-1 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07d1a] disabled:opacity-50">{billSaving ? 'جاري الحفظ...' : 'إنشاء الفاتورة'}</button>
                <button onClick={() => setShowBillModal(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay Bill Modal */}
      {showPayBillModal && payBillTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowPayBillModal(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c]">دفع فاتورة {payBillTarget.billNumber}</h2>
              <button onClick={() => setShowPayBillModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">المبلغ المتبقي: <span className="font-bold text-red-600">{formatCurrency(payBillTarget.totalAmount - payBillTarget.paidAmount)}</span></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">مبلغ الدفع <span className="text-red-500">*</span></label>
                <input type="number" value={payBillAmount} onChange={(e) => setPayBillAmount(e.target.value)} min={0} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">طريقة الدفع</label>
                <select value={payBillMethod} onChange={(e) => setPayBillMethod(Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
                  {Object.entries(PaymentMethodLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select></div>
              <div className="flex gap-3 pt-2">
                <button onClick={handlePayBill} disabled={payBillSaving || !payBillAmount} className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">{payBillSaving ? 'جاري الدفع...' : 'تأكيد الدفع'}</button>
                <button onClick={() => setShowPayBillModal(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog isOpen={!!deleteTarget} title="حذف المورد" message={`هل أنت متأكد من حذف المورد "${deleteTarget?.name || ''}"؟`} confirmLabel="حذف" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
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
