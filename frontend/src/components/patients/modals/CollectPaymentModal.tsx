'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { CreatePaymentRequest, ContractDto, PagedResult } from '../../../types/api';
import { PaymentMethodLabels } from '../../../types/api';
import { X, Wallet, Loader2 } from 'lucide-react';

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: () => void;
}

export default function CollectPaymentModal({ isOpen, onClose, patientId, onSuccess }: CollectPaymentModalProps) {
  const [contracts, setContracts] = useState<ContractDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    amount: '',
    paymentMethod: 0,
    contractId: '',
    serviceDescription: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      api.get<PagedResult<ContractDto>>(`/finance/contracts?patientId=${patientId}&pageSize=50`).then(res => {
        setContracts(res.data?.items ?? []);
      }).catch(() => {});
    }
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      setError('يرجى إدخال مبلغ صحيح');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const req: CreatePaymentRequest = {
        patientId,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        contractId: form.contractId || null,
        serviceDescription: form.serviceDescription || null,
        notes: form.notes || null,
      };
      await api.post('/finance/payments', req);
      setForm({ amount: '', paymentMethod: 0, contractId: '', serviceDescription: '', notes: '' });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600"><Wallet className="w-5 h-5" /></div>
            <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">تسجيل دفعة مالية</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">المبلغ <span className="text-red-500">*</span></label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" min={0} step="0.01" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5]" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">طريقة الدفع <span className="text-red-500">*</span></label>
              <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: Number(e.target.value) })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]">
                {Object.entries(PaymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">العقد</label>
            <select value={form.contractId} onChange={e => setForm({ ...form, contractId: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]">
              <option value="">-- بدون عقد --</option>
              {contracts.map(c => <option key={c.id} value={c.id}>عقد {formatCurrency(c.totalAmount)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">وصف الخدمة</label>
            <input type="text" value={form.serviceDescription} onChange={e => setForm({ ...form, serviceDescription: e.target.value })} placeholder="مثال: حشوة سن" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="ملاحظات..." className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving || !form.amount} className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              {saving ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-[Tajawal]">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
