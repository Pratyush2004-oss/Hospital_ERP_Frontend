const SCHEDULE_PERMISSIONS = [
  "schedule.read",
  "doctor.leave.read",
  "schedule.break.read",
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The scheduling page requires one of these read permissions. */
export function canViewSchedule(permissions: readonly string[]): boolean {
  return SCHEDULE_PERMISSIONS.some((permission) => permissions.includes(permission));
}

/** Links the dashboard to the actual schedule view with its date/branch context. */
export function buildScheduleHref(input: {
  fromDate?: string;
  branchId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (input.fromDate && ISO_DATE.test(input.fromDate)) {
    params.set("date", input.fromDate);
  }
  if (input.branchId) params.set("branchId", input.branchId);
  const query = params.toString();
  return query ? `/scheduling?${query}` : "/scheduling";
}

/** Reads only valid schedule filters from the page URL. */
export function readScheduleQuery(search: string): {
  date?: string;
  branchId?: string;
} {
  const params = new URLSearchParams(search);
  const date = params.get("date");
  const branchId = params.get("branchId");
  return {
    ...(date && ISO_DATE.test(date) ? { date } : {}),
    ...(branchId ? { branchId } : {}),
  };
}
