import { apiRequest } from "@/lib/api/client";
import type { Appointment, AppointmentSource, AppointmentStatus, Availability, DoctorBreak, DoctorLeave, Schedule } from "@/types/appointment";

type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
export type AppointmentListQuery = { page: number; limit: number; search?: string; doctorId?: string; branchId?: string; departmentId?: string; status?: AppointmentStatus; source?: AppointmentSource; dateFrom?: string; dateTo?: string };

export async function listAppointments(query: AppointmentListQuery) {
  const response = await apiRequest<{ appointments: Appointment[] }>({ method: "GET", url: "/appointments", params: query });
  return { appointments: response.data.appointments, pagination: readPagination(response.meta) };
}
export async function getAppointment(id: string): Promise<Appointment> {
  const response = await apiRequest<{ appointment: Appointment }>({ method: "GET", url: `/appointments/${id}` }); return response.data.appointment;
}
export async function getAvailability(query: { doctorId: string; branchId: string; date: string; durationMinutes?: number }): Promise<Availability> {
  const response = await apiRequest<{ availability: Availability }>({ method: "GET", url: "/appointments/availability", params: query }); return response.data.availability;
}
export async function createAppointment(input: { patientId: string; doctorId: string; branchId: string; departmentId?: string | null; startAt: string; durationMinutes?: number; appointmentSource?: "RECEPTIONIST" | "WALK_IN" | "VOICE_AGENT"; appointmentType?: string; reason?: string | null }, idempotencyKey: string): Promise<Appointment> {
  const response = await apiRequest<{ appointment: Appointment }>({ method: "POST", url: "/appointments", headers: { "Idempotency-Key": idempotencyKey }, data: input }); return response.data.appointment;
}
export async function rescheduleAppointment(id: string, input: { startAt: string; doctorId?: string; branchId?: string; departmentId?: string | null; durationMinutes?: number }, idempotencyKey: string): Promise<Appointment> {
  const response = await apiRequest<{ appointment: Appointment }>({ method: "POST", url: `/appointments/${id}/reschedule`, headers: { "Idempotency-Key": idempotencyKey }, data: input }); return response.data.appointment;
}
export async function cancelAppointment(id: string, cancellationReason: string, idempotencyKey: string): Promise<Appointment> {
  const response = await apiRequest<{ appointment: Appointment }>({ method: "POST", url: `/appointments/${id}/cancel`, headers: { "Idempotency-Key": idempotencyKey }, data: { cancellationReason } }); return response.data.appointment;
}
export async function lifecycleAppointment(id: string, action: "check-in" | "start" | "complete" | "no-show", reason?: string): Promise<Appointment> {
  const response = await apiRequest<{ appointment: Appointment }>({ method: "POST", url: `/appointments/${id}/${action}`, data: action === "no-show" && reason ? { reason } : undefined }); return response.data.appointment;
}
export async function listSchedules(query: { page: number; limit: number; doctorId?: string; branchId?: string; isActive?: string }) {
  const response = await apiRequest<{ schedules: Schedule[] }>({ method: "GET", url: "/doctor-schedules", params: query }); return { schedules: response.data.schedules, pagination: readPagination(response.meta) };
}
export async function listLeaves(query: { page: number; limit: number; doctorId?: string; branchId?: string; status?: string }) {
  const response = await apiRequest<{ leaves: DoctorLeave[] }>({ method: "GET", url: "/doctor-leaves", params: query }); return { leaves: response.data.leaves, pagination: readPagination(response.meta) };
}
export async function listBreaks(query: { page: number; limit: number; doctorId?: string; branchId?: string }) {
  const response = await apiRequest<{ breaks: DoctorBreak[] }>({ method: "GET", url: "/doctor-breaks", params: query }); return { breaks: response.data.breaks, pagination: readPagination(response.meta) };
}
function readPagination(meta: Record<string, unknown> | undefined): Pagination {
  const value = meta?.pagination;
  if (!value || typeof value !== "object") throw new Error("Appointment response did not include pagination metadata.");
  const p = value as Record<string, unknown>;
  if (!["page", "pageSize", "total", "totalPages"].every((key) => typeof p[key] === "number")) throw new Error("Appointment response contained invalid pagination metadata.");
  return { page: p.page as number, pageSize: p.pageSize as number, total: p.total as number, totalPages: p.totalPages as number };
}
