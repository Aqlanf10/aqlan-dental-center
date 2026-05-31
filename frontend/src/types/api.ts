// Pagination
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Patient
export interface PatientDto {
  id: string;
  patientNumber: string;
  fullName: string;
  gender: number;
  genderDisplay: string;
  dateOfBirth: string | null;
  phoneNumber: string;
  whatsAppNumber: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientRequest {
  fullName: string;
  gender: number;
  dateOfBirth?: string | null;
  phoneNumber: string;
  whatsAppNumber?: string | null;
  address?: string | null;
  notes?: string | null;
}

export type UpdatePatientRequest = CreatePatientRequest;

// Doctor
export interface DoctorDto {
  id: string;
  fullName: string;
  specialty: string;
  phoneNumber: string | null;
  email: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDoctorRequest {
  fullName: string;
  specialty: string;
  phoneNumber?: string | null;
  email?: string | null;
  color?: string | null;
}

export type UpdateDoctorRequest = CreateDoctorRequest;

// User roles
export type UserRole = 'Admin' | 'Doctor' | 'Reception' | 'Accountant' | 'Patient';

// Appointment
export interface AppointmentDto {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string | null;
  serviceType: string;
  status: number;
  statusDisplay: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentRequest {
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string | null;
  serviceType: string;
  notes?: string | null;
}

export type UpdateAppointmentRequest = CreateAppointmentRequest;

export interface UpdateAppointmentStatusRequest {
  status: number;
}

// Booking Request
export interface BookingRequestDto {
  id: string;
  patientName: string;
  phoneNumber: string;
  serviceType: string;
  preferredDoctorId: string | null;
  preferredDoctorName: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  notes: string | null;
  status: number;
  statusDisplay: string;
  linkedPatientId: string | null;
  linkedPatientName: string | null;
  convertedAppointmentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePublicBookingRequest {
  patientName: string;
  phoneNumber: string;
  serviceType: string;
  preferredDoctorId?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  notes?: string | null;
}

export interface UpdateBookingRequestStatusRequest {
  status: number;
}

export interface ConvertToAppointmentResult {
  appointment: AppointmentDto;
  bookingRequest: BookingRequestDto;
  patientCreated: boolean;
}

// Enums
export const AppointmentStatusEnum = {
  Scheduled: 0,
  Confirmed: 1,
  Completed: 2,
  Cancelled: 3,
  NoShow: 4,
} as const;

export const BookingRequestStatusEnum = {
  New: 0,
  Contacted: 1,
  Approved: 2,
  Rejected: 3,
  ConvertedToAppointment: 4,
  Cancelled: 5,
} as const;

export const ServiceTypesList = [
  'تقويم الأسنان',
  'زراعة الأسنان',
  'تجميل الأسنان',
  'علاج الأسنان العام',
  'جراحة الفم',
] as const;

// Daily Visit
export const DailyVisitTypeEnum = {
  Scheduled: 0,
  WalkIn: 1,
} as const;

export const DailyVisitStatusEnum = {
  Scheduled: 0,
  CheckedIn: 1,
  Waiting: 2,
  ReadyForDoctor: 3,
  InProgress: 4,
  Completed: 5,
  Cancelled: 6,
  NoShow: 7,
} as const;

export interface DailyVisitDto {
  id: string;
  patientId: string;
  patientName: string;
  patientNumber: string | null;
  doctorId: string | null;
  doctorName: string | null;
  appointmentId: string | null;
  visitDate: string;
  visitType: number;
  visitTypeDisplay: string;
  status: number;
  statusDisplay: string;
  arrivalTime: string | null;
  chiefComplaint: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TodayDailyVisitsDto {
  date: string;
  totalAppointments: number;
  checkedInCount: number;
  waitingCount: number;
  readyForDoctorCount: number;
  inProgressCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  todayAppointments: AppointmentDto[];
  visits: DailyVisitDto[];
}

export interface CheckInAppointmentRequest {
  chiefComplaint?: string | null;
  notes?: string | null;
}

export interface CreateWalkInVisitRequest {
  patientId: string;
  doctorId?: string | null;
  visitDate?: string | null;
  chiefComplaint?: string | null;
  notes?: string | null;
}

export interface UpdateDailyVisitStatusRequest {
  status: number;
}

// Clinic Queue
export const QueuePriorityEnum = {
  Normal: 0,
  Urgent: 1,
  VIP: 2,
  Emergency: 3,
} as const;

export const QueueStatusEnum = {
  Waiting: 0,
  Called: 1,
  InRoom: 2,
  InProgress: 3,
  Completed: 4,
  Cancelled: 5,
  NoShow: 6,
} as const;

export interface ClinicQueueItemDto {
  id: string;
  dailyVisitId: string;
  patientId: string;
  patientName: string;
  patientNumber: string | null;
  doctorId: string | null;
  doctorName: string | null;
  roomId: string | null;
  roomName: string | null;
  queueDate: string;
  queueNumber: number;
  priority: number;
  priorityDisplay: string;
  status: number;
  statusDisplay: string;
  calledAt: string | null;
  enteredRoomAt: string | null;
  completedAt: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TodayQueueDto {
  date: string;
  waitingCount: number;
  calledCount: number;
  inRoomCount: number;
  inProgressCount: number;
  completedCount: number;
  cancelledCount: number;
  queueItems: ClinicQueueItemDto[];
  rooms: ClinicRoomDto[];
}

export interface SendToQueueRequest {
  priority: number;
  notes?: string | null;
}

export interface UpdateQueuePriorityRequest {
  priority: number;
}

export interface CallPatientRequest {
  notes?: string | null;
}

export interface EnterRoomRequest {
  roomId: string;
}

// Clinic Room
export interface ClinicRoomDto {
  id: string;
  name: string;
  roomNumber: string | null;
  description: string | null;
  isActive: boolean;
  isOccupied: boolean;
  currentDailyVisitId: string | null;
  currentPatientName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomRequest {
  name: string;
  roomNumber?: string | null;
  description?: string | null;
}

export interface UpdateRoomRequest {
  name: string;
  roomNumber?: string | null;
  description?: string | null;
}

// Clinical Visit
export const ClinicalVisitStatusEnum = {
  Open: 0,
  InProgress: 1,
  Completed: 2,
  Cancelled: 3,
} as const;

export interface PrescriptionDto {
  id: string;
  clinicalVisitId: string;
  patientId: string;
  doctorId: string;
  medicationName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalVisitDto {
  id: string;
  dailyVisitId: string;
  clinicQueueItemId: string | null;
  patientId: string;
  patientName: string;
  patientNumber: string | null;
  doctorId: string;
  doctorName: string | null;
  visitDate: string;
  startedAt: string;
  completedAt: string | null;
  status: number;
  statusDisplay: string;
  chiefComplaint: string | null;
  clinicalFindings: string | null;
  diagnosis: string | null;
  treatmentNotes: string | null;
  doctorRecommendations: string | null;
  nextVisitRecommended: boolean;
  nextVisitDate: string | null;
  prescriptions: PrescriptionDto[];
  procedures: ClinicalProcedureDto[];
  createdAt: string;
  updatedAt: string;
}

export interface TodayClinicalVisitsDto {
  date: string;
  totalCount: number;
  openCount: number;
  inProgressCount: number;
  completedCount: number;
  cancelledCount: number;
  visits: ClinicalVisitDto[];
}

export interface StartClinicalVisitRequest {
  chiefComplaint?: string | null;
}

export interface UpdateClinicalVisitRequest {
  chiefComplaint?: string | null;
  clinicalFindings?: string | null;
  diagnosis?: string | null;
  treatmentNotes?: string | null;
  doctorRecommendations?: string | null;
  nextVisitRecommended?: boolean | null;
  nextVisitDate?: string | null;
}

export interface CompleteClinicalVisitRequest {
  diagnosis?: string | null;
  treatmentNotes?: string | null;
  doctorRecommendations?: string | null;
  nextVisitRecommended?: boolean | null;
  nextVisitDate?: string | null;
}

export interface AddPrescriptionRequest {
  medicationName: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
}

export interface UpdatePrescriptionRequest {
  medicationName: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
}

// Clinical Procedure
export const ClinicalProcedureTypeEnum = {
  Consultation: 0,
  Filling: 1,
  Extraction: 2,
  Scaling: 3,
  RootCanal: 4,
  Crown: 5,
  Prosthodontic: 6,
  Other: 99,
} as const;

export const ClinicalProcedureStatusEnum = {
  Planned: 0,
  InProgress: 1,
  Completed: 2,
  Cancelled: 3,
} as const;

export interface ClinicalProcedureDto {
  id: string;
  clinicalVisitId: string;
  patientId: string;
  patientName: string;
  patientNumber: string | null;
  doctorId: string;
  doctorName: string | null;
  procedureType: number;
  procedureTypeDisplay: string;
  toothNumber: string | null;
  toothSurface: string | null;
  title: string;
  description: string | null;
  clinicalNotes: string | null;
  status: number;
  statusDisplay: string;
  startedAt: string | null;
  completedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClinicalProcedureRequest {
  procedureType: number;
  toothNumber?: string | null;
  toothSurface?: string | null;
  title: string;
  description?: string | null;
  clinicalNotes?: string | null;
  status?: number | null;
}

export interface UpdateClinicalProcedureRequest {
  procedureType?: number | null;
  toothNumber?: string | null;
  toothSurface?: string | null;
  title?: string | null;
  description?: string | null;
  clinicalNotes?: string | null;
  status?: number | null;
}

export interface UpdateClinicalProcedureStatusRequest {
  status: number;
}

// Public Clinic Display
export interface PublicDisplayQueueItemDto {
  queueNumber: number;
  patientDisplayName: string;
  patientNumber: string | null;
  roomName: string | null;
  status: number;
  statusDisplay: string;
  priority: number;
  calledAt: string | null;
}

export interface PublicClinicDisplayDto {
  clinicName: string;
  date: string;
  waitingCount: number;
  calledCount: number;
  inRoomCount: number;
  completedCount: number;
  currentlyCalled: PublicDisplayQueueItemDto | null;
  queueItems: PublicDisplayQueueItemDto[];
}

// Patient Summary
export interface PrescriptionSummaryDto {
  id: string;
  medicationName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  createdAt: string;
}

export interface PatientSummaryDto {
  patient: PatientDto;
  lastAppointment: AppointmentDto | null;
  lastClinicalVisit: ClinicalVisitDto | null;
  totalClinicalVisits: number;
  latestProcedures: ClinicalProcedureDto[];
  latestPrescriptions: PrescriptionSummaryDto[];
}

export interface TimelineEntryDto {
  type: string;
  id: string;
  title: string;
  subtitle: string | null;
  date: string;
  statusDisplay: string | null;
}

export interface PatientTimelineDto {
  entries: TimelineEntryDto[];
}

// Doctor Weekly Schedule
export interface DoctorWeeklyScheduleDto {
  id: string;
  doctorId: string;
  doctorName: string;
  dayOfWeek: number;
  dayOfWeekDisplay: string;
  startTime: string;
  endTime: string;
  breakStartTime: string | null;
  breakEndTime: string | null;
  defaultAppointmentDurationMinutes: number;
  isAvailableForBooking: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDoctorWeeklyScheduleRequest {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  defaultAppointmentDurationMinutes?: number;
  isAvailableForBooking?: boolean;
}

export interface UpdateDoctorWeeklyScheduleRequest {
  startTime?: string | null;
  endTime?: string | null;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  defaultAppointmentDurationMinutes?: number | null;
  isAvailableForBooking?: boolean | null;
}

export interface AvailableDoctorDto {
  doctorId: string;
  doctorName: string;
  specialty: string;
  color: string | null;
  startTime: string;
  endTime: string;
  breakStartTime: string | null;
  breakEndTime: string | null;
  defaultAppointmentDurationMinutes: number;
}

// Medical History
export interface MedicalHistoryDto {
  chronicDiseases: string | null;
  currentMedications: string | null;
  drugAllergies: string | null;
  bleedingDisorders: boolean;
  isPregnant: string | null;
  tmjProblems: boolean;
  previousSurgeries: string | null;
  notes: string | null;
}

export interface UpsertMedicalHistoryRequest {
  chronicDiseases?: string | null;
  currentMedications?: string | null;
  drugAllergies?: string | null;
  bleedingDisorders?: boolean;
  isPregnant?: string | null;
  tmjProblems?: boolean;
  previousSurgeries?: string | null;
  notes?: string | null;
}

// Dental History
export interface DentalHistoryDto {
  chiefComplaint: string | null;
  previousTreatments: string | null;
  mouthBreathing: boolean;
  bruxism: boolean;
  thumbSucking: boolean;
  tongueThrusting: boolean;
  notes: string | null;
}

export interface UpsertDentalHistoryRequest {
  chiefComplaint?: string | null;
  previousTreatments?: string | null;
  mouthBreathing?: boolean;
  bruxism?: boolean;
  thumbSucking?: boolean;
  tongueThrusting?: boolean;
  notes?: string | null;
}

// Clinic Service
export const ServiceCategoryEnum = {
  Consultation: 0,
  Preventive: 1,
  Restorative: 2,
  Endodontics: 3,
  Prosthodontics: 4,
  Orthodontics: 5,
  Surgery: 6,
  Cosmetic: 7,
  Radiology: 8,
  Other: 99,
} as const;

export const ServiceCategoryLabels: Record<number, string> = {
  0: 'استشارة',
  1: 'وقائي',
  2: 'ترميمي',
  3: 'عصبي',
  4: 'تعويضي',
  5: 'تقويم',
  6: 'جراحة',
  7: 'تجميلي',
  8: 'أشعة',
  99: 'أخرى',
};

export interface ClinicServiceDto {
  id: string;
  arabicName: string;
  englishName: string;
  code: string;
  department: string | null;
  category: number;
  categoryDisplay: string;
  description: string | null;
  defaultDurationMinutes: number;
  defaultPrice: number;
  requiresDoctor: boolean;
  showInBooking: boolean;
  showInReception: boolean;
  showInTreatmentPlan: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClinicServiceRequest {
  arabicName: string;
  englishName?: string | null;
  code: string;
  department?: string | null;
  category?: number | null;
  description?: string | null;
  defaultDurationMinutes?: number | null;
  defaultPrice?: number | null;
  requiresDoctor?: boolean | null;
  showInBooking?: boolean | null;
  showInReception?: boolean | null;
  showInTreatmentPlan?: boolean | null;
  sortOrder?: number | null;
}

export interface UpdateClinicServiceRequest {
  arabicName?: string | null;
  englishName?: string | null;
  code?: string | null;
  department?: string | null;
  category?: number | null;
  description?: string | null;
  defaultDurationMinutes?: number | null;
  defaultPrice?: number | null;
  requiresDoctor?: boolean | null;
  showInBooking?: boolean | null;
  showInReception?: boolean | null;
  showInTreatmentPlan?: number | null;
  sortOrder?: number | null;
}

// Setting
export interface SettingDto {
  id: string;
  key: string;
  value: string | null;
  category: string | null;
  updatedAt: string;
}

export interface UpsertSettingRequest {
  value?: string | null;
  category?: string | null;
}

// General Dentistry
export const ToothConditionTypeEnum = {
  Healthy: 0, Caries: 1, Filled: 2, Crown: 3, Missing: 4,
  Implant: 5, RootCanal: 6, Bridge: 7, Veneer: 8, Other: 99,
} as const;

export const ToothConditionTypeLabels: Record<number, string> = {
  0: 'سليم', 1: 'تسوس', 2: 'حشوة', 3: 'تاج', 4: 'مفقود',
  5: 'زراعة', 6: 'علاج عصب', 7: 'جسر', 8: 'قشرة', 99: 'أخرى',
};

export const GeneralTreatmentTypeEnum = {
  Examination: 0, Cleaning: 1, Filling: 2, Extraction: 3, RootCanal: 4,
  Crown: 5, Bridge: 6, Denture: 7, Whitening: 8, Veneer: 9,
  Sealant: 10, Fluoride: 11, Other: 99,
} as const;

export const GeneralTreatmentTypeLabels: Record<number, string> = {
  0: 'فحص', 1: 'تنظيف', 2: 'حشوة', 3: 'خلع', 4: 'علاج عصب',
  5: 'تاج', 6: 'جسر', 7: 'طقم', 8: 'تبييض', 9: 'قشرة',
  10: 'مانع تسرب', 11: 'فلورايد', 99: 'أخرى',
};

export const TreatmentStepPriorityEnum = {
  Low: 0, Normal: 1, High: 2, Urgent: 3,
} as const;

export const TreatmentStepStatusEnum = {
  Planned: 0, InProgress: 1, Completed: 2, Skipped: 3, Cancelled: 4,
} as const;

export interface ToothConditionDto {
  id: string;
  chartId: string;
  toothNumber: number;
  condition: number;
  conditionDisplay: string;
  surfacesAffected: string | null;
  notes: string | null;
  treatmentDone: string | null;
}

export interface DentalChartDto {
  id: string;
  patientId: string;
  chartDate: string;
  doctorId: string | null;
  doctorName: string | null;
  toothConditions: ToothConditionDto[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertDentalChartRequest {
  doctorId?: string | null;
}

export interface UpdateToothConditionRequest {
  condition: number;
  surfacesAffected?: string | null;
  notes?: string | null;
  treatmentDone?: string | null;
}

export interface GeneralTreatmentDto {
  id: string;
  patientId: string;
  visitId: string | null;
  treatmentType: number;
  treatmentTypeDisplay: string;
  toothNumber: number | null;
  materialUsed: string | null;
  anesthesiaType: string | null;
  cost: number | null;
  doctorId: string | null;
  doctorName: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateGeneralTreatmentRequest {
  patientId: string;
  visitId?: string | null;
  treatmentType: number;
  toothNumber?: number | null;
  materialUsed?: string | null;
  anesthesiaType?: string | null;
  cost?: number | null;
  doctorId?: string | null;
  notes?: string | null;
}

export interface TreatmentPlanStepDto {
  id: string;
  patientId: string;
  sequenceNumber: number;
  clinicServiceId: string | null;
  serviceNameSnapshot: string | null;
  department: string | null;
  toothNumber: number | null;
  toothArea: string | null;
  title: string;
  description: string | null;
  priority: number;
  priorityDisplay: string;
  status: number;
  statusDisplay: string;
  responsibleDoctorId: string | null;
  responsibleDoctorName: string | null;
  plannedDate: string | null;
  completedDate: string | null;
  estimatedCost: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddTreatmentPlanStepRequest {
  patientId: string;
  clinicServiceId?: string | null;
  serviceNameSnapshot?: string | null;
  department?: string | null;
  toothNumber?: number | null;
  toothArea?: string | null;
  title: string;
  description?: string | null;
  priority?: number | null;
  responsibleDoctorId?: string | null;
  plannedDate?: string | null;
  estimatedCost?: number | null;
  notes?: string | null;
}

export interface UpdateTreatmentPlanStepRequest {
  title?: string | null;
  description?: string | null;
  priority?: number | null;
  responsibleDoctorId?: string | null;
  plannedDate?: string | null;
  estimatedCost?: number | null;
  notes?: string | null;
}

// Orthodontics
export const OrthoCaseStatusEnum = {
  Active: 0, Completed: 1, OnHold: 2, Cancelled: 3,
} as const;

export const OrthoCaseStatusLabels: Record<number, string> = {
  0: 'نشط', 1: 'مكتمل', 2: 'معلق', 3: 'ملغي',
};

export const OrthoCaseStatusColors: Record<number, string> = {
  0: 'bg-green-100 text-green-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-red-100 text-red-700',
};

export interface OrthoVisitDto {
  id: string;
  orthoCaseId: string;
  visitNumber: number;
  visitDate: string;
  visitType: string | null;
  currentStage: string | null;
  wireUpper: string | null;
  wireLower: string | null;
  elasticsType: string | null;
  clinicalNotes: string | null;
  patientInstructions: string | null;
  nextAppointmentDate: string | null;
  doctorId: string | null;
  doctorName: string | null;
  createdAt: string;
}

export interface TreatmentStageDto {
  id: string;
  orthoCaseId: string;
  stageName: string;
  stageOrder: number;
  startedAt: string | null;
  completedAt: string | null;
  targetDurationMonths: number | null;
  notes: string | null;
  status: number;
  statusDisplay: string;
}

export interface OrthoCaseDto {
  id: string;
  caseNumber: string;
  patientId: string;
  patientName: string;
  doctorId: string | null;
  doctorName: string | null;
  applianceType: string | null;
  startDate: string | null;
  expectedDurationMonths: number | null;
  currentStage: string | null;
  stagePercentage: number;
  status: number;
  statusDisplay: string;
  totalFee: number | null;
  notes: string | null;
  visits: OrthoVisitDto[];
  stages: TreatmentStageDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrthoCaseRequest {
  patientId: string;
  doctorId?: string | null;
  applianceType?: string | null;
  startDate?: string | null;
  expectedDurationMonths?: number | null;
  totalFee?: number | null;
  notes?: string | null;
}

export interface UpdateOrthoCaseRequest {
  applianceType?: string | null;
  startDate?: string | null;
  expectedDurationMonths?: number | null;
  currentStage?: string | null;
  stagePercentage?: number | null;
  status?: number | null;
  totalFee?: number | null;
  notes?: string | null;
}

export interface AddOrthoVisitRequest {
  visitType?: string | null;
  currentStage?: string | null;
  wireUpper?: string | null;
  wireLower?: string | null;
  elasticsType?: string | null;
  clinicalNotes?: string | null;
  patientInstructions?: string | null;
  nextAppointmentDate?: string | null;
  doctorId?: string | null;
}

export interface UpdateTreatmentStageRequest {
  stageName?: string | null;
  status?: number | null;
  notes?: string | null;
}

// Surgery
export const SurgeryCaseStatusEnum = {
  Scheduled: 0, InProgress: 1, Completed: 2, Cancelled: 3,
} as const;

export const SurgeryCaseStatusLabels: Record<number, string> = {
  0: 'مجدول', 1: 'جارٍ', 2: 'مكتمل', 3: 'ملغي',
};

export const SurgeryCaseStatusColors: Record<number, string> = {
  0: 'bg-blue-100 text-blue-700',
  1: 'bg-yellow-100 text-yellow-700',
  2: 'bg-green-100 text-green-700',
  3: 'bg-red-100 text-red-700',
};

export interface SurgeryCaseDto {
  id: string;
  caseNumber: string;
  patientId: string;
  patientName: string;
  doctorId: string | null;
  doctorName: string | null;
  surgeryType: string;
  teethInvolved: string | null;
  status: number;
  statusDisplay: string;
  surgeryDate: string | null;
  surgeryLocation: string | null;
  anesthesiaType: string | null;
  preopNotes: string | null;
  operativeNotes: string | null;
  postopInstructions: string | null;
  complications: string | null;
  followupDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSurgeryCaseRequest {
  patientId: string;
  doctorId?: string | null;
  surgeryType: string;
  teethInvolved?: string | null;
  surgeryDate?: string | null;
  surgeryLocation?: string | null;
  anesthesiaType?: string | null;
  preopNotes?: string | null;
  notes?: string | null;
}

export interface UpdateSurgeryCaseRequest {
  surgeryType?: string | null;
  teethInvolved?: string | null;
  surgeryDate?: string | null;
  surgeryLocation?: string | null;
  anesthesiaType?: string | null;
  preopNotes?: string | null;
  operativeNotes?: string | null;
  postopInstructions?: string | null;
  complications?: string | null;
  followupDate?: string | null;
  notes?: string | null;
}

export interface UpdateSurgeryStatusRequest {
  status: number;
}

// Finance
export const ContractStatusEnum = { Active: 0, Completed: 1, Cancelled: 2, Defaulted: 3 } as const;
export const ContractStatusLabels: Record<number, string> = { 0: 'نشط', 1: 'مكتمل', 2: 'ملغي', 3: 'متخلف' };
export const InvoiceStatusEnum = { Draft: 0, Issued: 1, Paid: 2, Cancelled: 3 } as const;
export const InvoiceStatusLabels: Record<number, string> = { 0: 'مسودة', 1: 'صادرة', 2: 'مدفوعة', 3: 'ملغاة' };
export const PaymentMethodEnum = { Cash: 0, Card: 1, BankTransfer: 2, Check: 3, Other: 99 } as const;
export const PaymentMethodLabels: Record<number, string> = { 0: 'نقدي', 1: 'بطاقة', 2: 'تحويل بنكي', 3: 'شيك', 99: 'أخرى' };
export const SessionStatusEnum = { Open: 0, Closed: 1, Reconciled: 2 } as const;
export const FinancialCategoryEnum = {
  PatientPayment: 0, SupplierPayment: 1, SalaryPayment: 2, DoctorCommission: 3,
  OperationalExpense: 4, Refund: 5, GeneralCost: 6, InternalTransfer: 7,
  SalaryAdvance: 8, Reversal: 9, Other: 99
} as const;
export const FinancialCategoryLabels: Record<number, string> = {
  0: 'دفع مريض', 1: 'دفع مورد', 2: 'دفع راتب', 3: 'عمولة طبيب',
  4: 'مصروف تشغيلي', 5: 'استرداد', 6: 'تكلفة عامة', 7: 'تحويل داخلي',
  8: 'سلفة', 9: 'عكس', 99: 'أخرى'
};

export interface ContractDto {
  id: string; patientId: string; patientName: string; specialty: string | null;
  relatedCaseId: string | null; totalAmount: number; downPayment: number;
  installmentsCount: number; installmentAmount: number | null; startDate: string | null;
  discountAmount: number; discountReason: string | null; status: number;
  statusDisplay: string; notes: string | null; createdAt: string; updatedAt: string;
}

export interface CreateContractRequest {
  patientId: string; specialty?: string | null; relatedCaseId?: string | null;
  totalAmount: number; downPayment: number; installmentsCount: number;
  installmentAmount?: number | null; startDate?: string | null;
  discountAmount?: number; discountReason?: string | null; notes?: string | null;
}

export interface InvoiceLineItemDto {
  id: string; invoiceId: string; clinicServiceId: string | null;
  serviceNameSnapshot: string; description: string | null; quantity: number;
  unitPrice: number; totalPrice: number; lineDiscountAmount: number;
  doctorId: string | null; doctorName: string | null; toothNumber: string | null;
  sortOrder: number;
}

export interface InvoiceDto {
  id: string; patientId: string; patientName: string; visitId: string | null;
  invoiceNumber: string; status: number; statusDisplay: string; subtotal: number;
  discountAmount: number; taxAmount: number; totalAmount: number;
  notes: string | null; lineItems: InvoiceLineItemDto[]; createdAt: string; updatedAt: string;
}

export interface CreateInvoiceRequest {
  patientId: string; visitId?: string | null; notes?: string | null;
  lineItems: { clinicServiceId?: string | null; serviceNameSnapshot: string;
    description?: string | null; quantity: number; unitPrice: number;
    lineDiscountAmount?: number; doctorId?: string | null; toothNumber?: string | null; }[];
}

export interface PaymentDto {
  id: string; contractId: string | null; invoiceId: string | null;
  patientId: string; patientName: string; amount: number; paymentDate: string;
  paymentMethod: number; paymentMethodDisplay: string; serviceDescription: string | null;
  doctorId: string | null; doctorName: string | null; receivedBy: string | null;
  receiptNumber: string | null; notes: string | null; createdAt: string;
}

export interface CreatePaymentRequest {
  contractId?: string | null; invoiceId?: string | null; patientId: string;
  amount: number; paymentMethod: number; serviceDescription?: string | null;
  doctorId?: string | null; notes?: string | null;
}

export interface PatientFinanceSummaryDto {
  totalContracts: number; totalContractAmount: number; totalPaid: number;
  totalOutstanding: number; overdueContracts: number; lastPaymentDate: string | null;
}

export interface FinanceDashboardDto {
  todayRevenue: number; monthRevenue: number; pendingInvoices: number;
  overdueContracts: number; activeContracts: number; totalPatients: number;
}

export interface CashierSessionDto {
  id: string; sessionNumber: string; cashierId: string; cashierName: string;
  openingTime: string; closingTime: string | null; openingBalance: number;
  expectedClosingCash: number; actualClosingCash: number | null;
  status: number; statusDisplay: string; notes: string | null; createdAt: string;
}

export interface TreasuryDto {
  id: string; name: string; type: number; typeDisplay: string;
  balance: number; isActive: boolean; createdAt: string; updatedAt: string;
}
