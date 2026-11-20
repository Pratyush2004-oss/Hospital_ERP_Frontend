"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { Eye, Pencil, Plus, Power, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { listBranches } from "@/lib/api/management-service";
import { createDoctor, deleteDoctor, listDoctors, listTenantStaff, updateDoctor, updateDoctorBranches, updateDoctorDepartments, updateDoctorStatus } from "@/lib/api/department-doctor-service";
import { listDepartments } from "@/lib/api/department-doctor-service";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import type { Doctor, DoctorBranchAssignment, DoctorInput, DoctorUpdateInput } from "@/types/management";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  userId: z.string().min(1, "Select an existing tenant member"),
  doctorCode: z.string().trim().min(1, "Doctor code is required").max(50),
  registrationNumber: z.string().trim().min(3, "Registration number is required").max(80),
  registrationCouncil: z.string().trim().max(150).optional(),
  qualification: z.string().trim().max(200).optional(),
  specialization: z.string().trim().max(150).optional(),
  experienceYears: z.string().refine((value) => value === "" || (/^\d+$/.test(value) && Number(value) <= 70), "Experience must be a whole number from 0 to 70"),
  biography: z.string().trim().max(5000).optional(),
  profileImageUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
  consultationLanguage: z.string().trim().optional(),
});
type Values = z.infer<typeof schema>;
type Assignment = DoctorBranchAssignment & { branchId: string; consultationFee: string; currency: string };

export function DoctorManagement() {
  const permissions = useAuthStore((state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS);
  const canRead = permissions.includes("doctor:read");
  const canCreate = permissions.includes("doctor:create");
  const canUpdate = permissions.includes("doctor:update");
  const canDelete = permissions.includes("doctor:delete");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Doctor | null>(null);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const doctors = useQuery({ queryKey: ["doctors", { search, page }], enabled: canRead, queryFn: () => listDoctors({ page, limit: 10, search }) });
  const branches = useQuery({ queryKey: ["branches", "assignment-options"], enabled: canRead, queryFn: () => listBranches({ page: 1, pageSize: 100 }) });
  const departments = useQuery({ queryKey: ["departments", "assignment-options"], enabled: canRead, queryFn: () => listDepartments({ page: 1, limit: 100 }) });
  const staff = useQuery({ queryKey: ["tenant-staff"], enabled: canCreate, queryFn: listTenantStaff });
  const save = useMutation({
    mutationFn: async (value: { profile: DoctorInput | DoctorUpdateInput; departmentIds: string[]; branchAssignments: Assignment[] }) => {
      const doctor = editing ? await updateDoctor(editing.id, value.profile as DoctorUpdateInput) : await createDoctor(value.profile as DoctorInput);
      if (editing) {
        await updateDoctorDepartments(editing.id, value.departmentIds);
        await updateDoctorBranches(editing.id, value.branchAssignments);
      }
      return doctor;
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["doctors"] }); await queryClient.invalidateQueries({ queryKey: ["doctor"] }); setOpen(false); setEditing(null); toast.success(editing ? "Doctor updated." : "Doctor created."); },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const statusMutation = useMutation({ mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateDoctorStatus(id, isActive), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["doctors"] }); toast.success("Doctor status updated."); }, onError: (error) => toast.error(getApiErrorMessage(error)) });
  const deleteMutation = useMutation({ mutationFn: deleteDoctor, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["doctors"] }); toast.success("Doctor deleted."); }, onError: (error) => toast.error(getApiErrorMessage(error)) });

  if (!canRead) return <PageContainer><PageHeader eyebrow="Hospital operations" title="Doctors" description="Doctor access is controlled by backend permissions." /><ErrorState title="You are not authorized to view doctors." /></PageContainer>;
  const columns: ColumnDef<Doctor, unknown>[] = [
    { accessorKey: "user", header: "Doctor", cell: (info) => <Link className="font-medium hover:text-primary" href={`/doctors/${info.row.original.id}`}>{info.row.original.user.fullName}</Link> },
    { accessorKey: "doctorCode", header: "Code" },
    { accessorKey: "specialization", header: "Specialization", cell: (info) => info.row.original.specialization || "—" },
    { id: "departments", header: "Departments", cell: (info) => info.row.original.departments.map((department) => department.name).join(", ") || "—" },
    { accessorKey: "isActive", header: "Status", cell: (info) => <StatusBadge status={info.row.original.isActive ? "success" : "neutral"}>{info.row.original.isActive ? "Active" : "Inactive"}</StatusBadge> },
    { id: "actions", header: "Actions", enableSorting: false, cell: (info) => {
      const doctor = info.row.original;
      return <div className="flex items-center gap-1"><Button nativeButton={false} variant="ghost" size="icon-sm" render={<Link href={`/doctors/${doctor.id}`} aria-label={`View ${doctor.user.fullName}`} />}><Eye className="size-4" /></Button>{canUpdate ? <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(doctor); setOpen(true); }} aria-label={`Edit ${doctor.user.fullName}`}><Pencil className="size-4" /></Button> : null}{canUpdate ? <ConfirmDialog trigger={<Button variant="ghost" size="icon-sm" aria-label="Toggle doctor status"><Power className="size-4" /></Button>} title={`${doctor.isActive ? "Deactivate" : "Activate"} doctor?`} description="The backend will enforce this status for future operations." onConfirm={() => statusMutation.mutate({ id: doctor.id, isActive: !doctor.isActive })} /> : null}{canDelete ? <ConfirmDialog trigger={<Button variant="ghost" size="icon-sm" aria-label="Delete doctor"><Trash2 className="size-4" /></Button>} title="Delete doctor?" description="This removes the doctor profile but does not delete the global user account." onConfirm={() => deleteMutation.mutate(doctor.id)} /> : null}</div>;
    }},
  ];
  return <PageContainer><PageHeader eyebrow="Hospital operations" title="Doctors" description="Manage doctor profiles, department coverage and branch fees." actions={canCreate ? <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" />Add doctor</Button> : null} /><div className="mt-6"><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, code or registration number..." className="sm:max-w-sm" /></div><div className="mt-4">{doctors.isLoading ? <LoadingState label="Loading doctors..." /> : null}{doctors.isError ? <ErrorState onRetry={() => void doctors.refetch()} /> : null}{doctors.data ? <DataTable columns={columns} data={doctors.data.doctors} emptyMessage="No doctors match the current search." /> : null}{doctors.data ? <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground"><span>{doctors.data.pagination.total} total doctors</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="px-2 py-1">Page {page} of {Math.max(doctors.data.pagination.totalPages, 1)}</span><Button variant="outline" size="sm" disabled={page >= doctors.data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div> : null}</div><DoctorForm key={editing?.id ?? "new"} doctor={editing} staff={staff.data?.filter((member) => member.status === "ACTIVE") ?? []} departments={departments.data?.departments ?? []} branches={branches.data?.branches ?? []} open={open} onOpenChange={setOpen} onSubmit={(value) => save.mutate(value)} isPending={save.isPending} /></PageContainer>;
}

function DoctorForm({ doctor, staff, departments, branches, open, onOpenChange, onSubmit, isPending }: { doctor: Doctor | null; staff: { userId: string; fullName: string; email: string }[]; departments: { id: string; name: string }[]; branches: { id: string; name: string; branchCode: string }[]; open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (value: { profile: DoctorInput | DoctorUpdateInput; departmentIds: string[]; branchAssignments: Assignment[] }) => void; isPending: boolean }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), values: { userId: doctor?.userId ?? "", doctorCode: doctor?.doctorCode ?? "", registrationNumber: doctor?.registrationNumber ?? "", registrationCouncil: doctor?.registrationCouncil ?? "", qualification: doctor?.qualification ?? "", specialization: doctor?.specialization ?? "", experienceYears: doctor?.experienceYears === null || doctor?.experienceYears === undefined ? "" : String(doctor.experienceYears), biography: doctor?.biography ?? "", profileImageUrl: doctor?.profileImageUrl ?? "", consultationLanguage: doctor?.consultationLanguage?.join(", ") ?? "" } });
  const [departmentIds, setDepartmentIds] = useState<string[]>(doctor?.departments.map((item) => item.id) ?? []);
  const [assignments, setAssignments] = useState<Assignment[]>(doctor?.branches.map((item) => ({ branchId: item.branchId, consultationFee: item.consultationFee, currency: item.currency, isActive: item.isActive })) ?? []);
  const submit = form.handleSubmit((values) => {
    const common = { doctorCode: values.doctorCode, registrationNumber: values.registrationNumber, experienceYears: values.experienceYears === "" ? null : Number(values.experienceYears), consultationLanguage: values.consultationLanguage ? values.consultationLanguage.split(",").map((item: string) => item.trim()).filter(Boolean) : null, registrationCouncil: values.registrationCouncil || null, qualification: values.qualification || null, specialization: values.specialization || null, biography: values.biography || null, profileImageUrl: values.profileImageUrl || null };
    if (doctor) {
      const update: DoctorUpdateInput = common;
      onSubmit({ profile: update, departmentIds, branchAssignments: assignments });
    } else {
      const profile: DoctorInput = { ...common, userId: values.userId, departmentIds, branches: assignments };
      onSubmit({ profile, departmentIds, branchAssignments: assignments });
    }
  });
  const toggleBranch = (branchId: string, checked: boolean) => setAssignments((current) => checked ? [...current, { branchId, consultationFee: "0.00", currency: "USD", isActive: true }] : current.filter((item) => item.branchId !== branchId));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{doctor ? "Edit doctor" : "Add doctor"}</DialogTitle><DialogDescription>Doctor profiles link to existing active hospital members. Branch fees are stored as decimal values by the backend.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4">
    <Field label="Existing tenant member" error={form.formState.errors.userId?.message}><select disabled={Boolean(doctor)} {...form.register("userId")} className="h-9 rounded-lg border bg-background px-3 text-sm"><option value="">Select a member</option>{staff.map((member) => <option key={member.userId} value={member.userId}>{member.fullName} — {member.email}</option>)}</select></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Doctor code" error={form.formState.errors.doctorCode?.message}><Input {...form.register("doctorCode")} /></Field><Field label="Registration number" error={form.formState.errors.registrationNumber?.message}><Input {...form.register("registrationNumber")} /></Field><Field label="Registration council" error={form.formState.errors.registrationCouncil?.message}><Input {...form.register("registrationCouncil")} /></Field><Field label="Qualification" error={form.formState.errors.qualification?.message}><Input {...form.register("qualification")} /></Field><Field label="Specialization" error={form.formState.errors.specialization?.message}><Input {...form.register("specialization")} /></Field><Field label="Experience years" error={form.formState.errors.experienceYears?.message}><Input type="number" {...form.register("experienceYears")} /></Field></div>
    <Field label="Biography" error={form.formState.errors.biography?.message}><Textarea {...form.register("biography")} /></Field><Field label="Profile image URL" error={form.formState.errors.profileImageUrl?.message}><Input {...form.register("profileImageUrl")} /></Field><Field label="Consultation languages" error={form.formState.errors.consultationLanguage?.message}><Input {...form.register("consultationLanguage")} placeholder="en, hi" /></Field>
    <MultiSelect label="Departments" values={departmentIds} options={departments} onChange={setDepartmentIds} /><div className="grid gap-2"><Label>Branches and consultation fees</Label>{branches.map((branch) => { const assignment = assignments.find((item) => item.branchId === branch.id); return <div key={branch.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_120px_90px] sm:items-center"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(assignment)} onChange={(event) => toggleBranch(branch.id, event.target.checked)} />{branch.name} ({branch.branchCode})</label>{assignment ? <Input aria-label={`${branch.name} consultation fee`} value={assignment.consultationFee} onChange={(event) => setAssignments((current) => current.map((item) => item.branchId === branch.id ? { ...item, consultationFee: event.target.value } : item))} placeholder="0.00" /> : <span className="text-xs text-muted-foreground">Not assigned</span>}{assignment ? <Input aria-label={`${branch.name} currency`} value={assignment.currency} maxLength={3} onChange={(event) => setAssignments((current) => current.map((item) => item.branchId === branch.id ? { ...item, currency: event.target.value.toUpperCase() } : item))} /> : null}</div>; })}</div>
    <DialogFooter><Button type="submit" disabled={isPending}>{isPending ? "Saving..." : doctor ? "Save doctor" : "Create doctor"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function MultiSelect<T extends { id: string; name: string }>({ label, values, options, onChange }: { label: string; values: string[]; options: T[]; onChange: (values: string[]) => void }) { return <div className="grid gap-2"><Label>{label}</Label><select multiple value={values} onChange={(event) => onChange(Array.from(event.target.selectedOptions, (option) => option.value))} className="min-h-28 rounded-lg border bg-background p-2 text-sm">{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>; }
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) { return <div className="grid gap-2"><Label>{label}</Label>{children}{error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}</div>; }
