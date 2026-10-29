import { translate, presentError } from '../i18n/index.ts';

export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'ACCESS_DENIED'
  | 'MODULE_HIDDEN'
  | 'OWNER_LOCKOUT_PROTECTED'
  | 'RATE_LIMITED'
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'STALE_VERSION'
  | 'IDEMPOTENCY_CONFLICT'
  | 'COMMIT_OUTCOME_UNKNOWN'
  | 'DUPLICATE_BILLING'
  | 'OVERPAYMENT'
  | 'CURRENCY_MISMATCH'
  | 'OUTSIDE_WORKING_HOURS'
  | 'CLINIC_CLOSED_DAY'
  | 'DOCTOR_ON_LEAVE'
  | 'CHAIR_CAPACITY_FULL'
  | 'DOCTOR_TIME_OVERLAP'
  | 'MEDICAL_ALERT_UNACKNOWLEDGED'
  | 'INCOMPLETE_PROCEDURES'
  | 'NEGATIVE_STOCK_FORBIDDEN'
  | 'UOM_LOCKED_AFTER_MOVEMENT'
  | 'INVALID_TRANSITION'
  | 'DATABASE_IDENTITY_MISMATCH'
  | 'MIGRATION_CHECKSUM_MISMATCH'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'INTERNAL_ERROR';

const EXTRA_MESSAGES: Readonly<Record<string, readonly [string, string]>> = Object.freeze({
  UNAUTHENTICATED: ['Please sign in to continue.', 'يرجى تسجيل الدخول للمتابعة.'],
  MODULE_HIDDEN: ['This module is disabled for your account.', 'هذه الوحدة مخفية وغير مصرح بها لحسابك.'],
  OWNER_LOCKOUT_PROTECTED: ['The primary clinic owner account cannot be deactivated or stripped of governance access.', 'لا يمكن إيقاف حساب المالك الأساسي للمركز أو سحب صلاحية الإدارة منه.'],
  RATE_LIMITED: ['Too many attempts. Please wait before trying again.', 'محاولات كثيرة متتالية. يرجى الانتظار قبل إعادة المحاولة.'],
  NOT_FOUND: ['The requested record was not found or is not accessible.', 'السجل المطلوب غير موجود أو لا تملك صلاحية الوصول إليه.'],
  COMMIT_OUTCOME_UNKNOWN: ['Transaction outcome uncertain; retry with the exact same request key.', 'تعذر التحقق من اكتمال الحفظ؛ أعد المحاولة بنفس مفتاح الطلب تماماً.'],
  DUPLICATE_BILLING: ['This clinical procedure is already billed on an active invoice.', 'هذا الإجراء السريري مفوتر مسبقاً ضمن فاتورة نشطة.'],
  OUTSIDE_WORKING_HOURS: ['Appointment time falls outside configured clinic working hours.', 'وقت الموعد يقع خارج ساعات الدوام المعتمدة للمركز.'],
  CLINIC_CLOSED_DAY: ['The clinic is closed on the selected day according to operational settings.', 'المركز مغلق في هذا اليوم وفق إعدادات الدوام المعتمدة.'],
  DOCTOR_ON_LEAVE: ['The selected doctor has an approved leave on this date.', 'الطبيب المحدد في إجازة معتمدة في هذا التاريخ.'],
  CHAIR_CAPACITY_FULL: ['All active dental chairs are occupied during this time slot.', 'جميع كراسي المركز المتاحة مشغولة في هذه الفترة الزمنية.'],
  DOCTOR_TIME_OVERLAP: ['The doctor already has an overlapping appointment in this time window.', 'لدى الطبيب موعد آخر متداخل في نفس الفترة الزمنية.'],
  MEDICAL_ALERT_UNACKNOWLEDGED: ['Critical medical history alerts must be reviewed and acknowledged first.', 'يجب مراجعة وإقرار التنبيهات الطبية الحرجة للمريض أولاً.'],
  INCOMPLETE_PROCEDURES: ['All procedures in the visit must be completed before closing the visit.', 'يجب إكمال جميع إجراءات الزيارة قبل إغلاقها.'],
  NEGATIVE_STOCK_FORBIDDEN: ['Insufficient inventory stock; negative stock balances are forbidden by clinic policy.', 'الرصيد المخزني غير كافٍ؛ إعدادات المركز تمنع الرصيد السالب.'],
  UOM_LOCKED_AFTER_MOVEMENT: ['Unit of measure cannot be changed after stock movements have been recorded.', 'لا يمكن تغيير وحدة القياس للصنف بعد تسجيل حركات مخزنية عليه.'],
  DATABASE_IDENTITY_MISMATCH: ['Refusing to operate on an unrecognized or non-isolated target database.', 'رُفض الاتصال بقاعدة بيانات غير معزولة أو لا تخص هذا النظام.'],
  MIGRATION_CHECKSUM_MISMATCH: ['Applied migration checksum does not match repository SQL file.', 'بصمة ملف الهجرة لا تطابق السجل المطبق في قاعدة البيانات.'],
  TEMPORARILY_UNAVAILABLE: ['Service is temporarily busy. Safe to retry with the same request key.', 'الخدمة مشغولة مؤقتاً؛ يمكنك إعادة المحاولة بأمان بنفس مفتاح الطلب.'],
});

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, status: number, internalDetail?: string) {
    super(internalDetail ?? code);
    this.code = code;
    this.status = status;
  }
}

export function failApp(code: ErrorCode, status = 400, internalDetail?: string): never {
  throw new AppError(code, status, internalDetail);
}

export function localizeAppError(code: ErrorCode, language: 'ar' | 'en', supportRef = 'SUP-0001'): string {
  const idx = language === 'ar' ? 1 : 0;
  const custom = EXTRA_MESSAGES[code];
  if (custom !== undefined) {
    return custom[idx];
  }
  if (code === 'ACCESS_DENIED') return translate(language, 'error.ACCESS_DENIED');
  if (code === 'INVALID_INPUT') return translate(language, 'error.INVALID_INPUT');
  if (code === 'STALE_VERSION') return translate(language, 'error.STALE_VERSION');
  if (code === 'IDEMPOTENCY_CONFLICT') return translate(language, 'error.IDEMPOTENCY_CONFLICT');
  if (code === 'OVERPAYMENT') return translate(language, 'error.OVERPAYMENT');
  if (code === 'CURRENCY_MISMATCH') return translate(language, 'error.CURRENCY_MISMATCH');
  if (code === 'INVALID_TRANSITION') return translate(language, 'error.INVALID_TRANSITION');
  return presentError(language, code, supportRef);
}
