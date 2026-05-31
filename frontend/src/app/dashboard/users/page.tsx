'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import ConfirmDialog from '@/components/common/ConfirmDialog';

interface UserListDto {
  id: string;
  email: string;
  fullName: string;
  fullNameAr?: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

const ROLE_OPTIONS = [
  { value: '', label: 'جميع الأدوار' },
  { value: 'Admin', label: 'مدير' },
  { value: 'Doctor', label: 'طبيب' },
  { value: 'Reception', label: 'استقبال' },
  { value: 'Accountant', label: 'محاسب' },
  { value: 'Patient', label: 'مريض' },
];

const ROLE_LABELS: Record<string, string> = {
  Admin: 'مدير',
  Doctor: 'طبيب',
  Reception: 'استقبال',
  Accountant: 'محاسب',
  Patient: 'مريض',
};

const ROLE_COLORS: Record<string, string> = {
  Admin: 'bg-red-100 text-red-800',
  Doctor: 'bg-blue-100 text-blue-800',
  Reception: 'bg-green-100 text-green-800',
  Accountant: 'bg-purple-100 text-purple-800',
  Patient: 'bg-gray-100 text-gray-800',
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserListDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListDto | null>(null);
  const [tempPassword, setTempPassword] = useState('');

  // Create form state
  const [createForm, setCreateForm] = useState({
    email: '', password: '', fullName: '', fullNameAr: '', role: 'Doctor',
  });
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);

      const response = await api.get<{ items: UserListDto[]; totalCount: number; page: number; pageSize: number; totalPages: number }>(`/users?${params.toString()}`);
      setUsers(response.data.items || []);
      setTotalCount(response.data.totalCount || 0);
    } catch {
      setError('فشل في تحميل المستخدمين');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setIsCreating(true);
    try {
      await api.post('/users', createForm);
      setShowCreateModal(false);
      setCreateForm({ email: '', password: '', fullName: '', fullNameAr: '', role: 'Doctor' });
      fetchUsers();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'فشل في إنشاء المستخدم';
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (user: UserListDto) => {
    setConfirmDialog({
      isOpen: true,
      title: user.isActive ? 'تعطيل المستخدم' : 'تفعيل المستخدم',
      message: user.isActive
        ? `هل أنت متأكد من تعطيل المستخدم "${user.fullName}"؟`
        : `هل أنت متأكد من تفعيل المستخدم "${user.fullName}"؟`,
      onConfirm: async () => {
        try {
          await api.put(`/users/${user.id}/status`);
          fetchUsers();
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'فشل في تحديث الحالة';
          alert(msg);
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDelete = async (user: UserListDto) => {
    setConfirmDialog({
      isOpen: true,
      title: 'حذف المستخدم',
      message: `هل أنت متأكد من حذف المستخدم "${user.fullName}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      onConfirm: async () => {
        try {
          await api.delete(`/users/${user.id}`);
          fetchUsers();
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'فشل في حذف المستخدم';
          alert(msg);
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleResetPassword = async (user: UserListDto) => {
    setSelectedUser(user);
    setTempPassword('');
    setShowResetModal(true);
  };

  const confirmResetPassword = async () => {
    if (!selectedUser) return;
    try {
      const response = await api.post<{ tempPassword?: string; message?: string }>(`/users/${selectedUser.id}/reset-password`);
      setTempPassword(response.data.tempPassword || '');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'فشل في إعادة تعيين كلمة المرور';
      alert(msg);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">إدارة المستخدمين</h1>
          <p className="text-sm text-gray-500 mt-1">{totalCount} مستخدم مسجل</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-light transition-colors"
        >
          + إضافة مستخدم
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="بحث بالاسم أو البريد الإلكتروني..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue focus:ring-1 focus:ring-blue"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue focus:ring-1 focus:ring-blue"
        >
          {ROLE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
      )}

      {/* Users Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الاسم</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">البريد الإلكتروني</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الدور</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">آخر دخول</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">جاري التحميل...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">لا يوجد مستخدمين</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy">{user.fullName}</div>
                      {user.fullNameAr && <div className="text-xs text-gray-400">{user.fullNameAr}</div>}
                      {user.mustChangePassword && (
                        <span className="inline-block mt-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">
                          يجب تغيير كلمة المرور
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600" dir="ltr">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800'}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('ar') : 'لم يسجل دخول'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`rounded px-2 py-1 text-xs ${user.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={user.isActive ? 'تعطيل' : 'تفعيل'}
                        >
                          {user.isActive ? 'تعطيل' : 'تفعيل'}
                        </button>
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                          title="إعادة تعيين كلمة المرور"
                        >
                          كلمة المرور
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          title="حذف"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            السابق
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">
            صفحة {page} من {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            التالي
          </button>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-navy mb-4">إضافة مستخدم جديد</h2>
            {createError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{createError}</div>
            )}
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">الاسم الكامل</label>
                <input
                  type="text" value={createForm.fullName}
                  onChange={(e) => setCreateForm(p => ({ ...p, fullName: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue focus:ring-1 focus:ring-blue"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">الاسم بالعربي (اختياري)</label>
                <input
                  type="text" value={createForm.fullNameAr}
                  onChange={(e) => setCreateForm(p => ({ ...p, fullNameAr: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue focus:ring-1 focus:ring-blue"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">البريد الإلكتروني</label>
                <input
                  type="email" value={createForm.email} dir="ltr"
                  onChange={(e) => setCreateForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue focus:ring-1 focus:ring-blue"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">كلمة المرور</label>
                <input
                  type="password" value={createForm.password} dir="ltr"
                  onChange={(e) => setCreateForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue focus:ring-1 focus:ring-blue"
                  required minLength={8}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">الدور</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue focus:ring-1 focus:ring-blue"
                >
                  {ROLE_OPTIONS.filter(r => r.value).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit" disabled={isCreating}
                  className="flex-1 rounded-lg bg-navy py-2 text-sm font-medium text-white hover:bg-navy-light disabled:opacity-60"
                >
                  {isCreating ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
                </button>
                <button
                  type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-navy mb-4">
              إعادة تعيين كلمة المرور - {selectedUser.fullName}
            </h2>
            {tempPassword ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                  <p className="text-sm text-green-800 font-medium mb-2">تم إعادة تعيين كلمة المرور بنجاح!</p>
                  <p className="text-sm text-green-600">كلمة المرور المؤقتة:</p>
                  <div className="mt-1 rounded bg-white border border-green-300 p-3 font-mono text-lg text-center" dir="ltr">
                    {tempPassword}
                  </div>
                  <p className="mt-2 text-xs text-green-500">يرجى إرسال هذه الكلمة للمستخدم. سيُطلب منه تغييرها عند تسجيل الدخول.</p>
                </div>
                <button
                  onClick={() => { setShowResetModal(false); setTempPassword(''); setSelectedUser(null); }}
                  className="w-full rounded-lg bg-navy py-2 text-sm font-medium text-white hover:bg-navy-light"
                >
                  إغلاق
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  سيتم إنشاء كلمة مرور مؤقتة للمستخدم &quot;{selectedUser.fullName}&quot; وسيُطلب منه تغييرها عند تسجيل الدخول.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmResetPassword}
                    className="flex-1 rounded-lg bg-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange/80"
                  >
                    إعادة تعيين
                  </button>
                  <button
                    onClick={() => { setShowResetModal(false); setSelectedUser(null); }}
                    className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
