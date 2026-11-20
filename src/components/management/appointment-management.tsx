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
import type { AppointmentStatus } from "@/types/appointment";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [filterBranchId, setFilterBranchId] = useState("");
  const [filterDepartmentId, setFilterDepartmentId] = useState("");
  const [filterDoctorId, setFilterDoctorId] = useState("");
  const [page, setPage] = useState(1);
  const [bookingOpen, setBookingOpen] = useState(false);
  const range = calendarRange(date, calendarView);
  const query = useQuery({ queryKey: ["appointments", { search, date, calendarView, status, filterBranchId, filterDepartmentId, filterDoctorId, page }], enabled: canRead, queryFn: () => listAppointments({ page, limit: 10, search: search || undefined, dateFrom: range.from || undefined, dateTo: range.to || undefined, status: status ? status as AppointmentStatus : undefined, branchId: filterBranchId || undefined, departmentId: filterDepartmentId || undefined, doctorId: filterDoctorId || undefined }) });
  const branches = useQuery({ queryKey: ["branches", "appointment-timezones"], enabled: canRead, queryFn: () => listBranches({ page: 1, pageSize: 100, isActive: true }) });
  const departments = useQuery({ queryKey: ["departments", "appointment-filters", filterBranchId], enabled: canRead, queryFn: () => listDepartments({ page: 1, limit: 100, isActive: true, branchId: filterBranchId || undefined }) });
  const doctors = useQuery({ queryKey: ["doctors", "appointment-filters", filterBranchId, filterDepartmentId], enabled: canRead, queryFn: () => listDoctors({ page: 1, limit: 100, isActive: true, branchId: filterBranchId || undefined, departmentId: filterDepartmentId || undefined }) });
  const branchTimezones = useMemo(() => new Map((branches.data?.branches ?? []).map((branch) => [branch.id, branch.timezone])), [branches.data]);
  const total = useQuery({ queryKey: ["appointments-stat", "total"], enabled: canRead, queryFn: () => listAppointments({ page: 1, limit: 1 }) });
  const todayCount = useQuery({ queryKey: ["appointments-stat", "today"], enabled: canRead, queryFn: () => listAppointments({ page: 1, limit: 1, dateFrom: today(), dateTo: today() }) });
  const upcoming = useQuery({ queryKey: ["appointments-stat", "upcoming"], enabled: canRead, queryFn: () => listAppointments({ page: 1, limit: 1, dateFrom: today() }) });
  const completed = useQuery({ queryKey: ["appointments-stat", "completed"], enabled: canRead, queryFn: () => listAppointments({ page: 1, limit: 1, status: "COMPLETED" }) });
  const cancelled = useQuery({ queryKey: ["appointments-stat", "cancelled"], enabled: canRead, queryFn: () => listAppointments({ page: 1, limit: 1, status: "CANCELLED" }) });
  const noShow = useQuery({ queryKey: ["appointments-stat", "no-show"], enabled: canRead, queryFn: () => listAppointments({ page: 1, limit: 1, status: "NO_SHOW" }) });
  const cancel = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelAppointment(id, reason, idempotencyKey()), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Appointment cancelled."); }, onError: (error) => toast.error(getApiErrorMessage(error)) });
  if (!canRead) return <PageContainer><PageHeader eyebrow="Scheduling" title="Appointments" description="Appointment access is controlled by backend permissions." /><ErrorState title="You are not authorized to view appointments." /></PageContainer>;
  if (query.isError) return <PageContainer><PageHeader eyebrow="Scheduling" title="Appointments" /><ErrorState onRetry={() => void query.refetch()} /></PageContainer>;
  return <PageContainer><PageHeader eyebrow="Scheduling" title="Appointments" description="Appointments and availability are always read from the hospital scheduling service." actions={canCreate ? <Button onClick={() => setBookingOpen(true)}><Plus className="size-4" />Book appointment</Button> : null} /><div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{[["Total", total.data?.pagination.total], ["Today", todayCount.data?.pagination.total], ["Upcoming", upcoming.data?.pagination.total], ["Completed", completed.data?.pagination.total], ["Cancelled", cancelled.data?.pagination.total], ["No-show", noShow.data?.pagination.total]].map(([label, value]) => <Card key={String(label)}><CardContent className="p-4"><div className="text-sm text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-semibold">{value ?? "—"}</div></CardContent></Card>)}</div><Card className="mt-6"><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-5" />Appointment calendar and list</CardTitle></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Input placeholder="Search patient or appointment..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><Input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} /><select aria-label="Calendar view" value={calendarView} onChange={(event) => { setCalendarView(event.target.value as "day" | "week" | "month"); setPage(1); }} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="day">Day view</option><option value="week">Week view</option><option value="month">Month view</option></select><select aria-label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select><select aria-label="Branch" value={filterBranchId} onChange={(event) => { setFilterBranchId(event.target.value); setFilterDepartmentId(""); setFilterDoctorId(""); setPage(1); }} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">All branches</option>{branches.data?.branches.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><select aria-label="Department" value={filterDepartmentId} onChange={(event) => { setFilterDepartmentId(event.target.value); setFilterDoctorId(""); setPage(1); }} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">All departments</option>{departments.data?.departments.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><select aria-label="Doctor" value={filterDoctorId} onChange={(event) => { setFilterDoctorId(event.target.value); setPage(1); }} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">All doctors</option>{doctors.data?.doctors.map((item) => <option value={item.id} key={item.id}>{item.user.fullName}</option>)}</select><Button variant="outline" onClick={() => void query.refetch()}><RefreshCw className="size-4" />Refresh</Button></div><p className="mt-2 text-xs text-muted-foreground">{range.from ? `${calendarView} range: ${range.from} to ${range.to}` : "Choose a date to view calendar ranges."}</p>{query.isLoading ? <LoadingState label="Loading appointments..." /> : <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-muted-foreground"><tr>{["Appointment", "Patient", "Doctor", "Branch", "Date and time", "Status", "Source", "Actions"].map((item) => <th className="px-3 py-3 font-medium" key={item}>{item}</th>)}</tr></thead><tbody>{query.data?.appointments.map((item) => <tr className="border-b last:border-0" key={item.id}><td className="px-3 py-3"><Link className="font-medium hover:text-primary" href={`/appointments/${item.id}`}>{item.appointmentCode}</Link><div className="text-xs text-muted-foreground">{item.appointmentType}</div></td><td className="px-3 py-3">{item.patientName}<div className="text-xs text-muted-foreground">{item.patientCode}</div></td><td className="px-3 py-3">{item.doctorName}</td><td className="px-3 py-3">{item.branchName}</td><td className="px-3 py-3 whitespace-nowrap">{displayTime(item.startAt, branchTimezones.get(item.branchId) ?? "UTC")}</td><td className="px-3 py-3"><StatusBadge status={item.appointmentStatus === "COMPLETED" ? "success" : item.appointmentStatus === "CANCELLED" || item.appointmentStatus === "NO_SHOW" ? "error" : "neutral"}>{item.appointmentStatus}</StatusBadge></td><td className="px-3 py-3">{item.appointmentSource}</td><td className="px-3 py-3">{permissions.includes("appointment:cancel") && !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(item.appointmentStatus) ? <Button variant="ghost" size="sm" onClick={() => { const reason = window.prompt("Cancellation reason"); if (reason?.trim()) cancel.mutate({ id: item.id, reason }); }}>Cancel</Button> : null}</td></tr>)}</tbody></table>{!query.data?.appointments.length ? <p className="py-8 text-center text-sm text-muted-foreground">No appointments match the current filters.</p> : null}</div>}{query.data ? <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground"><span>{query.data.pagination.total} appointments</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="px-2 py-1">Page {page} of {Math.max(1, query.data.pagination.totalPages)}</span><Button variant="outline" size="sm" disabled={page >= query.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div> : null}</CardContent></Card><BookingDialog open={bookingOpen} onOpenChange={setBookingOpen} permissions={permissions} /></PageContainer>;
}

function BookingDialog({ open, onOpenChange, permissions }: { open: boolean; onOpenChange: (open: boolean) => void; permissions: string[] }) {
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState("");
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
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Book appointment</DialogTitle><DialogDescription>Slots are generated and validated by the backend in the branch timezone.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Branch"><select value={branchId} onChange={(event) => { setBranchId(event.target.value); setDepartmentId(""); setDoctorId(""); setSlot(""); }} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">Select branch</option>{branches.data?.branches.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field><Field label="Department"><select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setDoctorId(""); setSlot(""); }} disabled={!branchId} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">Any department</option>{departments.data?.departments.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field><Field label="Doctor"><select value={doctorId} onChange={(event) => { setDoctorId(event.target.value); setSlot(""); }} disabled={!branchId} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">Select doctor</option>{doctors.data?.doctors.map((item) => <option value={item.id} key={item.id}>{item.user.fullName}</option>)}</select></Field><Field label="Patient"><select value={patientId} onChange={(event) => setPatientId(event.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">Select patient</option>{patients.data?.patients.map((item) => <option value={item.id} key={item.id}>{item.fullName} · {item.patientCode}</option>)}</select></Field><Field label="Date"><Input type="date" min={today()} value={date} onChange={(event) => { setDate(event.target.value); setSlot(""); }} /></Field><Field label={`Available slot${availability.data ? ` · ${availability.data.branchTimezone}` : ""}`}><select value={slot} onChange={(event) => setSlot(event.target.value)} disabled={!availability.data} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">Select slot</option>{slots.map((item) => <option value={item.startAt} key={item.startAt}>{new Intl.DateTimeFormat(undefined, { timeStyle: "short", timeZone: availability.data?.branchTimezone }).format(new Date(item.startAt))}</option>)}</select></Field></div><DialogFooter><Button disabled={!permissions.includes("appointment:create") || !patientId || !doctorId || !branchId || !slot || booking.isPending} onClick={() => booking.mutate()}>{booking.isPending ? "Booking..." : "Confirm booking"}</Button></DialogFooter></DialogContent></Dialog>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid gap-2"><Label>{label}</Label>{children}</div>; }
function calendarRange(value: string, view: "day" | "week" | "month"): { from: string; to: string } {
  if (!value) return { from: "", to: "" };
  const date = new Date(`${value}T00:00:00Z`);
  const end = new Date(date);
  if (view === "week") end.setUTCDate(end.getUTCDate() + 6);
  if (view === "month") { end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0); }
  return { from: value, to: end.toISOString().slice(0, 10) };
}
