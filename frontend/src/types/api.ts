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
