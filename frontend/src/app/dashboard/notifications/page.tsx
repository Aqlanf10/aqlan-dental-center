'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { api } from '@/lib/api';
import type {
  NotificationDto,
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

function typeIcon(type: string): { bg: string; text: string; label: string } {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    payment: { bg: 'bg-green-100', text: 'text-green-700', label: 'د' },
    appointment: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'م' },
    expense: { bg: 'bg-red-100', text: 'text-red-700', label: 'ص' },
    commission: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'ع' },
    system: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'ن' },
    transfer: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'ت' },
  };
  return map[type] || { bg: 'bg-gray-100', text: 'text-gray-700', label: '?' };
}

function NotificationsContent() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterUnread, setFilterUnread] = useState(false);

  const pageSize = 25;

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/notifications?page=${page}&pageSize=${pageSize}`;
      if (filterUnread) url += '&isRead=false';
      const res = await api.get<PagedResult<NotificationDto>>(url);
      setNotifications(res.data?.items ?? []);
      setTotalCount(res.data?.totalCount ?? 0);
    } catch {
      // silent
    }
    setLoading(false);
  }, [page, filterUnread]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id: string) => {
    try {
      await api.post('/notifications/mark-read', { notificationIds: [id] });
      loadNotifications();
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
      if (unreadIds.length === 0) return;
      await api.post('/notifications/mark-read', { notificationIds: unreadIds });
      loadNotifications();
    } catch {
      // silent
    }
  };

  const handleNavigate = (n: NotificationDto) => {
    if (n.resourceType && n.resourceId) {
      const routeMap: Record<string, string> = {
        Patient: '/dashboard/patients',
        Invoice: '/dashboard/finance',
        Payment: '/dashboard/finance',
        Expense: '/dashboard/expenses',
        VaultTransfer: '/dashboard/vault-transfers',
        Commission: '/dashboard/commissions',
        Appointment: '/dashboard/appointments',
        Supplier: '/dashboard/suppliers',
      };
      const baseRoute = routeMap[n.resourceType];
      if (baseRoute) {
        window.location.href = baseRoute;
      }
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3a5c]">الإشعارات</h1>
          <p className="text-sm text-gray-500">
            {unreadCount > 0 ? `لديك ${unreadCount} إشعار غير مقروء` : 'لا توجد إشعارات غير مقروءة'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setFilterUnread(!filterUnread)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              filterUnread ? 'border-[#f5922e] bg-[#f5922e]/10 text-[#f5922e]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            غير مقروء فقط
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="rounded-lg bg-[#1a3a5c] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2a4a6c]">
              تعيين الكل كمقروء
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f5922e] border-t-transparent" />
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n) => {
            const icon = typeIcon(n.type);
            return (
              <div
                key={n.id}
                className={`rounded-lg border p-4 transition-colors cursor-pointer hover:bg-gray-50 ${
                  n.isRead ? 'border-gray-200 bg-white' : 'border-[#3d7ab5]/30 bg-[#3d7ab5]/5'
                }`}
                onClick={() => {
                  if (!n.isRead) handleMarkRead(n.id);
                  if (n.resourceType && n.resourceId) handleNavigate(n);
                }}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${icon.bg} ${icon.text}`}>
                    {icon.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-bold ${n.isRead ? 'text-gray-700' : 'text-[#1a3a5c]'}`}>{n.title}</p>
                      {!n.isRead && (
                        <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-[#f5922e]" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">{n.message}</p>
                    <p className="mt-1 text-xs text-gray-400">{formatDate(n.createdAt)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="mt-3 text-sm text-gray-400">لا توجد إشعارات</p>
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

export default function NotificationsPage() {
  return (
    <AuthProvider>
      <DashboardLayout>
        <div className="mx-auto max-w-4xl font-[Tajawal]">
          <NotificationsContent />
        </div>
      </DashboardLayout>
    </AuthProvider>
  );
}
