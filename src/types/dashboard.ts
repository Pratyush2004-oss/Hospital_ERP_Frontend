import type { CurrencyAmount } from "@/types/billing";

/**
 * Phase 22 dashboard analytics contracts.
 *
 * These mirror `apps/api/src/modules/dashboard/dashboard.types.ts`. Financial
 * amounts stay decimal strings grouped by currency; the UI never converts them
 * to floats for display aggregation.
 */

export type DashboardRangeMeta = {
  fromDate: string;
  toDate: string;
  branchId: string | null;
  timezone: string;
  asOf: string;
};

export type AppointmentDashboardStats = {
  total: number;
  completed: number;
  cancelled: number;
  upcoming: number;
  noShows: number;
};

export type PatientDashboardStats = {
  /** All non-deleted patients in the hospital; not narrowed by branch. */
  total: number;
  /** Registrations created inside the selected range and timezone. */
  newlyRegistered: number;
};

export type DoctorWorkloadRow = {
  doctorId: string;
  doctorCode: string;
  doctorName: string | null;
  appointmentCount: number;
  completedCount: number;
  upcomingCount: number;
};

export type DoctorDashboardStats = {
  activeDoctors: number;
  workload: DoctorWorkloadRow[];
};

export type PendingInvoiceDashboardStats = {
  invoiceCount: number;
  outstanding: CurrencyAmount[];
};

export type FinancialDashboardStats = {
  fromDate: string;
  toDate: string;
  timezone: string;
  invoiceCount: number;
  revenue: CurrencyAmount[];
  collections: CurrencyAmount[];
  refunds: CurrencyAmount[];
  netCollections: CurrencyAmount[];
  pendingInvoices: PendingInvoiceDashboardStats;
};

/**
 * Composed operational response. The backend omits any section the caller
 * cannot read, so appointment/patient/doctor data are optional by design.
 */
export type OperationalDashboard = DashboardRangeMeta & {
  appointments?: AppointmentDashboardStats;
  patients?: PatientDashboardStats;
  doctors?: DoctorDashboardStats;
};
