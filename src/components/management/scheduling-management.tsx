"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { listBreaks, listLeaves, listSchedules } from "@/lib/api/appointment-service";
import { listBranches } from "@/lib/api/management-service";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useRef, useState } from "react";
import { readScheduleQuery } from "@/lib/navigation/app-links";
import { ALL_BRANCHES, useBranchContextStore } from "@/stores/branch-context-store";

const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const formatInstant = (value: string, timezone: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value));

export function SchedulingManagement() {
  const permissions = useAuthStore((state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS);
  const branchId = useBranchContextStore((state) => state.selectedBranchId);
  const setSelectedBranch = useBranchContextStore((state) => state.setSelectedBranch);
  const branchFilter = branchId === ALL_BRANCHES ? undefined : branchId;
  const searchParams = useSearchParams();
  const requestedFilters = readScheduleQuery(`?${searchParams.toString()}`);
  const [date, setDate] = useState(() => requestedFilters.date ?? new Date().toISOString().slice(0, 10));
  const requestedBranchId = requestedFilters.branchId ?? null;
  const requestedBranchApplied = useRef(false);
  const branches = useQuery({ queryKey: ["branches", "scheduling"], enabled: permissions.includes("schedule.read"), queryFn: () => listBranches({ page: 1, pageSize: 100, isActive: true }) });
  const schedules = useQuery({ queryKey: ["schedules", branchId, date], enabled: permissions.includes("schedule.read"), queryFn: () => listSchedules({ page: 1, limit: 100, branchId: branchFilter, isActive: "true" }) });
  const leaves = useQuery({ queryKey: ["doctor-leaves", branchId], enabled: permissions.includes("doctor.leave.read"), queryFn: () => listLeaves({ page: 1, limit: 100, branchId: branchFilter, status: "APPROVED" }) });
  const breaks = useQuery({ queryKey: ["doctor-breaks", branchId], enabled: permissions.includes("schedule.break.read"), queryFn: () => listBreaks({ page: 1, limit: 100, branchId: branchFilter }) });
  useEffect(() => {
    if (!requestedBranchId || !branches.data || requestedBranchApplied.current) return;
    const branch = branches.data.branches.find((item) => item.id === requestedBranchId);
    if (branch && branchId !== branch.id) setSelectedBranch(branch.id, branch.name);
    requestedBranchApplied.current = true;
  }, [branchId, branches.data, requestedBranchId, setSelectedBranch]);
  if (!permissions.includes("schedule.read") && !permissions.includes("doctor.leave.read")) return <PageContainer><ErrorState title="You are not authorized to view scheduling data." /></PageContainer>;
  return <PageContainer><PageHeader eyebrow="Scheduling" title="Doctor schedules and availability" description="Recurring windows, breaks, and approved leave are displayed in their branch-local timezone." /><div className="mt-6 flex flex-wrap gap-3"><Select value={branchId} onValueChange={(next) => { if (!next) return; setSelectedBranch(next, branches.data?.branches.find((branch) => branch.id === next)?.name ?? null); }}><SelectTrigger aria-label="Branch" className="w-full sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL_BRANCHES}>All branches</SelectItem>{branches.data?.branches.map((branch) => <SelectItem value={branch.id} key={branch.id}>{branch.name} ({branch.timezone})</SelectItem>)}</SelectContent></Select><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-auto" /></div><div className="mt-6 grid gap-4 lg:grid-cols-3"><Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="size-5" />Recurring schedule windows</CardTitle></CardHeader><CardContent>{schedules.isLoading ? <LoadingState label="Loading schedules..." /> : schedules.isError ? <ErrorState onRetry={() => void schedules.refetch()} /> : <div className="space-y-2">{schedules.data?.schedules.map((schedule) => <div className="rounded-lg border p-3 text-sm" key={schedule.id}><div className="font-medium">{schedule.doctor.fullName} · {schedule.branch.name}</div><div className="text-muted-foreground">{days[schedule.dayOfWeek]} {schedule.startTime}–{schedule.endTime} · {schedule.slotDurationMinutes} minute slots + {schedule.bufferMinutes} minute buffer</div><div className="text-xs text-muted-foreground">Effective {schedule.effectiveFrom}{schedule.effectiveUntil ? ` through ${schedule.effectiveUntil}` : ""} · {schedule.branch.timezone}</div></div>)}</div>}</CardContent></Card><Card><CardHeader><CardTitle>Recurring breaks</CardTitle></CardHeader><CardContent><div className="space-y-2">{breaks.data?.breaks.map((item) => <div className="rounded-lg border p-3 text-sm" key={item.id}><div className="font-medium">{item.schedule.doctorFullName} · {item.schedule.branchName}</div><div>{item.startTime}–{item.endTime}</div><div className="text-muted-foreground">{item.reason ?? "Break"} · {item.schedule.timezone}</div></div>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Approved doctor leave</CardTitle></CardHeader><CardContent>{leaves.isLoading ? <LoadingState label="Loading leave..." /> : leaves.isError ? <ErrorState onRetry={() => void leaves.refetch()} /> : <div className="space-y-2">{leaves.data?.leaves.map((leave) => <div className="rounded-lg border p-3 text-sm" key={leave.id}><div className="font-medium">{leave.doctor.fullName}{leave.branch ? ` · ${leave.branch.name}` : " · All branches"}</div><div>{formatInstant(leave.startAt, leave.branch?.timezone ?? "UTC")} – {formatInstant(leave.endAt, leave.branch?.timezone ?? "UTC")}</div><div className="text-muted-foreground">{leave.reason ?? "No reason provided"}</div></div>)}</div>}</CardContent></Card></div></PageContainer>;
}
