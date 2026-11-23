import type { Patient } from "@/types/patient";

/** One hospital where the signed-in account has a linked patient profile. */
export type PatientPortalHospital = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  patientId: string;
  patientCode: string;
  status: string;
  linkedAt: string;
};

export type PatientPortalRegistrationResult = {
  patient: Patient;
  accountCreated: boolean;
  requiresEmailVerification: boolean;
};

export type PublicPatientRegistrationResult = PatientPortalRegistrationResult & {
  user: {
    id: string;
    fullName: string;
    email: string;
    emailVerifiedAt: string | null;
  };
};

export type PatientPortalProfileUpdateInput = {
  fullName?: string;
  dateOfBirth?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
};

export type PatientPortalAppointment = {
  id: string;
  appointmentCode: string;
  doctorName: string;
  doctorCode: string;
  branchName: string;
  appointmentType: string;
  appointmentStatus: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  reason: string | null;
};

export type PatientPortalInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceStatus: string;
  invoiceType: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
};

export type PatientPortalPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
