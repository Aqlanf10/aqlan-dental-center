'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/components/auth/AuthContext';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Pagination from '@/components/common/Pagination';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { api } from '@/lib/api';
import type {
  NotificationDto,
  PagedResult,
} from '@/types/api';
import {
  Bell, BellOff, CheckCheck, Trash2,
  DollarSign, Calendar, Receipt, Award, Settings, ArrowLeftRight,
} from 'lucide-react';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function typeIcon(type: string): { bg: string; text: string; Icon: React.ElementType } {
  const map: Record<string, { bg: string; text: string; Icon: React.ElementType }> = {
    payment: { bg: 'bg-green-100', text: 'text-green-700', Icon: DollarSign },
    appointment: { bg: 'bg-blue-100', text: 'text-blue-700', Icon: Calendar },
    expense: { bg: 'bg-red-100', text: 'text-red-700', Icon: Receipt },
    commission: { bg: 'bg-purple-100', text: 'text-purple-700', Icon: Award },
    system: { bg: 'bg-gray-100', text: 'text-gray-700', Icon: Settings },
    transfer: { bg: 'bg-yellow-100', text: 'text-yellow-700', Icon: ArrowLeftRight },
  };
  return map[type] || { bg: 'bg-gray-100', text: 'text-gray-700', Icon: Bell };
}

const notificationTypes = [
  { value: '', label: 'كل الأنواع' },
  { value: 'payment', label: 'المدفوعات' },
  { value: 'appointment', label: 'المواعيد' },
  { value: 'expense', label: 'المصروفات' },
  { value: 'commission', label: 'العمولات' },
  { value: 'system', label: 'النظام' },
  { value: 'transfer', label: 'التحويلات' },
];

function NotificationsContent() {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterUnread, setFilterUnread] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<NotificationDto | null>(null);

  const pageSize = 25;

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/notifications?page=${page}&pageSize=${pageSize}`;
      if (filterUnread) url += '&isRead=false';
      if (typeFilter) url += `&type=${typeFilter}`;
      const res = await api.get<PagedResult<NotificationDto>>(url);
      setNotifications(res.data?.items ?? []);
      setTotalCount(res.data?.totalCount ?? 0);
    } catch {
      // silent
    }
    setLoading(false);
  }, [page, filterUnread, typeFilter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id: string) => {
    try {
      await api.post('/notifications/mark-read', { notificationIds: [id] });
      loadNotifications();
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
      if (unreadIds.length === 0) return;
      await api.post('/notifications/mark-read', { notificationIds: unreadIds });
      loadNotifications();
    } catch { /* silent */ }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/notifications/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadNotifications();
    } catch { /* silent */ }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleNavigate = (n: NotificationDto) => {
    if (n.resourceType && n.resourceId) {
      const routeMap: Record<string, string> = {
        Patient: '/dashboard/patients', Invoice: '/dashboard/finance', Payment: '/dashboard/finance',
        Expense: '/dashboard/expenses', VaultTransfer: '/dashboard/vault-transfers',
        Commission: '/dashboard/commissions', Appointment: '/dashboard/appointments', Supplier: '/dashboard/suppliers',
      };
      const baseRoute = routeMap[n.resourceType];
      if (baseRoute) window.location.href = baseRoute;
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
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-[#f5922e] focus:outline-none">
            {notificationTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button onClick={() => setFilterUnread(!filterUnread)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${filterUnread ? 'border-[#f5922e] bg-[#f5922e]/10 text-[#f5922e]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            غير مقروء فقط
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="inline-flex items-center gap-1 rounded-lg bg-[#1a3a5c] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2a4a6c]">
              <CheckCheck className="h-3.5 w-3.5" /> تعيين الكل كمقروء
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
            const iconData = typeIcon(n.type);
            const IconComp = iconData.Icon;
            return (
              <div
                key={n.id}
                className={`rounded-lg border p-4 transition-colors cursor-pointer hover:bg-gray-50 ${
                  n.isRead ? 'border-gray-200 bg-white' : 'border-[#3d7ab5]/30 bg-[#3d7ab5]/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconData.bg} ${iconData.text}`}>
                    <IconComp className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-bold ${n.isRead ? 'text-gray-700' : 'text-[#1a3a5c]'}`}>{n.title}</p>
                      <div className="flex items-center gap-2">
                        {!n.isRead && <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-[#f5922e]" />}
                        {!n.isRead && (
                          <button onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }} className="rounded p-1 text-gray-400 hover:text-[#3d7ab5] hover:bg-[#3d7ab5]/5" title="تعيين كمقروء">
                            <CheckCheck className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(n); }} className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50" title="حذف">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BellOff className="h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-bold text-[#1a3a5c]">لا توجد إشعارات</h3>
          <p className="mt-2 text-sm text-gray-500">ستظهر الإشعارات هنا عند حدوثها</p>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <ConfirmDialog isOpen={!!deleteTarget} title="حذف الإشعار" message="هل أنت متأكد من حذف هذا الإشعار؟" confirmLabel="حذف" variant="danger" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
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
