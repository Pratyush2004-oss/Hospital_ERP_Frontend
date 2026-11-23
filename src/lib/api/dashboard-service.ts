import { apiRequest } from "@/lib/api/client";
import type {
  AppointmentDashboardStats,
  DoctorDashboardStats,
  FinancialDashboardStats,
  OperationalDashboard,
  PatientDashboardStats,
} from "@/types/dashboard";

/**
 * Dashboard analytics client (Phase 22.2).
 *
 * Every call reuses the single backend aggregation; the frontend never computes
 * metrics itself. `branchId` is only sent when a specific branch is selected,
 * because an absent value means "all branches" on the API.
 */
export type DashboardQuery = {
  fromDate: string;
  toDate: string;
  branchId?: string;
};

type SectionMeta = {
  fromDate: string;
  toDate: string;
  branchId: string | null;
  timezone: string;
  asOf: string;
};

function params(query: DashboardQuery): Record<string, string> {
  return {
    fromDate: query.fromDate,
    toDate: query.toDate,
    ...(query.branchId ? { branchId: query.branchId } : {}),
  };
}

export async function getOperationalDashboard(
  query: DashboardQuery,
): Promise<OperationalDashboard> {
  const response = await apiRequest<{ operational: OperationalDashboard }>({
    method: "GET",
    url: "/dashboard/operational",
    params: params(query),
  });
  return response.data.operational;
}

export async function getAppointmentDashboard(
  query: DashboardQuery,
): Promise<SectionMeta & AppointmentDashboardStats> {
  const response = await apiRequest<{
    appointments: SectionMeta & AppointmentDashboardStats;
  }>({
    method: "GET",
    url: "/dashboard/appointments",
    params: params(query),
  });
  return response.data.appointments;
}

export async function getPatientDashboard(
  query: DashboardQuery,
): Promise<SectionMeta & PatientDashboardStats> {
  const response = await apiRequest<{
    patients: SectionMeta & PatientDashboardStats;
  }>({
    method: "GET",
    url: "/dashboard/patients",
    params: params(query),
  });
  return response.data.patients;
}

export async function getDoctorDashboard(
  query: DashboardQuery,
): Promise<SectionMeta & DoctorDashboardStats> {
  const response = await apiRequest<{
    doctors: SectionMeta & DoctorDashboardStats;
  }>({
    method: "GET",
    url: "/dashboard/doctors",
    params: params(query),
  });
  return response.data.doctors;
}

export async function getFinancialDashboard(
  query: DashboardQuery,
): Promise<SectionMeta & FinancialDashboardStats> {
  const response = await apiRequest<{
    financial: SectionMeta & FinancialDashboardStats;
  }>({
    method: "GET",
    url: "/dashboard/financial",
    params: params(query),
  });
  return response.data.financial;
}
