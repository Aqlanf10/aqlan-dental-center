'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import type { DoctorDto, PagedResult } from '../../types/api';
import Pagination from '../common/Pagination';
import SearchInput from '../common/SearchInput';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import LoadingState from '../common/LoadingState';

interface DoctorListProps {
  canCreate?: boolean;
  canDelete?: boolean;
}

export default function DoctorList({ canCreate = false, canDelete = false }: DoctorListProps) {
  const router = useRouter();
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchDoctors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const result = await api.get<PagedResult<DoctorDto>>(
        `/doctors?page=${page}&pageSize=10${searchParam}`
      );
      setDoctors(result.data.items);
      setTotalCount(result.data.totalCount);
      setTotalPages(result.data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل الأطباء');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/doctors/${deleteId}`);
      setDeleteId(null);
      fetchDoctors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حذف الطبيب');
      setDeleteId(null);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">الأطباء</h1>
          <p className="text-sm text-gray-500">
            إجمالي الأطباء: {totalCount}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => router.push('/dashboard/doctors/new')}
            className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange/90"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة طبيب
          </button>
        )}
      </div>

      {/* Search */}
      <div className="max-w-md">
        <SearchInput onChange={handleSearchChange} placeholder="بحث عن طبيب..." />
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
      {!isLoading && !error && doctors.length === 0 && (
        <EmptyState
          title="لا يوجد أطباء"
          description={search ? 'لم يتم العثور على أطباء مطابقين للبحث' : 'لم يتم إضافة أي أطباء بعد'}
        />
      )}

      {/* Table */}
      {!isLoading && !error && doctors.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-right font-semibold text-navy">الاسم</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">التخصص</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">الهاتف</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">البريد الإلكتروني</th>
                    {canDelete && (
                      <th className="px-4 py-3 text-right font-semibold text-navy">إجراءات</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr
                      key={doctor.id}
                      className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-navy/5"
                      onClick={() => router.push(`/dashboard/doctors/${doctor.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {doctor.color && (
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{ backgroundColor: doctor.color }}
                            />
                          )}
                          <span className="font-medium text-navy">{doctor.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{doctor.specialty}</td>
                      <td className="px-4 py-3 text-gray-600" dir="ltr">
                        {doctor.phoneNumber || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600" dir="ltr">
                        {doctor.email || '—'}
                      </td>
                      {canDelete && (
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(doctor.id);
                            }}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            aria-label="حذف الطبيب"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="حذف الطبيب"
        message="هل أنت متأكد من حذف هذا الطبيب؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        variant="danger"
      />
    </div>
  );
}
