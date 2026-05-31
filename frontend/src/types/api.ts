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
