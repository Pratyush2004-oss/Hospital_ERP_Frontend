"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { listBranches } from "@/lib/api/management-service";
import { listDepartments, listDoctors } from "@/lib/api/department-doctor-service";
import { listPatients } from "@/lib/api/patient-service";
import { cancelAppointment, createAppointment, getAvailability, listAppointments } from "@/lib/api/appointment-service";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import { ALL_BRANCHES, useBranchContextStore } from "@/stores/branch-context-store";
import type { AppointmentStatus } from "@/types/appointment";
import { Combobox } from "@/components/shared/combobox";
import { FormField } from "@/components/shared/form-field";
import { FormFooter } from "@/components/shared/form-actions";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statuses: AppointmentStatus[] = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW", "RESCHEDULED"];
const today = () => new Date().toISOString().slice(0, 10);
const displayTime = (instant: string, timezone: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(instant));
const idempotencyKey = () => crypto.randomUUID();

export function AppointmentManagement() {
  const permissions = useAuthStore((state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS);
  const canRead = permissions.includes("appointment:read");
  const canCreate = permissions.includes("appointment:create");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month">("day");
  const [status, setStatus] = useState("");
  const filterBranchId = useBranchContextStore((state) => state.selectedBranchId);
  const setSelectedBranch = useBranchContextStore((state) => state.setSelectedBranch);
  const branchFilter = filterBranchId === ALL_BRANCHES ? undefined : filterBranchId;
  const [filterDepartmentId, setFilterDepartmentId] = useState("");
  const [filterDoctorId, setFilterDoctorId] = useState("");
  const [page, setPage] = useState(1);
  const [bookingOpen, setBookingOpen] = useState(false);
  const range = calendarRange(date, calendarView);
  const query = useQuery({ queryKey: ["appointments", { search, date, calendarView, status, filterBranchId, filterDepartmentId, filterDoctorId, page }], enabled: canRead, queryFn: () => listAppointments({ page, limit: 10, search: search || undefined, dateFrom: range.from || undefined, dateTo: range.to || undefined, status: status ? status as AppointmentStatus : undefined, branchId: branchFilter, departmentId: filterDepartmentId || undefined, doctorId: filterDoctorId || undefined }) });
  const branches = useQuery({ queryKey: ["branches", "appointment-timezones"], enabled: canRead, queryFn: () => listBranches({ page: 1, pageSize: 100, isActive: true }) });
  const departments = useQuery({ queryKey: ["departments", "appointment-filters", filterBranchId], enabled: canRead, queryFn: () => listDepartments({ page: 1, limit: 100, isActive: true, branchId: branchFilter }) });
  const doctors = useQuery({ queryKey: ["doctors", "appointment-filters", filterBranchId, filterDepartmentId], enabled: canRead, queryFn: () => listDoctors({ page: 1, limit: 100, isActive: true, branchId: branchFilter, departmentId: filterDepartmentId || undefined }) });
  const branchTimezones = useMemo(() => new Map((branches.data?.branches ?? []).map((branch) => [branch.id, branch.timezone])), [branches.data]);
  const total = useQuery({ queryKey: ["appointments-stat", "total", branchFilter], enabled: canRead, queryFn: () => listAppointments({ page: 1, limit: 1, branchId: branchFilter }) });
  const todayCount = useQuery({ queryKey: ["appointments-stat", "today", branchFilter], enabled: canRead, queryFn: () => listAppointments({ page: 1, limit: 1, dateFrom: today(), dateTo: today(), branchId: branchFilter }) });
  const upcoming = useQuery({ queryKey: ["appointments-stat", "upcoming", branchFilter], enabled: canRead, queryFn: () => listAppointments({ page: 1, limit: 1, dateFrom: today(), branchId: branchFilter }) });
  const completed = useQuery({ queryKey: ["appointments-stat", "completed", branchFilter], enabled: canRead, queryFn: () => listAppointments({ page: 1, limit: 1, status: "COMPLETED", branchId: branchFilter }) });
  const cancelled = useQuery({ queryKey: ["appointments-stat", "cancelled", branchFilter], enabled: canRead, queryFn: () => listAppointments({ page: 1, limit: 1, status: "CANCELLED", branchId: branchFilter }) });
  const noShow = useQuery({ queryKey: ["appointments-stat", "no-show", branchFilter], enabled: canRead, queryFn: () => listAppointments({ page: 1, limit: 1, status: "NO_SHOW", branchId: branchFilter }) });
  const cancel = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelAppointment(id, reason, idempotencyKey()), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Appointment cancelled."); }, onError: (error) => toast.error(getApiErrorMessage(error)) });
  if (!canRead) return <PageContainer><PageHeader eyebrow="Scheduling" title="Appointments" description="Appointment access is controlled by backend permissions." /><ErrorState title="You are not authorized to view appointments." /></PageContainer>;
  if (query.isError) return <PageContainer><PageHeader eyebrow="Scheduling" title="Appointments" /><ErrorState onRetry={() => void query.refetch()} /></PageContainer>;
  return <PageContainer><PageHeader eyebrow="Scheduling" title="Appointments" description="Appointments and availability are always read from the hospital scheduling service." actions={canCreate ? <Button onClick={() => setBookingOpen(true)}><Plus className="size-4" />Book appointment</Button> : null} /><div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{[["Total", total.data?.pagination.total], ["Today", todayCount.data?.pagination.total], ["Upcoming", upcoming.data?.pagination.total], ["Completed", completed.data?.pagination.total], ["Cancelled", cancelled.data?.pagination.total], ["No-show", noShow.data?.pagination.total]].map(([label, value]) => <Card key={String(label)}><CardContent className="p-4"><div className="text-sm text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-semibold">{value ?? "—"}</div></CardContent></Card>)}</div><Card className="mt-6"><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-5" />Appointment calendar and list</CardTitle></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Input placeholder="Search patient or appointment..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><Input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} /><Select value={calendarView} onValueChange={(value) => { setCalendarView((value ?? "day") as "day" | "week" | "month"); setPage(1); }}><SelectTrigger aria-label="Calendar view" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="day">Day view</SelectItem><SelectItem value="week">Week view</SelectItem><SelectItem value="month">Month view</SelectItem></SelectContent></Select><Select value={status || "ALL"} onValueChange={(value) => { const next = value ?? "ALL"; setStatus(next === "ALL" ? "" : next); setPage(1); }}><SelectTrigger aria-label="Status" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All statuses</SelectItem>{statuses.map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select><Select value={filterBranchId} onValueChange={(next) => { if (!next) return; setSelectedBranch(next, branches.data?.branches.find((item) => item.id === next)?.name ?? null); setFilterDepartmentId(""); setFilterDoctorId(""); setPage(1); }}><SelectTrigger aria-label="Branch" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL_BRANCHES}>All branches</SelectItem>{branches.data?.branches.map((item) => <SelectItem value={item.id} key={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><Select value={filterDepartmentId || "ALL"} onValueChange={(value) => { const next = value ?? "ALL"; setFilterDepartmentId(next === "ALL" ? "" : next); setFilterDoctorId(""); setPage(1); }}><SelectTrigger aria-label="Department" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All departments</SelectItem>{departments.data?.departments.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><Select value={filterDoctorId || "ALL"} onValueChange={(value) => { const next = value ?? "ALL"; setFilterDoctorId(next === "ALL" ? "" : next); setPage(1); }}><SelectTrigger aria-label="Doctor" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All doctors</SelectItem>{doctors.data?.doctors.map((item) => <SelectItem key={item.id} value={item.id}>{item.user.fullName}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={() => void query.refetch()}><RefreshCw className="size-4" />Refresh</Button></div><p className="mt-2 text-xs text-muted-foreground">{range.from ? `${calendarView} range: ${range.from} to ${range.to}` : "Choose a date to view calendar ranges."}</p>{query.isLoading ? <LoadingState label="Loading appointments..." /> : <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr>{["Appointment", "Patient", "Doctor", "Branch", "Date and time", "Status", "Source", "Actions"].map((item) => <th className="px-3 py-3 font-medium" key={item}>{item}</th>)}</tr></thead><tbody>{query.data?.appointments.map((item) => <tr className="border-b last:border-0" key={item.id}><td className="px-3 py-3"><Link className="font-medium hover:text-primary" href={`/appointments/${item.id}`}>{item.appointmentCode}</Link><div className="text-xs text-muted-foreground">{item.appointmentType}</div></td><td className="px-3 py-3">{item.patientName}<div className="text-xs text-muted-foreground">{item.patientCode}</div></td><td className="px-3 py-3">{item.doctorName}</td><td className="px-3 py-3">{item.branchName}</td><td className="px-3 py-3 whitespace-nowrap">{displayTime(item.startAt, branchTimezones.get(item.branchId) ?? "UTC")}</td><td className="px-3 py-3"><StatusBadge status={item.appointmentStatus === "COMPLETED" ? "success" : item.appointmentStatus === "CANCELLED" || item.appointmentStatus === "NO_SHOW" ? "error" : "neutral"}>{item.appointmentStatus}</StatusBadge></td><td className="px-3 py-3">{item.appointmentSource}</td><td className="px-3 py-3">{permissions.includes("appointment:cancel") && !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(item.appointmentStatus) ? <Button variant="ghost" size="sm" onClick={() => { const reason = window.prompt("Cancellation reason"); if (reason?.trim()) cancel.mutate({ id: item.id, reason }); }}>Cancel</Button> : null}</td></tr>)}</tbody></table>{!query.data?.appointments.length ? <p className="py-8 text-center text-sm text-muted-foreground">No appointments match the current filters.</p> : null}</div>}{query.data ? <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground"><span>{query.data.pagination.total} appointments</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="px-2 py-1">Page {page} of {Math.max(1, query.data.pagination.totalPages)}</span><Button variant="outline" size="sm" disabled={page >= query.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div> : null}</CardContent></Card><BookingDialog open={bookingOpen} onOpenChange={setBookingOpen} permissions={permissions} /></PageContainer>;
}

function BookingDialog({ open, onOpenChange, permissions }: { open: boolean; onOpenChange: (open: boolean) => void; permissions: string[] }) {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState(
    useBranchContextStore.getState().selectedBranchId === ALL_BRANCHES
      ? ""
      : useBranchContextStore.getState().selectedBranchId,
  );
  const [departmentId, setDepartmentId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState(today());
  const [slot, setSlot] = useState("");
  const branches = useQuery({ queryKey: ["branches", "appointment-booking"], queryFn: () => listBranches({ page: 1, pageSize: 100, isActive: true }), enabled: open });
  const departments = useQuery({ queryKey: ["departments", "appointment-booking", branchId], queryFn: () => listDepartments({ page: 1, limit: 100, isActive: true, branchId }), enabled: open && Boolean(branchId) });
  const doctors = useQuery({ queryKey: ["doctors", "appointment-booking", branchId, departmentId], queryFn: () => listDoctors({ page: 1, limit: 100, isActive: true, branchId, departmentId: departmentId || undefined }), enabled: open && Boolean(branchId) });
  const patients = useQuery({ queryKey: ["patients", "appointment-booking"], queryFn: () => listPatients({ page: 1, limit: 100 }), enabled: open });
  const availability = useQuery({ queryKey: ["availability", doctorId, branchId, date], queryFn: () => getAvailability({ doctorId, branchId, date }), enabled: open && Boolean(doctorId && branchId && date) });
  const booking = useMutation({ mutationFn: () => createAppointment({ patientId, doctorId, branchId, departmentId: departmentId || null, startAt: slot, appointmentSource: "RECEPTIONIST", appointmentType: "CONSULTATION" }, idempotencyKey()), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["appointments"] }); onOpenChange(false); toast.success("Appointment booked."); }, onError: (error) => toast.error(getApiErrorMessage(error)) });
  const slots = useMemo(() => availability.data?.days.flatMap((day) => day.slots) ?? [], [availability.data]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Book appointment</DialogTitle><DialogDescription>Slots are generated and validated by the backend in the branch timezone.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2">
      <FormField id="booking-branch" label="Branch" required>
        <Combobox id="booking-branch" options={(branches.data?.branches ?? []).map((item) => ({ value: item.id, label: item.name }))} value={branchId} onValueChange={(value) => { setBranchId(String(value)); setDepartmentId(""); setDoctorId(""); setSlot(""); }} placeholder="Select branch" searchPlaceholder="Search branches..." emptyMessage="No branches found." loading={branches.isLoading} error={branches.isError ? "Could not load branches." : undefined} onRetry={() => void branches.refetch()} />
      </FormField>
      <FormField id="booking-department" label="Department">
        <Combobox id="booking-department" options={(departments.data?.departments ?? []).map((item) => ({ value: item.id, label: item.name }))} value={departmentId} onValueChange={(value) => { setDepartmentId(String(value)); setDoctorId(""); setSlot(""); }} placeholder={branchId ? "Any department" : "Select a branch first"} searchPlaceholder="Search departments..." emptyMessage="No departments found." loading={departments.isLoading} error={departments.isError ? "Could not load departments." : undefined} onRetry={() => void departments.refetch()} disabled={!branchId} />
      </FormField>
      <FormField id="booking-doctor" label="Doctor" required>
        <Combobox id="booking-doctor" options={(doctors.data?.doctors ?? []).map((item) => ({ value: item.id, label: item.user.fullName, description: item.specialization ?? undefined }))} value={doctorId} onValueChange={(value) => { setDoctorId(String(value)); setSlot(""); }} placeholder={branchId ? "Select doctor" : "Select a branch first"} searchPlaceholder="Search doctors..." emptyMessage="No doctors found." loading={doctors.isLoading} error={doctors.isError ? "Could not load doctors." : undefined} onRetry={() => void doctors.refetch()} disabled={!branchId} />
      </FormField>
      <FormField id="booking-patient" label="Patient" required>
        <Combobox id="booking-patient" options={(patients.data?.patients ?? []).map((item) => ({ value: item.id, label: item.fullName, description: item.patientCode }))} value={patientId} onValueChange={(value) => setPatientId(String(value))} placeholder="Select patient" searchPlaceholder="Search patients..." emptyMessage="No patients found." loading={patients.isLoading} error={patients.isError ? "Could not load patients." : undefined} onRetry={() => void patients.refetch()} />
      </FormField>
      <FormField id="booking-date" label="Date" required><Input type="date" min={today()} value={date} onChange={(event) => { setDate(event.target.value); setSlot(""); }} /></FormField>
      <FormField id="booking-slot" label={`Available slot${availability.data ? ` · ${availability.data.branchTimezone}` : ""}`} required description={availability.isError ? "Availability could not be loaded. Try another date or doctor." : undefined}>
        <Select value={slot} onValueChange={(value) => setSlot(value ?? "")} disabled={!availability.data}><SelectTrigger id="booking-slot" className="w-full" aria-label="Available slot"><SelectValue placeholder={availability.isLoading ? "Loading slots..." : "Select slot"} /></SelectTrigger><SelectContent>{slots.map((item) => <SelectItem value={item.startAt} key={item.startAt}>{new Intl.DateTimeFormat(undefined, { timeStyle: "short", timeZone: availability.data?.branchTimezone }).format(new Date(item.startAt))}</SelectItem>)}</SelectContent></Select>
      </FormField>
    </div>
    <FormFooter onSubmit={() => booking.mutate()} onCancel={() => onOpenChange(false)} disabled={!permissions.includes("appointment:create") || !patientId || !doctorId || !branchId || !slot} isPending={booking.isPending} submitLabel="Confirm booking" pendingLabel="Booking..." /></DialogContent></Dialog>;
}
function calendarRange(value: string, view: "day" | "week" | "month"): { from: string; to: string } {
  if (!value) return { from: "", to: "" };
  const date = new Date(`${value}T00:00:00Z`);
  const end = new Date(date);
  if (view === "week") end.setUTCDate(end.getUTCDate() + 6);
  if (view === "month") { end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0); }
  return { from: value, to: end.toISOString().slice(0, 10) };
}
