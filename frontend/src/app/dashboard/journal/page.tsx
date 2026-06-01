'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Pagination from '@/components/common/Pagination';
import { api } from '@/lib/api';
import type {
  JournalEntryDto,
  PagedResult,
} from '@/types/api';
import {
  JournalDocumentTypeLabels,
} from '@/types/api';
import {
  Plus, BookOpen, ChevronDown, ChevronUp,
  AlertCircle, XCircle,
} from 'lucide-react';

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA');
}

interface JournalLineForm {
  accountCode: string;
  accountName: string;
  debit: string;
  credit: string;
  description: string;
}

function JournalContent() {
  const [entries, setEntries] = useState<JournalEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [docTypeFilter, setDocTypeFilter] = useState<number | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formLines, setFormLines] = useState<JournalLineForm[]>([
    { accountCode: '', accountName: '', debit: '', credit: '', description: '' },
    { accountCode: '', accountName: '', debit: '', credit: '', description: '' },
  ]);
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  const pageSize = 20;

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/journal-entries?page=${page}&pageSize=${pageSize}`;
      if (docTypeFilter !== '') url += `&documentType=${docTypeFilter}`;
      if (dateFrom) url += `&dateFrom=${dateFrom}`;
      if (dateTo) url += `&dateTo=${dateTo}`;
      const res = await api.get<PagedResult<JournalEntryDto>>(url);
      setEntries(res.data?.items ?? []);
      setTotalCount(res.data?.totalCount ?? 0);
    } catch {
      // silent
    }
    setLoading(false);
  }, [page, docTypeFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const addLine = () => {
    setFormLines([...formLines, { accountCode: '', accountName: '', debit: '', credit: '', description: '' }]);
  };

  const removeLine = (index: number) => {
    if (formLines.length <= 2) return;
    setFormLines(formLines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof JournalLineForm, value: string) => {
    const updated = [...formLines];
    updated[index] = { ...updated[index], [field]: value };
    setFormLines(updated);
  };

  const totalDebit = formLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = formLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleCreate = async () => {
    if (!isBalanced) {
      setError('يجب أن يتساوى إجمالي المدين مع إجمالي الدائن');
      return;
    }
    const validLines = formLines.filter(l => l.accountCode && l.accountName && (Number(l.debit) > 0 || Number(l.credit) > 0));
    if (validLines.length < 2) {
      setError('يجب إدخال سطرين على الأقل');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/journal-entries', {
        entryDate: formDate,
        description: formDescription || null,
        documentType: 4, // Manual
        lines: validLines.map(l => ({
          accountCode: l.accountCode,
          accountName: l.accountName,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description || null,
        })),
      });
      setShowCreate(false);
      resetForm();
      loadEntries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ';
      setError(msg);
    }
    setSaving(false);
  };

  const resetForm = () => {
    setFormLines([
      { accountCode: '', accountName: '', debit: '', credit: '', description: '' },
      { accountCode: '', accountName: '', debit: '', credit: '', description: '' },
    ]);
    setFormDescription('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setError('');
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3a5c]">القيود المحاسبية</h1>
          <p className="text-sm text-gray-500">عرض القيود المحاسبية التفصيلية وإنشاء قيود يدوية</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#e07d1a]"
        >
          <Plus className="h-4 w-4" />
          قيد يدوي جديد
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <select
          value={docTypeFilter}
          onChange={(e) => { setDocTypeFilter(e.target.value === '' ? '' : Number(e.target.value)); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]"
        >
          <option value="">كل أنواع المستندات</option>
          {Object.entries(JournalDocumentTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" />
        </div>
      ) : entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {expandedId === entry.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  <span className="font-medium text-[#1a3a5c]">{entry.entryNumber}</span>
                  <span className="rounded-full bg-[#3d7ab5]/10 px-2.5 py-0.5 text-xs font-medium text-[#3d7ab5]">
                    {JournalDocumentTypeLabels[entry.documentType] || entry.documentTypeDisplay}
                  </span>
                  {entry.description && <span className="text-sm text-gray-500 max-w-[200px] truncate">{entry.description}</span>}
                  {entry.isReversal && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">عكس</span>}
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-500">{formatDate(entry.entryDate)}</span>
                  <span className="text-green-700 font-medium">{formatCurrency(entry.totalDebit)}</span>
                  <span className="text-red-700 font-medium">{formatCurrency(entry.totalCredit)}</span>
                </div>
              </button>
              {expandedId === entry.id && entry.lines && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-3 py-2 text-right font-medium text-gray-600">كود الحساب</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">اسم الحساب</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">مدين</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">دائن</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">الوصف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {entry.lines.map((line) => (
                        <tr key={line.id} className="hover:bg-white">
                          <td className="px-3 py-2 font-mono text-xs text-gray-600">{line.accountCode}</td>
                          <td className="px-3 py-2 text-gray-700">{line.accountName}</td>
                          <td className="px-3 py-2 text-green-700 font-medium">{line.debit > 0 ? formatCurrency(line.debit) : '—'}</td>
                          <td className="px-3 py-2 text-red-700 font-medium">{line.credit > 0 ? formatCurrency(line.credit) : '—'}</td>
                          <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{line.description || '—'}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-gray-300 font-bold">
                        <td className="px-3 py-2" colSpan={2}>الإجمالي</td>
                        <td className="px-3 py-2 text-green-700">{formatCurrency(entry.totalDebit)}</td>
                        <td className="px-3 py-2 text-red-700">{formatCurrency(entry.totalCredit)}</td>
                        <td className="px-3 py-2"></td>
                      </tr>
                    </tbody>
                  </table>
                  {entry.createdBy && (
                    <p className="mt-2 text-xs text-gray-400">أنشئ بواسطة: {entry.createdBy}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-bold text-[#1a3a5c]">لا توجد قيود محاسبية</h3>
          <p className="mt-2 text-sm text-gray-500">سيتم إنشاء القيود تلقائيًا من العمليات المالية</p>
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Create Journal Entry Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1a3a5c]">قيد يدوي جديد</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">تاريخ القيد</label>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">الوصف</label>
                  <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="وصف القيد..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
                </div>
              </div>

              {/* Lines */}
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-right font-medium text-gray-600">كود الحساب</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">اسم الحساب</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">مدين</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">دائن</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">الوصف</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {formLines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1.5"><input type="text" value={line.accountCode} onChange={(e) => updateLine(idx, 'accountCode', e.target.value)} placeholder="كود" className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-[#f5922e] focus:outline-none" /></td>
                        <td className="px-2 py-1.5"><input type="text" value={line.accountName} onChange={(e) => updateLine(idx, 'accountName', e.target.value)} placeholder="اسم" className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-[#f5922e] focus:outline-none" /></td>
                        <td className="px-2 py-1.5"><input type="number" value={line.debit} onChange={(e) => updateLine(idx, 'debit', e.target.value)} placeholder="0" min={0} className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-[#f5922e] focus:outline-none" /></td>
                        <td className="px-2 py-1.5"><input type="number" value={line.credit} onChange={(e) => updateLine(idx, 'credit', e.target.value)} placeholder="0" min={0} className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-[#f5922e] focus:outline-none" /></td>
                        <td className="px-2 py-1.5"><input type="text" value={line.description} onChange={(e) => updateLine(idx, 'description', e.target.value)} placeholder="وصف" className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-[#f5922e] focus:outline-none" /></td>
                        <td className="px-2 py-1.5">
                          {formLines.length > 2 && (
                            <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600"><XCircle className="h-4 w-4" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                      <td className="px-3 py-2" colSpan={2}>الإجمالي</td>
                      <td className="px-3 py-2 text-green-700">{formatCurrency(totalDebit)}</td>
                      <td className="px-3 py-2 text-red-700">{formatCurrency(totalCredit)}</td>
                      <td className="px-3 py-2" colSpan={2}>
                        {isBalanced ? (
                          <span className="text-green-600 text-xs">✓ متوازن</span>
                        ) : (
                          <span className="text-red-600 text-xs">الفرق: {formatCurrency(Math.abs(totalDebit - totalCredit))}</span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <button onClick={addLine} className="inline-flex items-center gap-1 text-sm text-[#3d7ab5] hover:text-[#2c6494] transition-colors">
                <Plus className="h-4 w-4" /> إضافة سطر
              </button>

              <div className="flex gap-3 pt-2">
                <button onClick={handleCreate} disabled={saving || !isBalanced} className="flex-1 rounded-lg bg-[#f5922e] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07d1a] disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : 'إنشاء القيد'}
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

export default function JournalPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl font-[Tajawal]">
          <JournalContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
