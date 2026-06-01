'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { CreateInvoiceRequest, ClinicServiceDto } from '../../../types/api';
import { X, Receipt, Loader2, Plus, Trash2 } from 'lucide-react';

interface NewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: () => void;
}

interface LineItemForm {
  serviceNameSnapshot: string;
  quantity: string;
  unitPrice: string;
  description: string;
}

export default function NewInvoiceModal({ isOpen, onClose, patientId, onSuccess }: NewInvoiceModalProps) {
  const [services, setServices] = useState<ClinicServiceDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    { serviceNameSnapshot: '', quantity: '1', unitPrice: '', description: '' }
  ]);

  useEffect(() => {
    if (isOpen) {
      api.get<ClinicServiceDto[]>('/clinic-services?pageSize=200').then(res => {
        const items = res.data as unknown as ClinicServiceDto[];
        setServices(Array.isArray(items) ? items.filter(s => s.isActive) : []);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const addLineItem = () => {
    setLineItems([...lineItems, { serviceNameSnapshot: '', quantity: '1', unitPrice: '', description: '' }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItemForm, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-fill from service selection
    if (field === 'serviceNameSnapshot') {
      const service = services.find(s => s.arabicName === value);
      if (service) {
        updated[index].unitPrice = service.defaultPrice.toString();
      }
    }
    setLineItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = lineItems.filter(i => i.serviceNameSnapshot && Number(i.quantity) > 0 && Number(i.unitPrice) > 0);
    if (validItems.length === 0) {
      setError('يرجى إضافة عنصر واحد على الأقل');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const req: CreateInvoiceRequest = {
        patientId,
        notes: notes || null,
        lineItems: validItems.map(i => ({
          serviceNameSnapshot: i.serviceNameSnapshot,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          description: i.description || null,
        })),
      };
      await api.post('/finance/invoices', req);
      setLineItems([{ serviceNameSnapshot: '', quantity: '1', unitPrice: '', description: '' }]);
      setNotes('');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء الفاتورة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600"><Receipt className="w-5 h-5" /></div>
            <h2 className="text-lg font-bold text-[#1a3a5c] font-[Tajawal]">فاتورة جديدة</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">عناصر الفاتورة</label>
              <button type="button" onClick={addLineItem} className="inline-flex items-center gap-1 text-xs font-medium text-[#3d7ab5] hover:underline font-[Tajawal]">
                <Plus className="w-3.5 h-3.5" /> إضافة عنصر
              </button>
            </div>
            {lineItems.map((item, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <div className="col-span-3">
                      <select value={item.serviceNameSnapshot} onChange={e => updateLineItem(idx, 'serviceNameSnapshot', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]">
                        <option value="">-- اختر الخدمة --</option>
                        {services.map(s => <option key={s.id} value={s.arabicName}>{s.arabicName} ({s.code})</option>)}
                      </select>
                    </div>
                    <input type="number" value={item.quantity} onChange={e => updateLineItem(idx, 'quantity', e.target.value)} placeholder="الكمية" min={1} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3d7ab5] focus:outline-none" />
                    <input type="number" value={item.unitPrice} onChange={e => updateLineItem(idx, 'unitPrice', e.target.value)} placeholder="السعر" min={0} step="0.01" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3d7ab5] focus:outline-none" />
                    <input type="text" value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} placeholder="وصف" className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#3d7ab5] focus:outline-none font-[Tajawal]" />
                  </div>
                  {lineItems.length > 1 && (
                    <button type="button" onClick={() => removeLineItem(idx)} className="mt-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="ملاحظات..." className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-[#3d7ab5] focus:outline-none focus:ring-1 focus:ring-[#3d7ab5] font-[Tajawal]" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07d1a] disabled:opacity-50 flex items-center justify-center gap-2 font-[Tajawal]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
              {saving ? 'جاري الإنشاء...' : 'إنشاء الفاتورة'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-[Tajawal]">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
