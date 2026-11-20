"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { Eye, Plus } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { createPatient, listPatients } from "@/lib/api/patient-service";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import type { PatientInput, PatientSummary } from "@/types/patient";
import { DataTable } from "@/components/shared/data-table";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]),
  bloodGroup: z.string().optional(),
  maritalStatus: z.string().optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  addressLine1: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().length(2, "Use a two-letter country code").optional().or(z.literal("")),
  emergencyName: z.string().trim().optional(),
  emergencyRelationship: z.string().trim().optional(),
  emergencyPhone: z.string().trim().optional(),
});
type Values = z.infer<typeof schema>;

export function PatientManagement() {
  const permissions = useAuthStore((state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS);
  const canRead = permissions.includes("patient:read");
  const canCreate = permissions.includes("patient:create");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const patients = useQuery({ queryKey: ["patients", { search, page }], enabled: canRead, queryFn: () => listPatients({ page, limit: 10, search }) });
  const create = useMutation({ mutationFn: createPatient, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["patients"] }); setOpen(false); toast.success("Patient registered."); }, onError: (error) => toast.error(getApiErrorMessage(error)) });
  if (!canRead) return <PageContainer><PageHeader eyebrow="Patient management" title="Patients" description="Patient access is controlled by backend permissions." /><ErrorState title="You are not authorized to view patients." /></PageContainer>;
  const columns: ColumnDef<PatientSummary, unknown>[] = [
    { accessorKey: "fullName", header: "Patient", cell: (info) => <Link className="font-medium hover:text-primary" href={`/patients/${info.row.original.id}`}>{info.row.original.fullName}</Link> },
    { accessorKey: "patientCode", header: "Patient ID" },
    { accessorKey: "dateOfBirth", header: "Date of birth", cell: (info) => info.row.original.dateOfBirth ?? "—" },
    { accessorKey: "gender", header: "Gender" },
    { accessorKey: "status", header: "Status", cell: (info) => <StatusBadge status={info.row.original.status === "ACTIVE" ? "success" : info.row.original.status === "ARCHIVED" ? "error" : "neutral"}>{info.row.original.status}</StatusBadge> },
    { id: "actions", header: "Actions", enableSorting: false, cell: (info) => <Button nativeButton={false} variant="ghost" size="icon-sm" render={<Link href={`/patients/${info.row.original.id}`} aria-label={`View ${info.row.original.fullName}`} />}><Eye className="size-4" /></Button> },
  ];
  return <PageContainer><PageHeader eyebrow="Patient management" title="Patients" description="Search and manage patients within the active hospital tenant." actions={canCreate ? <Button onClick={() => setOpen(true)}><Plus className="size-4" />Register patient</Button> : null} /><div className="mt-6"><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search patient name or patient ID..." className="sm:max-w-sm" /></div><div className="mt-4">{patients.isLoading ? <LoadingState label="Loading patients..." /> : null}{patients.isError ? <ErrorState onRetry={() => void patients.refetch()} /> : null}{patients.data ? <DataTable columns={columns} data={patients.data.patients} emptyMessage="No patients match the current search." /> : null}{patients.data ? <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground"><span>{patients.data.pagination.total} total patients</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="px-2 py-1">Page {page} of {Math.max(patients.data.pagination.totalPages, 1)}</span><Button variant="outline" size="sm" disabled={page >= patients.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div> : null}</div><PatientForm open={open} onOpenChange={setOpen} onSubmit={(input) => create.mutate(input)} isPending={create.isPending} /></PageContainer>;
}

function PatientForm({ open, onOpenChange, onSubmit, isPending }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (input: PatientInput) => void; isPending: boolean }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { fullName: "", dateOfBirth: "", gender: "UNKNOWN", bloodGroup: "", maritalStatus: "", phone: "", email: "", addressLine1: "", city: "", country: "", emergencyName: "", emergencyRelationship: "", emergencyPhone: "" } });
  const submit = form.handleSubmit((values) => {
    const patient: PatientInput = {
      fullName: values.fullName,
      dateOfBirth: values.dateOfBirth || null,
      gender: values.gender,
      bloodGroup: values.bloodGroup ? values.bloodGroup as PatientInput["bloodGroup"] : null,
      maritalStatus: values.maritalStatus ? values.maritalStatus as PatientInput["maritalStatus"] : null,
      contacts: values.phone || values.email ? [{ contactType: "MOBILE", phone: values.phone || null, email: values.email || null, isPrimary: true }] : undefined,
      addresses: values.addressLine1 ? [{ addressType: "HOME", addressLine1: values.addressLine1, city: values.city || null, country: values.country || null, isPrimary: true }] : undefined,
      emergencyContacts: values.emergencyName && values.emergencyRelationship && values.emergencyPhone ? [{ name: values.emergencyName, relationship: values.emergencyRelationship, phone: values.emergencyPhone }] : undefined,
    };
    onSubmit(patient);
  });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Register patient</DialogTitle><DialogDescription>Patient code and tenant scope are allocated by the backend.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4"><Field label="Full name" error={form.formState.errors.fullName?.message}><Input {...form.register("fullName")} /></Field><div className="grid gap-4 sm:grid-cols-3"><Field label="Date of birth" error={form.formState.errors.dateOfBirth?.message}><Input type="date" {...form.register("dateOfBirth")} /></Field><Field label="Gender"><select {...form.register("gender")} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="UNKNOWN">Unknown</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></Field><Field label="Marital status"><select {...form.register("maritalStatus")} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">Not provided</option>{["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "OTHER"].map((item) => <option key={item} value={item}>{item}</option>)}</select></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Blood group"><select {...form.register("bloodGroup")} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">Not provided</option>{["A_POSITIVE", "A_NEGATIVE", "B_POSITIVE", "B_NEGATIVE", "AB_POSITIVE", "AB_NEGATIVE", "O_POSITIVE", "O_NEGATIVE"].map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}</select></Field><Field label="Phone"><Input {...form.register("phone")} /></Field><Field label="Email" error={form.formState.errors.email?.message}><Input type="email" {...form.register("email")} /></Field></div><div className="grid gap-4 sm:grid-cols-3"><Field label="Address"><Input {...form.register("addressLine1")} /></Field><Field label="City"><Input {...form.register("city")} /></Field><Field label="Country"><Input maxLength={2} {...form.register("country")} /></Field></div><div className="grid gap-4 sm:grid-cols-3"><Field label="Emergency contact"><Input {...form.register("emergencyName")} /></Field><Field label="Relationship"><Input {...form.register("emergencyRelationship")} /></Field><Field label="Phone"><Input {...form.register("emergencyPhone")} /></Field></div><DialogFooter><Button type="submit" disabled={isPending}>{isPending ? "Registering..." : "Register patient"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) { return <div className="grid gap-2"><Label>{label}</Label>{children}{error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}</div>; }
