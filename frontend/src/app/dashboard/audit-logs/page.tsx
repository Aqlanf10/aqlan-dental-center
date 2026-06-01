'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Pagination from '@/components/common/Pagination';
import { api } from '@/lib/api';
import type {
  AuditLogDto,
  PagedResult,
} from '@/types/api';
import {
  Shield, ChevronDown, ChevronUp,
} from 'lucide-react';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const actionOptions = [
  { value: '', label: 'كل الإجراءات' },
  { value: 'CREATE', label: 'إنشاء' },
  { value: 'UPDATE', label: 'تحديث' },
  { value: 'DELETE', label: 'حذف' },
  { value: 'LOGIN', label: 'تسجيل دخول' },
  { value: 'APPROVE', label: 'اعتماد' },
  { value: 'REJECT', label: 'رفض' },
];

const resourceOptions = [
  { value: '', label: 'كل الموارد' },
  { value: 'Patient', label: 'مريض' },
  { value: 'Invoice', label: 'فاتورة' },
  { value: 'Payment', label: 'دفعة' },
  { value: 'Expense', label: 'مصروف' },
  { value: 'Appointment', label: 'موعد' },
  { value: 'Doctor', label: 'طبيب' },
  { value: 'Supplier', label: 'مورد' },
  { value: 'VaultTransfer', label: 'تحويل' },
  { value: 'Commission', label: 'عمولة' },
];

const actionColorMap: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  APPROVE: 'bg-emerald-100 text-emerald-700',
  REJECT: 'bg-orange-100 text-orange-700',
};

function AuditLogsContent() {
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const pageSize = 25;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/audit-logs?page=${page}&pageSize=${pageSize}`;
      if (actionFilter) url += `&action=${actionFilter}`;
      if (resourceFilter) url += `&resource=${resourceFilter}`;
      if (dateFrom) url += `&dateFrom=${dateFrom}`;
      if (dateTo) url += `&dateTo=${dateTo}`;
      const res = await api.get<PagedResult<AuditLogDto>>(url);
      setLogs(res.data?.items ?? []);
      setTotalCount(res.data?.totalCount ?? 0);
    } catch {
      // silent
    }
    setLoading(false);
  }, [page, actionFilter, resourceFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const parseDetails = (details: string | null): { oldData?: Record<string, unknown>; newData?: Record<string, unknown> } | null => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-[#1a3a5c]">سجل التدقيق</h1>
        <p className="text-sm text-gray-500">سجل قراءة فقط لجميع العمليات في النظام</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
          {actionOptions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <select value={resourceFilter} onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]">
          {resourceOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#f5922e] focus:outline-none focus:ring-1 focus:ring-[#f5922e]" />
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
                <th className="px-4 py-3 text-right w-8"></th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">التوقيت</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المستخدم</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الإجراء</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المورد</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">معرّف المورد</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الملخص</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => {
                const parsed = parseDetails(log.details);
                const hasDetails = parsed && (parsed.oldData || parsed.newData);
                return (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {hasDetails && (
                          <button onClick={() => setExpandedId(expandedId === log.id ? null : log.id)} className="text-gray-400 hover:text-[#3d7ab5]">
                            {expandedId === log.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        )}
                      </td>
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
                    {expandedId === log.id && hasDetails && (
                      <tr key={`${log.id}-detail`} className="bg-gray-50">
                        <td colSpan={7} className="px-8 py-3">
                          <div className="grid gap-4 sm:grid-cols-2">
                            {parsed.oldData && Object.keys(parsed.oldData).length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold text-red-600 mb-2">البيانات القديمة</h4>
                                <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs space-y-1">
                                  {Object.entries(parsed.oldData).map(([key, value]) => (
                                    <div key={key} className="flex justify-between"><span className="text-gray-600">{key}:</span><span className="font-medium text-gray-800">{String(value)}</span></div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {parsed.newData && Object.keys(parsed.newData).length > 0 && (
                              <div>
                                <h4 className="text-xs font-bold text-green-600 mb-2">البيانات الجديدة</h4>
                                <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-xs space-y-1">
                                  {Object.entries(parsed.newData).map(([key, value]) => (
                                    <div key={key} className="flex justify-between"><span className="text-gray-600">{key}:</span><span className="font-medium text-gray-800">{String(value)}</span></div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {log.ipAddress && <p className="mt-2 text-xs text-gray-400">عنوان IP: {log.ipAddress}</p>}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Shield className="h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-bold text-[#1a3a5c]">لا توجد سجلات تدقيق</h3>
          <p className="mt-2 text-sm text-gray-500">ستظهر سجلات العمليات هنا</p>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
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
