'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import type { BookingRequestDto, PagedResult } from '../../types/api';
import { BookingRequestStatusEnum } from '../../types/api';
import Pagination from '../common/Pagination';
import SearchInput from '../common/SearchInput';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import LoadingState from '../common/LoadingState';
import StatusBadge from '../common/StatusBadge';

const statusLabels: Record<number, string> = {
  [BookingRequestStatusEnum.New]: 'جديد',
  [BookingRequestStatusEnum.Contacted]: 'تم التواصل',
  [BookingRequestStatusEnum.Approved]: 'تمت الموافقة',
  [BookingRequestStatusEnum.Rejected]: 'مرفوض',
  [BookingRequestStatusEnum.ConvertedToAppointment]: 'تم التحويل',
  [BookingRequestStatusEnum.Cancelled]: 'ملغي',
};

function getStatusVariant(status: number): 'blue' | 'green' | 'orange' | 'red' | 'gray' {
  if (status === BookingRequestStatusEnum.New) return 'blue';
  if (status === BookingRequestStatusEnum.Contacted) return 'orange';
  if (status === BookingRequestStatusEnum.Approved) return 'green';
  if (status === BookingRequestStatusEnum.Rejected) return 'red';
  if (status === BookingRequestStatusEnum.ConvertedToAppointment) return 'green';
  if (status === BookingRequestStatusEnum.Cancelled) return 'red';
  return 'gray';
}

interface BookingRequestListProps {
  canDelete?: boolean;
  canUpdateStatus?: boolean;
  canConvert?: boolean;
}

export default function BookingRequestList({
  canDelete = false,
  canUpdateStatus = false,
  canConvert = false,
}: BookingRequestListProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<BookingRequestDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
      });
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);

      const result = await api.get<PagedResult<BookingRequestDto>>(
        `/booking-requests?${params.toString()}`
      );
      setRequests(result.data.items);
      setTotalCount(result.data.totalCount);
      setTotalPages(result.data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل طلبات الحجز');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, filterStatus, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/booking-requests/${deleteId}`);
      setDeleteId(null);
      fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حذف الطلب');
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (id: string, status: number) => {
    try {
      await api.patch(`/booking-requests/${id}/status`, { status });
      fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث الحالة');
    }
  };

  const handleConvert = async (id: string) => {
    try {
      await api.post(`/booking-requests/${id}/convert`);
      fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحويل الطلب إلى موعد');
    }
  };

  const resetFilters = () => {
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">طلبات الحجز</h1>
          <p className="text-sm text-gray-500">إجمالي الطلبات: {totalCount}</p>
        </div>
      </div>

      {/* Command Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex-1 min-w-[200px]">
            <SearchInput onChange={(v) => { setSearch(v); setPage(1); }} placeholder="بحث عن طلب حجز..." />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">الحالة</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
              >
                <option value="">الكل</option>
                {Object.entries(BookingRequestStatusEnum).map(([key, val]) => (
                  <option key={key} value={val}>{statusLabels[val]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">من تاريخ</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                dir="ltr"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">إلى تاريخ</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                dir="ltr"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
              />
            </div>
            <button
              onClick={resetFilters}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && <LoadingState />}

      {/* Empty */}
      {!isLoading && !error && requests.length === 0 && (
        <EmptyState
          title="لا يوجد طلبات حجز"
          description={search || filterStatus ? 'لم يتم العثور على طلبات مطابقة للفلاتر' : 'لم يتم استلام أي طلبات حجز بعد'}
        />
      )}

      {/* Table */}
      {!isLoading && !error && requests.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3 text-right font-semibold text-navy">اسم المريض</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">الهاتف</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">الخدمة</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">الحالة</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">التاريخ</th>
                    {(canUpdateStatus || canConvert || canDelete) && (
                      <th className="px-4 py-3 text-right font-semibold text-navy">إجراءات</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr
                      key={req.id}
                      className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-navy/5"
                      onClick={() => router.push(`/dashboard/booking-requests/${req.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-navy">{req.patientName}</td>
                      <td className="px-4 py-3 text-gray-600" dir="ltr">{req.phoneNumber}</td>
                      <td className="px-4 py-3 text-gray-600">{req.serviceType}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={statusLabels[req.status] || req.statusDisplay}
                          variant={getStatusVariant(req.status)}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(req.createdAt).toLocaleDateString('ar-SA')}
                      </td>
                      {(canUpdateStatus || canConvert || canDelete) && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {canUpdateStatus && (
                              <select
                                value={req.status}
                                onChange={(e) => handleStatusChange(req.id, Number(e.target.value))}
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-blue focus:outline-none"
                              >
                                {Object.entries(BookingRequestStatusEnum).map(([key, val]) => (
                                  <option key={key} value={val}>{statusLabels[val]}</option>
                                ))}
                              </select>
                            )}
                            {canConvert && req.status === BookingRequestStatusEnum.Approved && (
                              <button
                                onClick={() => handleConvert(req.id)}
                                className="rounded-lg bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                                title="تحويل إلى موعد"
                              >
                                تحويل
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteId(req.id)}
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                aria-label="حذف الطلب"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="حذف طلب الحجز"
        message="هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        variant="danger"
      />
    </div>
  );
}
