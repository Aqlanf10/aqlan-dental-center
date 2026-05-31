'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthContext';
import {
  ClinicServiceDto,
  CreateClinicServiceRequest,
  UpdateClinicServiceRequest,
  SettingDto,
  UpsertSettingRequest,
  ServiceCategoryLabels,
  BranchDto,
  CreateBranchRequest,
  UpdateBranchRequest,
} from '@/types/api';
import SearchInput from '@/components/common/SearchInput';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'حدث خطأ غير متوقع';
}

type TabId = 'clinic' | 'services' | 'branches';

// ─── Clinic Settings Tab ────────────────────────────────────────────
function ClinicSettingsTab() {
  const [settings, setSettings] = useState<SettingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SettingDto[]>('/settings');
      setSettings(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const startEditing = () => {
    const vals: Record<string, string> = {};
    settings.forEach((s) => {
      vals[s.key] = s.value || '';
    });
    setEditValues(vals);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditValues({});
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const originalMap: Record<string, SettingDto> = {};
      settings.forEach((s) => {
        originalMap[s.key] = s;
      });

      for (const key of Object.keys(editValues)) {
        const original = originalMap[key];
        if (original && editValues[key] !== (original.value || '')) {
          const body: UpsertSettingRequest = {
            value: editValues[key],
            category: original.category || undefined,
          };
          await api.put(`/settings/${key}`, body);
        }
      }

      setEditing(false);
      setEditValues({});
      await fetchSettings();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  // Define display labels for known settings
  const settingLabels: Record<string, string> = {
    ClinicName: 'اسم العيادة',
    ClinicNameEn: 'اسم العيادة (إنجليزي)',
    ClinicPhone: 'هاتف العيادة',
    ClinicEmail: 'بريد العيادة الإلكتروني',
    ClinicAddress: 'عنوان العيادة',
    ClinicLogo: 'شعار العيادة',
    WorkingHoursStart: 'بداية الدوام',
    WorkingHoursEnd: 'نهاية الدوام',
    WorkingDays: 'أيام العمل',
    AppointmentDuration: 'مدة الموعد الافتراضية (دقيقة)',
    Currency: 'العملة',
    TimeZone: 'المنطقة الزمنية',
  };

  const categoryLabels: Record<string, string> = {
    General: 'عام',
    Contact: 'التواصل',
    Schedule: 'الجدول',
    Billing: 'الفوترة',
  };

  // Group settings by category
  const grouped: Record<string, SettingDto[]> = {};
  settings.forEach((s) => {
    const cat = s.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });

  if (settings.length === 0) {
    return (
      <EmptyState
        title="لا توجد إعدادات"
        description="لم يتم العثور على إعدادات العيادة"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-navy">إعدادات العيادة</h2>
          <p className="text-sm text-gray-500">إعدادات العيادة العامة والمعلومات الأساسية</p>
        </div>
        {!editing ? (
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange/90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            تعديل
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {saving && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              حفظ
            </button>
            <button
              onClick={cancelEditing}
              disabled={saving}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>
        )}
      </div>

      {/* Settings cards grouped by category */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-navy">
            {categoryLabels[category] || category}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((setting) => (
              <div key={setting.id} className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  {settingLabels[setting.key] || setting.key}
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={editValues[setting.key] ?? ''}
                    onChange={(e) =>
                      setEditValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                ) : (
                  <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-navy">
                    {setting.value || '—'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Services Management Tab ────────────────────────────────────────
function ServicesTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [services, setServices] = useState<ClinicServiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editService, setEditService] = useState<ClinicServiceDto | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formArabicName, setFormArabicName] = useState('');
  const [formEnglishName, setFormEnglishName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formCategory, setFormCategory] = useState<number>(0);
  const [formDescription, setFormDescription] = useState('');
  const [formDuration, setFormDuration] = useState(30);
  const [formPrice, setFormPrice] = useState(0);
  const [formRequiresDoctor, setFormRequiresDoctor] = useState(true);
  const [formShowInBooking, setFormShowInBooking] = useState(true);
  const [formShowInReception, setFormShowInReception] = useState(true);
  const [formShowInTreatmentPlan, setFormShowInTreatmentPlan] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState(0);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ClinicServiceDto[]>('/clinic-services');
      setServices(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const openCreate = () => {
    setEditService(null);
    setFormArabicName('');
    setFormEnglishName('');
    setFormCode('');
    setFormDepartment('');
    setFormCategory(0);
    setFormDescription('');
    setFormDuration(30);
    setFormPrice(0);
    setFormRequiresDoctor(true);
    setFormShowInBooking(true);
    setFormShowInReception(true);
    setFormShowInTreatmentPlan(true);
    setFormSortOrder(0);
    setShowModal(true);
  };

  const openEdit = (service: ClinicServiceDto) => {
    setEditService(service);
    setFormArabicName(service.arabicName);
    setFormEnglishName(service.englishName || '');
    setFormCode(service.code);
    setFormDepartment(service.department || '');
    setFormCategory(service.category);
    setFormDescription(service.description || '');
    setFormDuration(service.defaultDurationMinutes);
    setFormPrice(service.defaultPrice);
    setFormRequiresDoctor(service.requiresDoctor);
    setFormShowInBooking(service.showInBooking);
    setFormShowInReception(service.showInReception);
    setFormShowInTreatmentPlan(service.showInTreatmentPlan);
    setFormSortOrder(service.sortOrder);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formArabicName.trim() || !formCode.trim()) return;

    setSaving(true);
    try {
      if (editService) {
        const body: UpdateClinicServiceRequest = {
          arabicName: formArabicName,
          englishName: formEnglishName || null,
          code: formCode,
          department: formDepartment || null,
          category: formCategory,
          description: formDescription || null,
          defaultDurationMinutes: formDuration,
          defaultPrice: formPrice,
          requiresDoctor: formRequiresDoctor,
          showInBooking: formShowInBooking,
          showInReception: formShowInReception,
          showInTreatmentPlan: formShowInTreatmentPlan ? 1 : 0,
          sortOrder: formSortOrder,
        };
        await api.put(`/clinic-services/${editService.id}`, body);
      } else {
        const body: CreateClinicServiceRequest = {
          arabicName: formArabicName,
          englishName: formEnglishName || null,
          code: formCode,
          department: formDepartment || null,
          category: formCategory,
          description: formDescription || null,
          defaultDurationMinutes: formDuration,
          defaultPrice: formPrice,
          requiresDoctor: formRequiresDoctor,
          showInBooking: formShowInBooking,
          showInReception: formShowInReception,
          showInTreatmentPlan: formShowInTreatmentPlan,
          sortOrder: formSortOrder,
        };
        await api.post('/clinic-services', body);
      }
      setShowModal(false);
      await fetchServices();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (service: ClinicServiceDto) => {
    try {
      await api.put(`/clinic-services/${service.id}`, {
        ...service,
        isActive: !service.isActive,
      });
      await fetchServices();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  // Filter services
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      !search ||
      s.arabicName.includes(search) ||
      s.englishName.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === '' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-navy">إدارة الخدمات</h2>
          <p className="text-sm text-gray-500">
            إجمالي الخدمات: {services.length} | النشطة: {services.filter((s) => s.isActive).length}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange/90"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة خدمة
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full max-w-xs">
          <SearchInput onChange={setSearch} placeholder="بحث عن خدمة..." />
        </div>
        <div className="w-full max-w-xs">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-3 pl-8 text-sm text-navy focus:border-orange focus:outline-none focus:ring-2 focus:ring-orange/20"
          >
            <option value="">جميع التصنيفات</option>
            {Object.entries(ServiceCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingState />}

      {/* Empty */}
      {!loading && !error && filteredServices.length === 0 && (
        <EmptyState
          title="لا توجد خدمات"
          description={
            search || categoryFilter !== ''
              ? 'لم يتم العثور على خدمات مطابقة للبحث'
              : 'لم يتم إضافة أي خدمات بعد'
          }
        />
      )}

      {/* Table */}
      {!loading && !error && filteredServices.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-right font-semibold text-navy">الرمز</th>
                  <th className="px-4 py-3 text-right font-semibold text-navy">الاسم العربي</th>
                  <th className="px-4 py-3 text-right font-semibold text-navy">التصنيف</th>
                  <th className="px-4 py-3 text-right font-semibold text-navy">المدة</th>
                  <th className="px-4 py-3 text-right font-semibold text-navy">السعر</th>
                  <th className="px-4 py-3 text-right font-semibold text-navy">الحالة</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-right font-semibold text-navy">إجراءات</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service) => (
                  <tr
                    key={service.id}
                    className="border-b border-gray-100 transition-colors hover:bg-navy/5"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{service.code}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-navy">{service.arabicName}</span>
                        {service.englishName && (
                          <span className="mr-2 text-xs text-gray-400">({service.englishName})</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-navy/10 px-2.5 py-1 text-xs font-medium text-navy">
                        {service.categoryDisplay || ServiceCategoryLabels[service.category] || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{service.defaultDurationMinutes} د</td>
                    <td className="px-4 py-3 text-gray-600">{service.defaultPrice}</td>
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <button
                          onClick={() => toggleActive(service)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            service.isActive ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                          aria-label={service.isActive ? 'إلغاء تفعيل الخدمة' : 'تفعيل الخدمة'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              service.isActive ? '-translate-x-6' : '-translate-x-1'
                            }`}
                          />
                        </button>
                      ) : (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            service.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {service.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openEdit(service)}
                          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          aria-label="تعديل الخدمة"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
      )}

      {/* Service Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setShowModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-bold text-navy">
              {editService ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Arabic & English Names */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    الاسم العربي <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formArabicName}
                    onChange={(e) => setFormArabicName(e.target.value)}
                    required
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">الاسم الإنجليزي</label>
                  <input
                    type="text"
                    value={formEnglishName}
                    onChange={(e) => setFormEnglishName(e.target.value)}
                    dir="ltr"
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>

              {/* Code & Department */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    الرمز <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    required
                    dir="ltr"
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">القسم</label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>

              {/* Category & Duration */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">التصنيف</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(Number(e.target.value))}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  >
                    {Object.entries(ServiceCategoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    المدة الافتراضية (دقيقة)
                  </label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    min={1}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>

              {/* Price & Sort Order */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">السعر الافتراضي</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    min={0}
                    step={0.01}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">ترتيب الفرز</label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    min={0}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">الوصف</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>

              {/* Boolean toggles */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formRequiresDoctor}
                    onChange={(e) => setFormRequiresDoctor(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-orange focus:ring-orange"
                  />
                  يتطلب طبيب
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formShowInBooking}
                    onChange={(e) => setFormShowInBooking(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-orange focus:ring-orange"
                  />
                  ظاهر في الحجز
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formShowInReception}
                    onChange={(e) => setFormShowInReception(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-orange focus:ring-orange"
                  />
                  ظاهر في الاستقبال
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={formShowInTreatmentPlan}
                    onChange={(e) => setFormShowInTreatmentPlan(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-orange focus:ring-orange"
                  />
                  ظاهر في خطة العلاج
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t border-gray-100 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? 'جارٍ الحفظ...' : editService ? 'تحديث' : 'إنشاء'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Settings Content ──────────────────────────────────────────
export default function SettingsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [activeTab, setActiveTab] = useState<TabId>('clinic');

  const tabs: { id: TabId; label: string; adminOnly?: boolean }[] = [
    { id: 'clinic', label: 'العيادة' },
    { id: 'services', label: 'الخدمات', adminOnly: true },
    { id: 'branches', label: 'الفروع', adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">الإعدادات</h1>
        <p className="text-sm text-gray-500">إدارة إعدادات العيادة والخدمات</p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-orange text-orange'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'clinic' && <ClinicSettingsTab />}
      {activeTab === 'services' && <ServicesTab />}
      {activeTab === 'branches' && <BranchesTab />}
    </div>
  );
}

// ─── Branches Management Tab ────────────────────────────────────────
function BranchesTab() {
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState<BranchDto | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', address: '', phone: '', isMain: false });

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<BranchDto[]>('/branches');
      setBranches(res.data || []);
    } catch { setBranches([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const openCreate = () => {
    setEditBranch(null);
    setForm({ name: '', address: '', phone: '', isMain: false });
    setShowModal(true);
  };

  const openEdit = (b: BranchDto) => {
    setEditBranch(b);
    setForm({ name: b.name, address: b.address || '', phone: b.phone || '', isMain: b.isMain });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editBranch) {
        const req: UpdateBranchRequest = {
          name: form.name, address: form.address || null, phone: form.phone || null,
          isMain: form.isMain ? true : null,
        };
        await api.put(`/branches/${editBranch.id}`, req);
      } else {
        const req: CreateBranchRequest = {
          name: form.name, address: form.address || null, phone: form.phone || null, isMain: form.isMain,
        };
        await api.post('/branches', req);
      }
      setShowModal(false);
      fetchBranches();
    } catch { /* error */ }
    setSaving(false);
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-navy">إدارة الفروع</h2>
          <p className="text-sm text-gray-500">إجمالي الفروع: {branches.length}</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-medium text-white hover:bg-orange/90">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          إضافة فرع
        </button>
      </div>

      {branches.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <div key={b.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-navy">{b.name}</h3>
                    {b.isMain && (
                      <span className="rounded-full bg-orange/10 px-2 py-0.5 text-[10px] font-bold text-orange">رئيسي</span>
                    )}
                  </div>
                  {b.address && <p className="mt-1 text-sm text-gray-500">{b.address}</p>}
                  {b.phone && <p className="text-sm text-gray-500">هاتف: {b.phone}</p>}
                </div>
                <button onClick={() => openEdit(b)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد فروع" description="لم يتم إضافة أي فروع بعد" />
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">{editBranch ? 'تعديل الفرع' : 'إضافة فرع جديد'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">اسم الفرع <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم الفرع"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">العنوان</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="عنوان الفرع"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">هاتف</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="رقم الهاتف"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.isMain} onChange={(e) => setForm({ ...form, isMain: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-orange focus:ring-orange" />
                فرع رئيسي
              </label>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving || !form.name}
                  className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50">
                  {saving ? 'جاري الحفظ...' : editBranch ? 'تحديث' : 'إنشاء'}
                </button>
                <button onClick={() => setShowModal(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
