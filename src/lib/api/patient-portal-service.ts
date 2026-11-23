import { apiRequest } from "@/lib/api/client";
import type {
  PatientPortalAppointment,
  PatientPortalHospital,
  PatientPortalInvoice,
  PatientPortalPage,
  PatientPortalProfileUpdateInput,
  PatientPortalRegistrationResult,
  PublicPatientRegistrationResult,
} from "@/types/patient-portal";
import type { Patient } from "@/types/patient";

export type PublicPatientRegistrationInput = {
  hospitalSlug: string;
  fullName: string;
  email: string;
  password: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
};

export type LinkPatientHospitalInput = {
  hospitalSlug: string;
  fullName?: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
};

/** Public self-registration. Creates a global account only when the email is unused. */
export async function registerPatientAccount(
  input: PublicPatientRegistrationInput,
): Promise<PublicPatientRegistrationResult> {
  const response = await apiRequest<PublicPatientRegistrationResult>({
    method: "POST",
    url: "/registrations",
    data: input,
  });

  return response.data;
}

/** Links the signed-in account to an additional hospital. */
export async function linkPatientToHospital(
  input: LinkPatientHospitalInput,
): Promise<PatientPortalRegistrationResult> {
  const response = await apiRequest<PatientPortalRegistrationResult>({
    method: "POST",
    url: "/portal/registrations",
    data: input,
  });

  return response.data;
}

export async function listPortalHospitals(): Promise<PatientPortalHospital[]> {
  const response = await apiRequest<{ hospitals: PatientPortalHospital[] }>({
    method: "GET",
    url: "/portal/hospitals",
  });

  return response.data.hospitals;
}

export async function getPortalProfile(hospitalSlug: string): Promise<Patient> {
  const response = await apiRequest<{ patient: Patient }>({
    method: "GET",
    url: `/portal/hospitals/${encodeURIComponent(hospitalSlug)}/profile`,
  });

  return response.data.patient;
}

/** Updates only the portal-permitted demographic fields. */
export async function updatePortalProfile(
  hospitalSlug: string,
  input: PatientPortalProfileUpdateInput,
): Promise<Patient> {
  const response = await apiRequest<{ patient: Patient }>({
    method: "PATCH",
    url: `/portal/hospitals/${encodeURIComponent(hospitalSlug)}/profile`,
    data: input,
  });

  return response.data.patient;
}

export async function listPortalAppointments(
  hospitalSlug: string,
  page = 1,
  limit = 20,
): Promise<PatientPortalPage<PatientPortalAppointment>> {
  const response = await apiRequest<{ appointments: PatientPortalAppointment[] }>({
    method: "GET",
    url: `/portal/hospitals/${encodeURIComponent(hospitalSlug)}/appointments`,
    params: { page, limit },
  });

  const pagination = response.meta?.pagination as
    | { total?: number; totalPages?: number }
    | undefined;

  return {
    items: response.data.appointments,
    page,
    pageSize: limit,
    total: Number(pagination?.total ?? response.data.appointments.length),
    totalPages: Number(pagination?.totalPages ?? 1),
  };
}

export async function listPortalInvoices(
  hospitalSlug: string,
  page = 1,
  limit = 20,
): Promise<PatientPortalPage<PatientPortalInvoice>> {
  const response = await apiRequest<{ invoices: PatientPortalInvoice[] }>({
    method: "GET",
    url: `/portal/hospitals/${encodeURIComponent(hospitalSlug)}/invoices`,
    params: { page, limit },
  });

  const pagination = response.meta?.pagination as
    | { total?: number; totalPages?: number }
    | undefined;

  return {
    items: response.data.invoices,
    page,
    pageSize: limit,
    total: Number(pagination?.total ?? response.data.invoices.length),
    totalPages: Number(pagination?.totalPages ?? 1),
  };
}
