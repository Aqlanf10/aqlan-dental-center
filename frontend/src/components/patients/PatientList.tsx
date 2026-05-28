'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import type { PatientDto, PagedResult } from '../../types/api';
import Pagination from '../common/Pagination';
import SearchInput from '../common/SearchInput';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import LoadingState from '../common/LoadingState';

export default function PatientList() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const result = await api.get<PagedResult<PatientDto>>(
        `/patients?page=${page}&pageSize=10${searchParam}`
      );
      setPatients(result.data.items);
      setTotalCount(result.data.totalCount);
      setTotalPages(result.data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل المرضى');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/patients/${deleteId}`);
      setDeleteId(null);
      fetchPatients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حذف المريض');
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
          <h1 className="text-2xl font-bold text-navy">المرضى</h1>
          <p className="text-sm text-gray-500">
            إجمالي المرضى: {totalCount}
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/patients/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange/90"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          إضافة مريض
        </button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <SearchInput onChange={handleSearchChange} placeholder="بحث عن مريض..." />
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
      {!isLoading && !error && patients.length === 0 && (
        <EmptyState
          title="لا يوجد مرضى"
          description={search ? 'لم يتم العثور على مرضى مطابقين للبحث' : 'لم يتم إضافة أي مرضى بعد'}
        />
      )}

      {/* Table */}
      {!isLoading && !error && patients.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-right font-semibold text-navy">رقم المريض</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">الاسم</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">الجنس</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">الهاتف</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">تاريخ الإنشاء</th>
                    <th className="px-4 py-3 text-right font-semibold text-navy">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-navy/5"
                      onClick={() => router.push(`/dashboard/patients/${patient.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-blue">
                        {patient.patientNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-navy">
                        {patient.fullName}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {patient.genderDisplay}
                      </td>
                      <td className="px-4 py-3 text-gray-600 direction-ltr">
                        {patient.phoneNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(patient.createdAt).toLocaleDateString('ar-SA')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(patient.id);
                          }}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          aria-label="حذف المريض"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
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
        title="حذف المريض"
        message="هل أنت متأكد من حذف هذا المريض؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        variant="danger"
      />
    </div>
  );
}
