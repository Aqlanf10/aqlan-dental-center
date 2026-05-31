'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import type {
  AuditLogDto,
  PagedResult,
} from '@/types/api';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AuditLogsContent() {
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const pageSize = 25;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/audit-logs?page=${page}&pageSize=${pageSize}`;
      if (userIdFilter) url += `&userId=${userIdFilter}`;
      if (resourceFilter) url += `&resource=${resourceFilter}`;
      if (actionFilter) url += `&action=${actionFilter}`;
      if (dateFrom) url += `&dateFrom=${dateFrom}`;
      if (dateTo) url += `&dateTo=${dateTo}`;
      const res = await api.get<PagedResult<AuditLogDto>>(url);
      setLogs(res.data?.items ?? []);
      setTotalCount(res.data?.totalCount ?? 0);
    } catch {
      // silent
    }
    setLoading(false);
  }, [page, userIdFilter, resourceFilter, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const actionColorMap: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-700',
    UPDATE: 'bg-blue-100 text-blue-700',
    DELETE: 'bg-red-100 text-red-700',
    LOGIN: 'bg-purple-100 text-purple-700',
    APPROVE: 'bg-emerald-100 text-emerald-700',
    REJECT: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-[#1a3a5c]">سجل التدقيق</h1>
        <p className="text-sm text-gray-500">سجل قراءة فقط لجميع العمليات في النظام</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <input
          type="text"
          value={userIdFilter}
          onChange={(e) => { setUserIdFilter(e.target.value); setPage(1); }}
          placeholder="معرّف المستخدم..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e] sm:w-48"
        />
        <input
          type="text"
          value={resourceFilter}
          onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
          placeholder="المورد (مثل: Patient, Invoice)..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e] sm:w-48"
        />
        <input
          type="text"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          placeholder="الإجراء (مثل: CREATE, UPDATE)..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e] sm:w-48"
        />
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
      ) : logs.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-right font-medium text-gray-600">التوقيت</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المستخدم</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الإجراء</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المورد</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">معرّف المورد</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                  <td className="px-4 py-3 font-medium text-[#1a3a5c]">{log.userName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${actionColorMap[log.action] || 'bg-gray-100 text-gray-700'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{log.resource}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[120px] truncate">{log.resourceId || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[250px] truncate">{log.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <p className="mt-3 text-sm text-gray-400">لا توجد سجلات تدقيق</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50">السابق</button>
          <span className="text-sm text-gray-600">صفحة {page} من {totalPages} ({totalCount} سجل)</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50">التالي</button>
        </div>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-7xl font-[Tajawal]">
          <AuditLogsContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
