'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ClinicalProcedureDto, CreateClinicalProcedureRequest, UpdateClinicalProcedureRequest,
  UpdateClinicalProcedureStatusRequest, ClinicalProcedureStatusEnum,
} from '@/types/api';
import { api } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthContext';
import ClinicalProcedureCard from './ClinicalProcedureCard';
import ClinicalProcedureFormModal from './ClinicalProcedureFormModal';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'حدث خطأ غير متوقع';
}

interface Props {
  clinicalVisitId: string;
  isVisitActive: boolean;
}

export default function ClinicalProcedureList({ clinicalVisitId, isVisitActive }: Props) {
  const { user } = useAuth();
  const userRole = user?.role || '';
  const canEdit = ['Admin', 'Doctor'].includes(userRole);

  const [procedures, setProcedures] = useState<ClinicalProcedureDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<ClinicalProcedureDto | null>(null);

  const fetchProcedures = useCallback(async () => {
    try {
      const res = await api.get<ClinicalProcedureDto[]>(
        `/clinical-procedures/clinical-visits/${clinicalVisitId}`
      );
      setProcedures(res.data);
    } catch {
      setProcedures([]);
    } finally {
      setLoading(false);
    }
  }, [clinicalVisitId]);

  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  const handleAdd = async (data: CreateClinicalProcedureRequest | UpdateClinicalProcedureRequest) => {
    if (editingProcedure) {
      setSaving(true);
      try {
        await api.put(`/clinical-procedures/${editingProcedure.id}`, data as UpdateClinicalProcedureRequest);
        await fetchProcedures();
        setShowFormModal(false);
        setEditingProcedure(null);
      } catch (err) { alert(getErrorMessage(err)); }
      setSaving(false);
    } else {
      setSaving(true);
      try {
        await api.post(`/clinical-procedures/clinical-visits/${clinicalVisitId}`, data as CreateClinicalProcedureRequest);
        await fetchProcedures();
        setShowFormModal(false);
      } catch (err) { alert(getErrorMessage(err)); }
      setSaving(false);
    }
  };

  const handleStatusChange = async (procedureId: string, status: number) => {
    setSaving(true);
    try {
      const req: UpdateClinicalProcedureStatusRequest = { status };
      await api.patch(`/clinical-procedures/${procedureId}/status`, req);
      await fetchProcedures();
    } catch (err) { alert(getErrorMessage(err)); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإجراء؟')) return;
    try {
      await api.delete(`/clinical-procedures/${id}`);
      await fetchProcedures();
    } catch (err) { alert(getErrorMessage(err)); }
  };

  const openEdit = (procedure: ClinicalProcedureDto) => {
    if (procedure.status === ClinicalProcedureStatusEnum.Completed || procedure.status === ClinicalProcedureStatusEnum.Cancelled) return;
    setEditingProcedure(procedure);
    setShowFormModal(true);
  };

  const openAdd = () => {
    setEditingProcedure(null);
    setShowFormModal(true);
  };

  if (loading) return <p className="text-xs text-gray-400">جارٍ التحميل...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-navy">الإجراءات العلاجية</h3>
        {canEdit && isVisitActive && (
          <button onClick={openAdd} className="rounded-md bg-orange px-3 py-1 text-xs font-medium text-white hover:bg-orange-600">
            + إضافة إجراء
          </button>
        )}
      </div>
      {procedures.length > 0 ? (
        <div className="space-y-2">
          {procedures.map((proc) => (
            <ClinicalProcedureCard
              key={proc.id}
              procedure={proc}
              canEdit={canEdit}
              isVisitActive={isVisitActive}
              onEdit={openEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">لا توجد إجراءات علاجية</p>
      )}

      {showFormModal && (
        <ClinicalProcedureFormModal
          procedure={editingProcedure}
          onSave={handleAdd}
          onClose={() => { setShowFormModal(false); setEditingProcedure(null); }}
          saving={saving}
        />
      )}
    </div>
  );
}
