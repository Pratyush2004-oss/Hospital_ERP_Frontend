"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { cancelAppointment, getAppointment, getAvailability, lifecycleAppointment, rescheduleAppointment } from "@/lib/api/appointment-service";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const displayTime = (instant: string, timezone: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short", timeZone: timezone }).format(new Date(instant));

export function AppointmentDetails({ appointmentId }: { appointmentId: string }) {
  const permissions = useAuthStore((state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS);
  const client = useQueryClient();
  const appointment = useQuery({ queryKey: ["appointment", appointmentId], enabled: permissions.includes("appointment:read"), queryFn: () => getAppointment(appointmentId) });
  const lifecycle = useMutation({ mutationFn: (action: "check-in" | "start" | "complete" | "no-show") => lifecycleAppointment(appointmentId, action), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["appointment", appointmentId] }); await client.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Appointment status updated."); }, onError: (error) => toast.error(getApiErrorMessage(error)) });
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const availability = useQuery({ queryKey: ["appointment-reschedule-availability", itemOrEmpty(appointment.data)?.doctorId, itemOrEmpty(appointment.data)?.branchId, rescheduleDate], enabled: Boolean(appointment.data && rescheduleDate), queryFn: () => getAvailability({ doctorId: appointment.data?.doctorId ?? "", branchId: appointment.data?.branchId ?? "", date: rescheduleDate }) });
  const reschedule = useMutation({ mutationFn: () => rescheduleAppointment(appointmentId, { startAt: rescheduleSlot }, crypto.randomUUID()), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["appointment", appointmentId] }); await client.invalidateQueries({ queryKey: ["appointments"] }); setRescheduleSlot(""); toast.success("Appointment rescheduled."); }, onError: (error) => toast.error(getApiErrorMessage(error)) });
  const cancel = useMutation({ mutationFn: (reason: string) => cancelAppointment(appointmentId, reason, crypto.randomUUID()), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["appointment", appointmentId] }); await client.invalidateQueries({ queryKey: ["appointments"] }); toast.success("Appointment cancelled."); }, onError: (error) => toast.error(getApiErrorMessage(error)) });
  if (!permissions.includes("appointment:read")) return <PageContainer><ErrorState title="You are not authorized to view appointments." /></PageContainer>;
  if (appointment.isLoading) return <PageContainer><LoadingState label="Loading appointment..." /></PageContainer>;
  if (appointment.isError || !appointment.data) return <PageContainer><ErrorState onRetry={() => void appointment.refetch()} /></PageContainer>;
  const item = appointment.data;
  const canUpdate = permissions.includes("appointment:update");
  const actions: Array<["check-in" | "start" | "complete" | "no-show", string]> = item.appointmentStatus === "CONFIRMED" ? [["check-in", "Check in"], ["no-show", "Mark no-show"]] : item.appointmentStatus === "CHECKED_IN" ? [["start", "Start consultation"]] : item.appointmentStatus === "IN_PROGRESS" ? [["complete", "Complete consultation"]] : [];
  return <PageContainer><PageHeader eyebrow="Appointment" title={item.appointmentCode} description={`${item.patientId} · ${item.doctorId}`} actions={<Button variant="outline" render={<Link href="/appointments">Back to appointments</Link>} />} /><div className="mt-6 grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Appointment details</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-2"><Info label="Patient" value={item.patientId} /><Info label="Doctor" value={item.doctorId} /><Info label="Branch" value={item.branchId} /><Info label="Department" value={item.departmentId ?? "Not specified"} /><Info label="Scheduled time" value={displayTime(item.startAt, item.branchTimezone)} /><Info label="Timezone" value={item.branchTimezone} /><Info label="Booking source" value={item.appointmentSource} /><Info label="Type" value={item.appointmentType} /><Info label="Status" value={<StatusBadge status={item.appointmentStatus === "COMPLETED" ? "success" : item.appointmentStatus === "CANCELLED" ? "error" : "neutral"}>{item.appointmentStatus}</StatusBadge>} /></CardContent></Card><Card><CardHeader><CardTitle>Lifecycle actions</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{canUpdate && actions.length ? actions.map(([action, label]) => <Button key={action} disabled={lifecycle.isPending} onClick={() => lifecycle.mutate(action)}>{label}</Button>) : <p className="text-sm text-muted-foreground">No valid lifecycle actions are available for this appointment.</p>}{permissions.includes("appointment:cancel") && !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(item.appointmentStatus) ? <Button variant="destructive" disabled={cancel.isPending} onClick={() => { const reason = window.prompt("Cancellation reason"); if (reason?.trim()) cancel.mutate(reason); }}>Cancel appointment</Button> : null}</CardContent></Card></div>{permissions.includes("appointment:update") && !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(item.appointmentStatus) ? <Card className="mt-4"><CardHeader><CardTitle>Reschedule</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><div className="grid gap-2"><label className="text-sm font-medium">New date</label><Input type="date" min={new Date().toISOString().slice(0, 10)} value={rescheduleDate} onChange={(event) => { setRescheduleDate(event.target.value); setRescheduleSlot(""); }} /></div><div className="grid gap-2"><label className="text-sm font-medium">Available slot {availability.data ? `(${availability.data.branchTimezone})` : ""}</label><select value={rescheduleSlot} onChange={(event) => setRescheduleSlot(event.target.value)} disabled={!availability.data} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">Select slot</option>{availability.data?.days.flatMap((day) => day.slots).map((slot) => <option value={slot.startAt} key={slot.startAt}>{new Intl.DateTimeFormat(undefined, { timeStyle: "short", timeZone: availability.data?.branchTimezone }).format(new Date(slot.startAt))}</option>)}</select></div><div className="flex items-end"><Button disabled={!rescheduleSlot || reschedule.isPending} onClick={() => reschedule.mutate()}>{reschedule.isPending ? "Rescheduling..." : "Reschedule"}</Button></div></CardContent></Card> : null}</PageContainer>;
}
function Info({ label, value }: { label: string; value: React.ReactNode }) { return <div><div className="text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>; }
function itemOrEmpty<T>(value: T | null | undefined): T | undefined { return value ?? undefined; }
