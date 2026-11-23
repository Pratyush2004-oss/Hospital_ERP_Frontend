import { ALL_BRANCHES } from "@/stores/branch-context-store";
import type { CurrencyAmount } from "@/types/billing";
import type { AppointmentDashboardStats } from "@/types/dashboard";
import type { SetupReadiness, SetupStep } from "@/types/setup";

/**
 * Pure dashboard view helpers.
 *
 * Keeping range validation, permission mapping and formatting here makes these
 * rules testable without a DOM and keeps them out of the render path.
 */

export type DashboardDateRange = {
  fromDate: string;
  toDate: string;
};

export type DashboardRangeValidation =
  | { valid: true }
  | { valid: false; message: string };

export const MAX_DASHBOARD_RANGE_DAYS = 366;

export type DashboardPermissionFlags = {
  reports: boolean;
  appointments: boolean;
  patients: boolean;
  doctors: boolean;
  financial: boolean;
};

/** Matches the backend section guards exposed by `/dashboard/*`. */
export function dashboardPermissionFlags(
  permissions: readonly string[],
): DashboardPermissionFlags {
  const has = (permission: string) => permissions.includes(permission);
  return {
    reports: has("reports:read"),
    appointments: has("appointment:read"),
    patients: has("patient:read"),
    doctors: has("doctor:read"),
    financial: has("payment:read"),
  };
}

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromLocal(date: Date): string {
  return localDateString(date);
}

/** Default operational window: the last 30 local calendar days, inclusive. */
export function defaultDashboardRange(now: Date = new Date()): DashboardDateRange {
  const from = new Date(now);
  from.setDate(from.getDate() - 29);
  return { fromDate: fromLocal(from), toDate: fromLocal(now) };
}

export type DashboardRangePreset = DashboardDateRange & {
  key: "today" | "last-7" | "last-30" | "this-month";
  label: string;
};

export function dashboardRangePresets(now: Date = new Date()): DashboardRangePreset[] {
  const today = fromLocal(now);
  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 6);
  const lastMonth = new Date(now);
  lastMonth.setDate(lastMonth.getDate() - 29);

  return [
    { key: "today", label: "Today", fromDate: today, toDate: today },
    { key: "last-7", label: "Last 7 days", fromDate: fromLocal(lastWeek), toDate: today },
    { key: "last-30", label: "Last 30 days", fromDate: fromLocal(lastMonth), toDate: today },
    {
      key: "this-month",
      label: "This month",
      fromDate: fromLocal(new Date(now.getFullYear(), now.getMonth(), 1)),
      toDate: today,
    },
  ];
}

/** Inclusive day count between two ISO calendar dates (DST-safe via UTC). */
export function dashboardRangeDays(range: DashboardDateRange): number {
  const from = Date.parse(`${range.fromDate}T00:00:00Z`);
  const to = Date.parse(`${range.toDate}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.floor((to - from) / 86_400_000) + 1;
}

/** Mirrors the API rules so an invalid range never becomes a 422 request. */
export function validateDashboardRange(
  range: DashboardDateRange,
): DashboardRangeValidation {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(range.fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(range.toDate)) {
    return { valid: false, message: "Choose both a start and an end date." };
  }
  if (range.fromDate > range.toDate) {
    return { valid: false, message: "The start date must be on or before the end date." };
  }
  if (dashboardRangeDays(range) > MAX_DASHBOARD_RANGE_DAYS) {
    return {
      valid: false,
      message: `Choose a range of ${MAX_DASHBOARD_RANGE_DAYS} days or fewer.`,
    };
  }
  return { valid: true };
}

export function isPresetActive(
  preset: DashboardDateRange,
  range: DashboardDateRange,
): boolean {
  return preset.fromDate === range.fromDate && preset.toDate === range.toDate;
}

/** `selectedBranchId` is `ALL_BRANCHES` unless the user picked a branch. */
export function dashboardBranchFilter(selectedBranchId: string): string | undefined {
  return selectedBranchId === ALL_BRANCHES || !selectedBranchId
    ? undefined
    : selectedBranchId;
}

export function isSetupIncomplete(readiness: SetupReadiness | null | undefined): boolean {
  if (!readiness) return false;
  return readiness.steps.some((step) => step.required && !step.complete);
}

/**
 * The next actionable setup step: the API's recommended step when it is still
 * incomplete, otherwise the first incomplete required step.
 */
export function nextSetupStep(readiness: SetupReadiness | null | undefined): SetupStep | null {
  if (!readiness) return null;
  const recommended = readiness.nextStepKey
    ? readiness.steps.find((step) => step.key === readiness.nextStepKey) ?? null
    : null;
  if (recommended && !recommended.complete) return recommended;
  return readiness.steps.find((step) => step.required && !step.complete) ?? null;
}

function formatAmount({ currency, amount }: CurrencyAmount): string {
  const [whole, fraction] = amount.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${currency} ${grouped}${fraction ? `.${fraction}` : ""}`;
}

/** Joins per-currency decimal strings without converting them to floats. */
export function formatDashboardAmounts(amounts: readonly CurrencyAmount[] | undefined): string {
  if (!amounts || amounts.length === 0) return "—";
  return amounts.map(formatAmount).join(" · ");
}

export type AppointmentStatusSeriesPoint = {
  key: keyof AppointmentDashboardStats;
  label: string;
  count: number;
};

export function appointmentStatusSeries(
  stats: AppointmentDashboardStats | undefined,
): AppointmentStatusSeriesPoint[] {
  if (!stats) return [];
  return [
    { key: "completed", label: "Completed", count: stats.completed },
    { key: "upcoming", label: "Upcoming", count: stats.upcoming },
    { key: "cancelled", label: "Cancelled", count: stats.cancelled },
    { key: "noShows", label: "No-show", count: stats.noShows },
  ];
}

export function hasAppointmentData(stats: AppointmentDashboardStats | undefined): boolean {
  return Boolean(stats && stats.total > 0);
}
