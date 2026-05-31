'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import type { AppointmentDto, DoctorDto, PagedResult } from '../../types/api';
import { AppointmentStatusEnum } from '../../types/api';
import Pagination from '../common/Pagination';
import SearchInput from '../common/SearchInput';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import LoadingState from '../common/LoadingState';
import StatusBadge from '../common/StatusBadge';

const statusLabels: Record<number, string> = {
  [AppointmentStatusEnum.Scheduled]: 'مجدول',
  [AppointmentStatusEnum.Confirmed]: 'مؤكد',
  [AppointmentStatusEnum.Completed]: 'مكتمل',
  [AppointmentStatusEnum.Cancelled]: 'ملغي',
  [AppointmentStatusEnum.NoShow]: 'لم يحضر',
};

function getStatusVariant(status: number): 'blue' | 'green' | 'orange' | 'red' | 'gray' {
  if (status === AppointmentStatusEnum.Scheduled) return 'blue';
  if (status === AppointmentStatusEnum.Confirmed) return 'green';
  if (status === AppointmentStatusEnum.Completed) return 'green';
  if (status === AppointmentStatusEnum.Cancelled) return 'red';
  if (status === AppointmentStatusEnum.NoShow) return 'orange';
  return 'gray';
}

interface AppointmentListProps {
  canCreate?: boolean;
  canDelete?: boolean;
  canUpdateStatus?: boolean;
}

export default function AppointmentList({
  canCreate = false,
  canDelete = false,
  canUpdateStatus = false,
}: AppointmentListProps) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    async function fetchDoctors() {
      try {
        const result = await api.get<PagedResult<DoctorDto>>('/doctors?pageSize=100');
        setDoctors(result.data.items.filter((d) => d.isActive));
      } catch {
        // Silent fail
      }
    }
    fetchDoctors();
  }, []);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
      });
      if (search) params.set('search', search);
      if (filterDoctor) params.set('doctorId', filterDoctor);
      if (filterStatus) params.set('status', filterStatus);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);

      const result = await api.get<PagedResult<AppointmentDto>>(
        `/appointments?${params.toString()}`
      );
      setAppointments(result.data.items);
      setTotalCount(result.data.totalCount);
      setTotalPages(result.data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل المواعيد');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, filterDoctor, filterStatus, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/appointments/${deleteId}`);
      setDeleteId(null);
      fetchAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حذف الموعد');
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (id: string, status: number) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      fetchAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحديث الحالة');
    }
  };

  const resetFilters = () => {
    setFilterDoctor('');
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
          <h1 className="text-2xl font-bold text-navy">المواعيد</h1>
          <p className="text-sm text-gray-500">إجمالي المواعيد: {totalCount}</p>
        </div>
        {canCreate && (
          <button
            onClick={() => router.push('/dashboard/appointments/new')}
            className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange/90"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة موعد
          </button>
        )}
      </div>

      {/* Command Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex-1 min-w-[200px]">
            <SearchInput onChange={(v) => { setSearch(v); setPage(1); }} placeholder="بحث عن موعد..." />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">الطبيب</label>
              <select
                value={filterDoctor}
                onChange={(e) => { setFilterDoctor(e.target.value); setPage(1); }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
              >
                <option value="">الكل</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">الحالة</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
              >
                <option value="">الكل</option>
                {Object.entries(AppointmentStatusEnum).map(([key, val]) => (
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
      {!isLoading && !error && appointments.length === 0 && (
        <EmptyState
          title="لا يوجد مواعيد"
          description={search || filterDoctor || filterStatus ? 'لم يتم العثور على مواعيد مطابقة للفلاتر' : 'لم يتم إضافة أي مواعيد بعد'}
        />
      )}

      {/* Table */}
      {!isLoading && !error && appointments.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3 text-right font-semibold text-navy">المريض</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">الطبيب</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">التاريخ</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">الوقت</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">الخدمة</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">الحالة</th>
                    {(canUpdateStatus || canDelete) && (
                      <th className="px-4 py-3 text-right font-semibold text-navy">إجراءات</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr
                      key={apt.id}
                      className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-navy/5"
                      onClick={() => router.push(`/dashboard/appointments/${apt.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-navy">{apt.patientName}</td>
                      <td className="px-4 py-3 text-gray-600">{apt.doctorName}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(apt.appointmentDate).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="px-4 py-3 text-gray-600" dir="ltr">
                        {apt.startTime}{apt.endTime ? ` - ${apt.endTime}` : ''}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{apt.serviceType}</td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={statusLabels[apt.status] || apt.statusDisplay}
                          variant={getStatusVariant(apt.status)}
                        />
                      </td>
                      {(canUpdateStatus || canDelete) && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {canUpdateStatus && (
                              <select
                                value={apt.status}
                                onChange={(e) => handleStatusChange(apt.id, Number(e.target.value))}
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-blue focus:outline-none"
                              >
                                {Object.entries(AppointmentStatusEnum).map(([key, val]) => (
                                  <option key={key} value={val}>{statusLabels[val]}</option>
                                ))}
                              </select>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteId(apt.id)}
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                aria-label="حذف الموعد"
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
        title="حذف الموعد"
        message="هل أنت متأكد من حذف هذا الموعد؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        variant="danger"
      />
    </div>
  );
}
