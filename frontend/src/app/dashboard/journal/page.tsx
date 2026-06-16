'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import type {
  JournalEntryDto,
  PagedResult,
} from '@/types/api';
import {
  JournalDocumentTypeLabels,
} from '@/types/api';

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA');
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

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-[#1a3a5c]">القيود المحاسبية</h1>
        <p className="text-sm text-gray-500">عرض القيود المحاسبية التفصيلية</p>
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
                  <svg className={`h-4 w-4 text-gray-400 transition-transform ${expandedId === entry.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium text-[#1a3a5c]">{entry.entryNumber}</span>
                  <span className="rounded-full bg-[#3d7ab5]/10 px-2.5 py-0.5 text-xs font-medium text-[#3d7ab5]">
                    {JournalDocumentTypeLabels[entry.documentType] || entry.documentTypeDisplay}
                  </span>
                  {entry.description && <span className="text-sm text-gray-500 max-w-[200px] truncate">{entry.description}</span>}
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
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="mt-3 text-sm text-gray-400">لا توجد قيود محاسبية</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50">السابق</button>
          <span className="text-sm text-gray-600">صفحة {page} من {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50">التالي</button>
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
