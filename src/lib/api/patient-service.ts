import { apiRequest } from "@/lib/api/client";
import type { Patient, PatientAddress, PatientContact, PatientEmergencyContact, PatientInput, PatientStatus, PatientSummary, PatientUpdateInput } from "@/types/patient";

type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
type Query = { page: number; limit: number; search?: string; status?: PatientStatus; gender?: string };

export async function listPatients(query: Query) {
  const response = await apiRequest<{ patients: PatientSummary[] }>({ method: "GET", url: "/patients", params: query });
  return { patients: response.data.patients, pagination: readPagination(response.meta) };
}
export async function getPatient(id: string): Promise<Patient> {
  const response = await apiRequest<{ patient: Patient }>({ method: "GET", url: `/patients/${id}` });
  return response.data.patient;
}
export async function createPatient(input: PatientInput): Promise<Patient> {
  const response = await apiRequest<{ patient: Patient }>({ method: "POST", url: "/patients", data: input });
  return response.data.patient;
}
export async function updatePatient(id: string, input: PatientUpdateInput): Promise<Patient> {
  const response = await apiRequest<{ patient: Patient }>({ method: "PATCH", url: `/patients/${id}`, data: input });
  return response.data.patient;
}
export async function updatePatientStatus(id: string, status: Exclude<PatientStatus, "DECEASED">): Promise<Patient> {
  const response = await apiRequest<{ patient: Patient }>({ method: "PATCH", url: `/patients/${id}/status`, data: { status } });
  return response.data.patient;
}
export async function deletePatient(id: string): Promise<void> { await apiRequest<undefined>({ method: "DELETE", url: `/patients/${id}` }); }
export async function addPatientContact(id: string, input: Partial<PatientContact>): Promise<PatientContact> {
  const response = await apiRequest<{ contact: PatientContact }>({ method: "POST", url: `/patients/${id}/contacts`, data: input }); return response.data.contact;
}
export async function addPatientAddress(id: string, input: Partial<PatientAddress> & { addressLine1: string }): Promise<PatientAddress> {
  const response = await apiRequest<{ address: PatientAddress }>({ method: "POST", url: `/patients/${id}/addresses`, data: input }); return response.data.address;
}
export async function addPatientEmergencyContact(id: string, input: Partial<PatientEmergencyContact> & { name: string; relationship: string; phone: string }): Promise<PatientEmergencyContact> {
  const response = await apiRequest<{ emergencyContact: PatientEmergencyContact }>({ method: "POST", url: `/patients/${id}/emergency-contacts`, data: input }); return response.data.emergencyContact;
}
export async function updatePatientContact(patientId: string, contactId: string, input: Partial<PatientContact>): Promise<PatientContact> {
  const response = await apiRequest<{ contact: PatientContact }>({ method: "PATCH", url: `/patients/${patientId}/contacts/${contactId}`, data: input }); return response.data.contact;
}
export async function updatePatientAddress(patientId: string, addressId: string, input: Partial<PatientAddress>): Promise<PatientAddress> {
  const response = await apiRequest<{ address: PatientAddress }>({ method: "PATCH", url: `/patients/${patientId}/addresses/${addressId}`, data: input }); return response.data.address;
}
export async function updatePatientEmergencyContact(patientId: string, contactId: string, input: Partial<PatientEmergencyContact>): Promise<PatientEmergencyContact> {
  const response = await apiRequest<{ emergencyContact: PatientEmergencyContact }>({ method: "PATCH", url: `/patients/${patientId}/emergency-contacts/${contactId}`, data: input }); return response.data.emergencyContact;
}
export async function listPatientChildren(id: string) {
  const [contacts, addresses, emergencyContacts] = await Promise.all([
    apiRequest<{ contacts: PatientContact[] }>({ method: "GET", url: `/patients/${id}/contacts` }),
    apiRequest<{ addresses: PatientAddress[] }>({ method: "GET", url: `/patients/${id}/addresses` }),
    apiRequest<{ emergencyContacts: PatientEmergencyContact[] }>({ method: "GET", url: `/patients/${id}/emergency-contacts` }),
  ]);
  return { contacts: contacts.data.contacts, addresses: addresses.data.addresses, emergencyContacts: emergencyContacts.data.emergencyContacts };
}

function readPagination(meta: Record<string, unknown> | undefined): Pagination {
  const value = meta?.pagination;
  if (!value || typeof value !== "object") throw new Error("Patient response did not include pagination metadata.");
  const pagination = value as Record<string, unknown>;
  if (!["page", "pageSize", "total", "totalPages"].every((key) => typeof pagination[key] === "number")) throw new Error("Patient response contained invalid pagination metadata.");
  return { page: pagination.page as number, pageSize: pagination.pageSize as number, total: pagination.total as number, totalPages: pagination.totalPages as number };
}
