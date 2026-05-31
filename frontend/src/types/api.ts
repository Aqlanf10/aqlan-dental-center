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
