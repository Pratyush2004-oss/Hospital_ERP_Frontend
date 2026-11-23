"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarCheck2,
  CircleDollarSign,
  ClipboardList,
  Compass,
  RefreshCw,
  Stethoscope,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAppointments } from "@/lib/api/appointment-service";
import { getRevenueTrend } from "@/lib/api/billing-service";
import {
  getAppointmentDashboard,
  getDoctorDashboard,
  getFinancialDashboard,
  getOperationalDashboard,
  getPatientDashboard,
} from "@/lib/api/dashboard-service";
import { getSetupReadiness } from "@/lib/api/setup-service";
import { buildScheduleHref, canViewSchedule } from "@/lib/navigation/app-links";
import {
  appointmentStatusSeries,
  dashboardBranchFilter,
  dashboardPermissionFlags,
  dashboardRangePresets,
  defaultDashboardRange,
  formatDashboardAmounts,
  hasAppointmentData,
  isPresetActive,
  isSetupIncomplete,
  nextSetupStep,
  validateDashboardRange,
  type DashboardDateRange,
} from "@/lib/dashboard/dashboard-view";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import { ALL_BRANCHES, useBranchContextStore } from "@/stores/branch-context-store";
import type { Appointment, AppointmentStatus } from "@/types/appointment";

const SETUP_READ_PERMISSIONS = [
  "tenant:read",
  "branch:read",
  "department:read",
  "staff:read",
  "doctor:read",
  "schedule.read",
] as const;

const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "RESCHEDULED",
];

const STATUS_VARIANT: Record<
  AppointmentStatus,
  "success" | "warning" | "error" | "info" | "neutral"
> = {
  COMPLETED: "success",
  CANCELLED: "error",
  NO_SHOW: "error",
  PENDING: "warning",
  CONFIRMED: "info",
  CHECKED_IN: "info",
  IN_PROGRESS: "info",
  RESCHEDULED: "neutral",
};

function formatAppointmentTime(appointment: Appointment): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: appointment.branchTimezone,
    }).format(new Date(appointment.startAt));
  } catch {
    return new Date(appointment.startAt).toLocaleString();
  }
}

function BranchScopeBadge({
  branchName,
  isAllBranches,
}: {
  branchName: string | null;
  isAllBranches: boolean;
}) {
  if (isAllBranches) return <Badge variant="outline">All branches</Badge>;
  return <Badge variant="secondary">Branch: {branchName ?? "Selected branch"}</Badge>;
}

export function DashboardOverview() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.session?.user);
  const tenant = useAuthStore((state) => state.session?.activeTenant ?? null);
  const permissions = tenant?.permissions ?? EMPTY_PERMISSIONS;
  const tenantId = tenant?.id;
  const displayName = user?.fullName?.split(/\s+/)[0] ?? "there";

  const selectedBranchId = useBranchContextStore((state) => state.selectedBranchId);
  const selectedBranchName = useBranchContextStore((state) => state.selectedBranchName);
  const branchFilter = dashboardBranchFilter(selectedBranchId);
  const flags = dashboardPermissionFlags(permissions);
  const canReadSetup = SETUP_READ_PERMISSIONS.some((permission) =>
    permissions.includes(permission),
  );

  const [range, setRange] = useState<DashboardDateRange>(() => defaultDashboardRange());
  const [appointmentStatus, setAppointmentStatus] = useState<"" | AppointmentStatus>("");
  // Page is scoped to the active list filter. When a filter changes the stored
  // key no longer matches, the list falls back to page 1 without an effect.
  const listKey = [range.fromDate, range.toDate, selectedBranchId, appointmentStatus].join("|");
  const [appointmentPager, setAppointmentPager] = useState<{ key: string; page: number }>({
    key: listKey,
    page: 1,
  });
  const appointmentPage = appointmentPager.key === listKey ? appointmentPager.page : 1;
  function setAppointmentPage(next: number | ((page: number) => number)) {
    setAppointmentPager((current) => {
      const currentPage = current.key === listKey ? current.page : 1;
      return {
        key: listKey,
        page: typeof next === "function" ? next(currentPage) : next,
      };
    });
  }

  const validation = validateDashboardRange(range);
  const rangeValid = validation.valid;
  const presets = useMemo(() => dashboardRangePresets(), []);
  const queryScope = { ...range, ...(branchFilter ? { branchId: branchFilter } : {}) };
  const scopeKey = [tenantId, range.fromDate, range.toDate, branchFilter ?? ALL_BRANCHES];
  const queriesEnabled = Boolean(tenantId) && rangeValid && flags.reports;

  const operational = useQuery({
    queryKey: ["dashboard", "operational", ...scopeKey],
    queryFn: () => getOperationalDashboard(queryScope),
    enabled: queriesEnabled,
  });
  const appointments = useQuery({
    queryKey: ["dashboard", "appointments", ...scopeKey],
    queryFn: () => getAppointmentDashboard(queryScope),
    enabled: queriesEnabled && flags.appointments,
  });
  const patients = useQuery({
    queryKey: ["dashboard", "patients", ...scopeKey],
    queryFn: () => getPatientDashboard(queryScope),
    enabled: queriesEnabled && flags.patients,
  });
  const doctors = useQuery({
    queryKey: ["dashboard", "doctors", ...scopeKey],
    queryFn: () => getDoctorDashboard(queryScope),
    enabled: queriesEnabled && flags.doctors,
  });
  const financial = useQuery({
    queryKey: ["dashboard", "financial", ...scopeKey],
    queryFn: () => getFinancialDashboard(queryScope),
    enabled: queriesEnabled && flags.financial,
  });
  const revenueTrend = useQuery({
    queryKey: ["dashboard", "revenue-trend", ...scopeKey],
    queryFn: () =>
      getRevenueTrend({
        fromDate: range.fromDate,
        toDate: range.toDate,
        granularity: "day",
        ...(branchFilter ? { branchId: branchFilter } : {}),
      }),
    enabled: queriesEnabled && flags.financial,
  });

  const appointmentList = useQuery({
    queryKey: [
      "dashboard",
      "appointment-list",
      ...scopeKey,
      appointmentStatus,
      appointmentPage,
    ],
    queryFn: () =>
      listAppointments({
        page: appointmentPage,
        limit: 6,
        dateFrom: range.fromDate,
        dateTo: range.toDate,
        ...(appointmentStatus ? { status: appointmentStatus } : {}),
        ...(branchFilter ? { branchId: branchFilter } : {}),
      }),
    enabled: queriesEnabled && flags.appointments,
  });

  const readiness = useQuery({
    queryKey: ["setup-readiness", tenantId],
    queryFn: () => getSetupReadiness(),
    enabled: Boolean(tenantId) && canReadSetup,
  });

  const setupIncomplete = isSetupIncomplete(readiness.data);
  const nextStep = nextSetupStep(readiness.data);
  const appointmentStats = operational.data?.appointments;
  const patientStats = patients.data ?? operational.data?.patients;
  const doctorStats = doctors.data ?? operational.data?.doctors;

  const revenueTrendPoints = useMemo(() => {
    const points = revenueTrend.data?.points ?? [];
    const currency = points[0]?.currency;
    if (!currency) return [];
    return points
      .filter((point) => point.currency === currency)
      .map((point) => ({
        period: point.period,
        collected: Number(point.collected),
        netCollected: Number(point.netCollected),
      }));
  }, [revenueTrend.data]);
  const trendCurrency = revenueTrend.data?.points[0]?.currency;

  const hasAnySection =
    flags.appointments || flags.patients || flags.doctors || flags.financial;
  const allSectionsEmpty =
    hasAnySection &&
    Boolean(operational.data) &&
    (operational.data?.appointments?.total ?? 0) === 0 &&
    (operational.data?.patients?.total ?? 0) === 0 &&
    (operational.data?.doctors?.workload.length ?? 0) === 0 &&
    (!flags.financial || financial.data?.invoiceCount === 0);

  const derivedRange = operational.data ?? appointments.data ?? financial.data;
  const timezone = derivedRange?.timezone;
  const rangeLabel = `${range.fromDate} → ${range.toDate}`;

  function refreshAll() {
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["setup-readiness", tenantId] });
  }

  function applyPreset(next: DashboardDateRange) {
    setRange(next);
    setAppointmentPage(1);
  }

  if (!flags.reports) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Workspace"
          title={`Good to see you, ${displayName}`}
          description="Your landing page is limited to the modules your role can access."
        />
        <RestrictedDashboard permissions={permissions} />
        <SetupChecklist />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Workspace"
        title={`Good to see you, ${displayName}`}
        description={`Live hospital metrics for ${rangeLabel}${timezone ? ` · ${timezone}` : ""}.`}
        actions={
          <>
            <Button variant="outline" onClick={refreshAll} disabled={operational.isFetching}>
              <RefreshCw
                className={operational.isFetching ? "size-4 animate-spin" : "size-4"}
              />
              Refresh
            </Button>
            {canViewSchedule(permissions) ? (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={buildScheduleHref({
                      fromDate: range.fromDate,
                      branchId: branchFilter,
                    })}
                  />
                }
              >
                <CalendarCheck2 />
                View schedule
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <BranchScopeBadge
          branchName={selectedBranchName}
          isAllBranches={!branchFilter}
        />
        <span className="text-xs text-muted-foreground">
          {branchFilter
            ? "Showing one branch. The branch selection is a data filter, not an authorization boundary."
            : "Showing every branch in this hospital."}
        </span>
      </div>

      <SetupChecklist />

      {setupIncomplete && nextStep ? (
        <Alert className="border-primary/30 bg-primary/5">
          <Compass className="size-4 text-primary" />
          <AlertTitle>Continue setting up your hospital</AlertTitle>
          <AlertDescription>
            {readiness.data?.progress.requiredCompleted} of{" "}
            {readiness.data?.progress.requiredTotal} required steps are complete. Finish{" "}
            {nextStep.title.toLowerCase()} to unlock a complete operational dashboard.
          </AlertDescription>
          <AlertAction>
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href={nextStep.actionPath} />}
            >
              {nextStep.actionLabel}
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Date range</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Metrics refresh automatically when the range or branch changes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.key}
                size="sm"
                variant={isPresetActive(preset, range) ? "default" : "outline"}
                onClick={() => applyPreset({ fromDate: preset.fromDate, toDate: preset.toDate })}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm">
              <span className="block text-muted-foreground">Start date</span>
              <Input
                type="date"
                value={range.fromDate}
                max={range.toDate}
                onChange={(event) => {
                  setRange((current) => ({ ...current, fromDate: event.target.value }));
                  setAppointmentPage(1);
                }}
                className="w-auto"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="block text-muted-foreground">End date</span>
              <Input
                type="date"
                value={range.toDate}
                min={range.fromDate}
                onChange={(event) => {
                  setRange((current) => ({ ...current, toDate: event.target.value }));
                  setAppointmentPage(1);
                }}
                className="w-auto"
              />
            </label>
            {!rangeValid ? (
              <p className="text-sm font-medium text-destructive">{validation.message}</p>
            ) : null}
          </div>
          {branchFilter ? (
            <p className="text-xs text-muted-foreground">
              Appointment, doctor and financial metrics honor the branch filter. Patient
              totals stay hospital-wide because patient profiles are not branch-scoped.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {operational.isLoading ? (
        <DashboardSkeleton />
      ) : operational.isError ? (
        <ErrorState
          title="Unable to load dashboard analytics"
          onRetry={() => {
            void operational.refetch();
            void appointments.refetch();
            void patients.refetch();
            void doctors.refetch();
            void financial.refetch();
            void appointmentList.refetch();
          }}
        />
      ) : (
        <>
          {hasAnySection ? (
            <section
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              aria-label="Key metrics"
            >
            {flags.appointments ? (
              <StatCard
                label="Appointments in range"
                value={String(appointmentStats?.total ?? 0)}
                trend={`${appointmentStats?.completed ?? 0} completed · ${
                  appointmentStats?.cancelled ?? 0
                } cancelled`}
                icon={<CalendarCheck2 className="size-4" />}
              />
            ) : null}
            {flags.appointments ? (
              <StatCard
                label="Upcoming appointments"
                value={String(appointmentStats?.upcoming ?? 0)}
                trend={`${appointmentStats?.noShows ?? 0} no-shows in range`}
                icon={<ClipboardList className="size-4" />}
              />
            ) : null}
            {flags.patients ? (
              <StatCard
                label="Total patients"
                value={String(patientStats?.total ?? 0)}
                trend={
                  patientStats
                    ? `${patientStats.newlyRegistered} registered in range · hospital-wide`
                    : "Hospital-wide total"
                }
                icon={<Users className="size-4" />}
              />
            ) : null}
            {flags.doctors ? (
              <StatCard
                label="Active doctors"
                value={String(doctorStats?.activeDoctors ?? 0)}
                trend={`${doctorStats?.workload.length ?? 0} with appointments in range`}
                icon={<Stethoscope className="size-4" />}
              />
            ) : null}
            {flags.financial ? (
              <StatCard
                label="Net collections"
                value={formatDashboardAmounts(financial.data?.netCollections)}
                trend={
                  financial.data
                    ? `${financial.data.invoiceCount} invoices issued in range`
                    : "Successful collections minus refunds"
                }
                icon={<CircleDollarSign className="size-4" />}
              />
            ) : null}
            {flags.financial ? (
              <StatCard
                label="Pending invoices"
                value={String(financial.data?.pendingInvoices.invoiceCount ?? 0)}
                trend={
                  financial.data
                    ? `${formatDashboardAmounts(
                        financial.data.pendingInvoices.outstanding,
                      )} outstanding`
                    : "Open balances as of the end date"
                }
                icon={<CircleDollarSign className="size-4" />}
              />
            ) : null}
            </section>
          ) : null}

          {!hasAnySection || allSectionsEmpty ? (
            <EmptyState
              title={
                hasAnySection
                  ? "No hospital activity in this range yet"
                  : "No dashboard sections for your role"
              }
              description={
                !hasAnySection
                  ? "Your role can view analytics but does not include appointment, patient, doctor or payment read permissions. Ask a hospital administrator if that is unexpected."
                  : setupIncomplete
                    ? "Complete the setup steps above, then book or register the first records to populate this dashboard."
                    : "There are no appointments, patients or invoices recorded for this range and branch. Adjust the filters or create the first record."
              }
            />
          ) : (
            <>
              <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
                {flags.appointments ? (
                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div>
                        <CardTitle>Appointment status</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Status totals for the selected range from the scheduling service.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={<Link href="/appointments" />}
                      >
                        Open
                        <ArrowUpRight className="size-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {appointments.isLoading ? (
                        <ChartSkeleton />
                      ) : appointments.isError ? (
                        <ErrorState
                          title="Unable to load appointment metrics"
                          onRetry={() => void appointments.refetch()}
                        />
                      ) : hasAppointmentData(appointments.data ?? appointmentStats) ? (
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={appointmentStatusSeries(appointments.data ?? appointmentStats)}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                              <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                              />
                              <YAxis
                                allowDecimals={false}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: "var(--popover)",
                                  borderColor: "var(--border)",
                                  borderRadius: "var(--radius)",
                                }}
                              />
                              <Bar dataKey="count" name="Appointments" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <EmptyState
                          title="No appointments in this range"
                          description="Choose a wider date range or book an appointment to see status totals."
                        />
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {flags.financial ? (
                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div>
                        <CardTitle>Collections trend</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Daily collected amounts from the billing ledger
                          {trendCurrency ? ` · ${trendCurrency}` : ""}.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={<Link href="/financial-analytics" />}
                      >
                        Reports
                        <ArrowUpRight className="size-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {revenueTrend.isLoading ? (
                        <ChartSkeleton />
                      ) : revenueTrend.isError ? (
                        <ErrorState
                          title="Unable to load the collections trend"
                          onRetry={() => void revenueTrend.refetch()}
                        />
                      ) : revenueTrendPoints.length > 0 ? (
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueTrendPoints}>
                              <defs>
                                <linearGradient id="dashboard-collected" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                              <XAxis
                                dataKey="period"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: "var(--popover)",
                                  borderColor: "var(--border)",
                                  borderRadius: "var(--radius)",
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="collected"
                                name="Collected"
                                stroke="var(--primary)"
                                fill="url(#dashboard-collected)"
                                strokeWidth={2}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <EmptyState
                          title="No collections in this range"
                          description="Payments recorded by the billing service will appear here."
                        />
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </section>

              <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
                {flags.doctors ? (
                  <Card>
                    <CardHeader>
                      <SectionHeader
                        title="Doctor workload"
                        description="Appointments per doctor in the selected range."
                      />
                    </CardHeader>
                    <CardContent>
                      {doctors.isLoading ? (
                        <LoadingState label="Loading doctor workload..." />
                      ) : doctors.isError ? (
                        <ErrorState
                          title="Unable to load doctor workload"
                          onRetry={() => void doctors.refetch()}
                        />
                      ) : doctorStats && doctorStats.workload.length > 0 ? (
                        <div className="overflow-hidden rounded-lg border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Doctor</TableHead>
                                <TableHead className="text-right">Appointments</TableHead>
                                <TableHead className="text-right">Completed</TableHead>
                                <TableHead className="text-right">Upcoming</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {doctorStats.workload.map((row) => (
                                <TableRow key={row.doctorId}>
                                  <TableCell>
                                    <Link
                                      href={`/doctors/${row.doctorId}`}
                                      className="font-medium underline-offset-4 hover:underline"
                                    >
                                      {row.doctorName ?? row.doctorCode}
                                    </Link>
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {row.doctorCode}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {row.appointmentCount}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {row.completedCount}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {row.upcomingCount}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <EmptyState
                          title="No doctor activity in this range"
                          description="Doctors with appointments in the selected range will be listed here."
                        />
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {flags.financial ? (
                  <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div>
                        <CardTitle>Outstanding balances</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Open balances on invoices issued in this range, as of the end date.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        nativeButton={false}
                        render={<Link href="/billing" />}
                      >
                        Billing
                        <ArrowUpRight className="size-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {financial.isLoading ? (
                        <LoadingState label="Loading outstanding balances..." />
                      ) : financial.isError ? (
                        <ErrorState
                          title="Unable to load financial metrics"
                          onRetry={() => void financial.refetch()}
                        />
                      ) : (
                        <>
                          <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">Total outstanding</p>
                            <p className="mt-1 text-2xl font-semibold">
                              {formatDashboardAmounts(financial.data?.pendingInvoices.outstanding)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {financial.data?.pendingInvoices.invoiceCount ?? 0} open invoices
                            </p>
                          </div>
                          <dl className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <dt className="text-muted-foreground">Revenue</dt>
                              <dd className="font-medium">
                                {formatDashboardAmounts(financial.data?.revenue)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">Collections</dt>
                              <dd className="font-medium">
                                {formatDashboardAmounts(financial.data?.collections)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">Refunds</dt>
                              <dd className="font-medium">
                                {formatDashboardAmounts(financial.data?.refunds)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">Net</dt>
                              <dd className="font-medium">
                                {formatDashboardAmounts(financial.data?.netCollections)}
                              </dd>
                            </div>
                          </dl>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </section>

              {flags.appointments ? (
                <section className="space-y-4">
                  <SectionHeader
                    title="Recent appointments"
                    description="Authorized appointments in the selected range."
                    action={
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={appointmentStatus || "ALL"}
                          onValueChange={(value) => {
                            const next = value ?? "ALL";
                            setAppointmentStatus(next === "ALL" ? "" : (next as AppointmentStatus));
                            setAppointmentPage(1);
                          }}
                        >
                          <SelectTrigger aria-label="Appointment status filter" size="sm" className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All statuses</SelectItem>
                            {APPOINTMENT_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status.replaceAll("_", " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          nativeButton={false}
                          render={<Link href="/appointments" />}
                        >
                          View all
                        </Button>
                      </div>
                    }
                  />
                  <Card>
                    <CardContent className="p-0">
                      {appointmentList.isLoading ? (
                        <div className="p-4">
                          <LoadingState label="Loading appointments..." />
                        </div>
                      ) : appointmentList.isError ? (
                        <div className="p-4">
                          <ErrorState
                            title="Unable to load appointments"
                            onRetry={() => void appointmentList.refetch()}
                          />
                        </div>
                      ) : appointmentList.data && appointmentList.data.appointments.length > 0 ? (
                        <>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Time</TableHead>
                                  <TableHead>Patient</TableHead>
                                  <TableHead>Doctor</TableHead>
                                  <TableHead>Branch</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {appointmentList.data.appointments.map((appointment) => (
                                  <TableRow key={appointment.id}>
                                    <TableCell className="whitespace-nowrap">
                                      {formatAppointmentTime(appointment)}
                                    </TableCell>
                                    <TableCell>
                                      <Link
                                        href={`/appointments/${appointment.id}`}
                                        className="font-medium underline-offset-4 hover:underline"
                                      >
                                        {appointment.patientName}
                                      </Link>
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        {appointment.patientCode}
                                      </span>
                                    </TableCell>
                                    <TableCell>{appointment.doctorName}</TableCell>
                                    <TableCell>{appointment.branchName}</TableCell>
                                    <TableCell>
                                      <StatusBadge
                                        status={STATUS_VARIANT[appointment.appointmentStatus]}
                                      >
                                        {appointment.appointmentStatus.replaceAll("_", " ")}
                                      </StatusBadge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="flex items-center justify-between gap-4 border-t px-4 py-3 text-sm text-muted-foreground">
                            <span>
                              Page {appointmentList.data.pagination.page} of{" "}
                              {Math.max(appointmentList.data.pagination.totalPages, 1)}
                            </span>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAppointmentPage((page) => Math.max(page - 1, 1))}
                                disabled={appointmentPage <= 1 || appointmentList.isFetching}
                              >
                                Previous
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAppointmentPage((page) => page + 1)}
                                disabled={
                                  appointmentPage >=
                                    appointmentList.data.pagination.totalPages ||
                                  appointmentList.isFetching
                                }
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-4">
                          <EmptyState
                            title="No appointments match these filters"
                            description="Adjust the date range, branch or status to see authorized appointments."
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </section>
              ) : null}
            </>
          )}
        </>
      )}
    </PageContainer>
  );
}

function RestrictedDashboard({ permissions }: { permissions: readonly string[] }) {
  const links = [
    { permission: "appointment:read", href: "/appointments", label: "Appointments" },
    { permission: "patient:read", href: "/patients", label: "Patients" },
    { permission: "doctor:read", href: "/doctors", label: "Doctors" },
    { permission: "payment:read", href: "/billing", label: "Billing & payments" },
    { permission: "branch:read", href: "/branches", label: "Branches" },
  ].filter((link) => permissions.includes(link.permission));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics are not available for your role</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Dashboard analytics require the <code>reports:read</code> permission. Your access is
          still governed by the backend, and the shortcuts below only include modules your role
          can already open.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {links.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {links.map((link) => (
              <Button
                key={link.href}
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={link.href} />}
              >
                {link.label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ask a hospital administrator if you expected access to a module.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Financial, patient and staff information is never shown without the matching backend
          permission.
        </p>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard analytics">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-56 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-56 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
