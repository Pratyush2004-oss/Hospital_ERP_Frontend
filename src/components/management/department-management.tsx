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
import { createDepartment, deleteDepartment, listDepartments, updateDepartment, updateDepartmentBranches, updateDepartmentStatus } from "@/lib/api/department-doctor-service";
import { listBranches } from "@/lib/api/management-service";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import type { Department, DepartmentInput } from "@/types/management";
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
  name: z.string().trim().min(2, "Department name is required").max(150),
  slug: z.string().trim().max(150).optional(),
  description: z.string().trim().max(2000).optional(),
});
type Values = z.infer<typeof schema>;

export function DepartmentManagement() {
  const permissions = useAuthStore((state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS);
  const canRead = permissions.includes("department:read");
  const canCreate = permissions.includes("department:create");
  const canUpdate = permissions.includes("department:update");
  const canDelete = permissions.includes("department:delete");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Department | null>(null);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const departments = useQuery({ queryKey: ["departments", { search, page }], enabled: canRead, queryFn: () => listDepartments({ page, limit: 10, search }) });
  const branches = useQuery({ queryKey: ["branches", "assignment-options"], enabled: canRead, queryFn: () => listBranches({ page: 1, pageSize: 100 }) });
  const save = useMutation({
    mutationFn: async (input: DepartmentInput) => {
      if (!editing) return createDepartment(input);
      const { branchIds, ...profile } = input;
      const department = await updateDepartment(editing.id, profile);
      return updateDepartmentBranches(editing.id, branchIds ?? department.branches.map((branch) => branch.id));
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["departments"] }); setOpen(false); setEditing(null); toast.success(editing ? "Department updated." : "Department created."); },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const statusMutation = useMutation({ mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateDepartmentStatus(id, isActive), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["departments"] }); toast.success("Department status updated."); }, onError: (error) => toast.error(getApiErrorMessage(error)) });
  const deleteMutation = useMutation({ mutationFn: deleteDepartment, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["departments"] }); toast.success("Department deleted."); }, onError: (error) => toast.error(getApiErrorMessage(error)) });

  if (!canRead) return <PageContainer><PageHeader eyebrow="Hospital operations" title="Departments" description="Department access is controlled by backend permissions." /><ErrorState title="You are not authorized to view departments." /></PageContainer>;
  const columns: ColumnDef<Department, unknown>[] = [
    { accessorKey: "name", header: "Department", cell: (info) => <Link className="font-medium hover:text-primary" href={`/departments/${info.row.original.id}`}>{info.row.original.name}</Link> },
    { accessorKey: "slug", header: "Slug" },
    { id: "branches", header: "Branches", cell: (info) => info.row.original.branches.map((branch) => branch.name).join(", ") || "—" },
    { accessorKey: "isActive", header: "Status", cell: (info) => <StatusBadge status={info.row.original.isActive ? "success" : "neutral"}>{info.row.original.isActive ? "Active" : "Inactive"}</StatusBadge> },
    { id: "actions", header: "Actions", enableSorting: false, cell: (info) => {
      const department = info.row.original;
      return <div className="flex items-center gap-1">
        <Button nativeButton={false} variant="ghost" size="icon-sm" render={<Link href={`/departments/${department.id}`} aria-label={`View ${department.name}`} />}><Eye className="size-4" /></Button>
        {canUpdate ? <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(department); setOpen(true); }} aria-label={`Edit ${department.name}`}><Pencil className="size-4" /></Button> : null}
        {canUpdate ? <ConfirmDialog trigger={<Button variant="ghost" size="icon-sm" aria-label="Toggle department status"><Power className="size-4" /></Button>} title={`${department.isActive ? "Deactivate" : "Activate"} department?`} description="The backend will enforce the resulting status for future operations." onConfirm={() => statusMutation.mutate({ id: department.id, isActive: !department.isActive })} /> : null}
        {canDelete ? <ConfirmDialog trigger={<Button variant="ghost" size="icon-sm" aria-label="Delete department"><Trash2 className="size-4" /></Button>} title="Delete department?" description="Deletion is rejected by the backend while doctors are assigned." onConfirm={() => deleteMutation.mutate(department.id)} /> : null}
      </div>;
    }},
  ];
  return <PageContainer>
    <PageHeader eyebrow="Hospital operations" title="Departments" description="Manage departments and their branch coverage." actions={canCreate ? <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="size-4" />Create department</Button> : null} />
    <div className="mt-6"><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search department name or slug..." className="sm:max-w-sm" /></div>
    <div className="mt-4">{departments.isLoading ? <LoadingState label="Loading departments..." /> : null}{departments.isError ? <ErrorState onRetry={() => void departments.refetch()} /> : null}{departments.data ? <DataTable columns={columns} data={departments.data.departments} emptyMessage="No departments match the current filters." /> : null}{departments.data ? <Pager page={page} totalPages={departments.data.pagination.totalPages} total={departments.data.pagination.total} setPage={setPage} /> : null}</div>
    <DepartmentForm key={editing?.id ?? "new"} department={editing} branches={branches.data?.branches ?? []} open={open} onOpenChange={setOpen} onSubmit={(input) => save.mutate(input)} isPending={save.isPending} />
  </PageContainer>;
}

function DepartmentForm({ department, branches, open, onOpenChange, onSubmit, isPending }: { department: Department | null; branches: { id: string; name: string; branchCode: string }[]; open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (input: DepartmentInput) => void; isPending: boolean }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), values: { name: department?.name ?? "", slug: department?.slug ?? "", description: department?.description ?? "" } });
  const [branchIds, setBranchIds] = useState<string[]>(department?.branches.map((branch) => branch.id) ?? []);
  const submit = form.handleSubmit((values) => onSubmit({ ...values, description: values.description || null, branchIds }));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{department ? "Edit department" : "Create department"}</DialogTitle><DialogDescription>Branch assignments replace the complete current association set.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4"><Field label="Name" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></Field><Field label="Slug" error={form.formState.errors.slug?.message}><Input {...form.register("slug")} placeholder="outpatient-care" /></Field><Field label="Description" error={form.formState.errors.description?.message}><Textarea {...form.register("description")} /></Field><div className="grid gap-2"><Label>Branches</Label><select multiple value={branchIds} onChange={(event) => setBranchIds(Array.from(event.target.selectedOptions, (option) => option.value))} className="min-h-28 rounded-lg border bg-background p-2 text-sm">{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} ({branch.branchCode})</option>)}</select></div><DialogFooter><Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save department"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) { return <div className="grid gap-2"><Label>{label}</Label>{children}{error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}</div>; }
function Pager({ page, totalPages, total, setPage }: { page: number; totalPages: number; total: number; setPage: (page: number) => void }) { return <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground"><span>{total} total departments</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="px-2 py-1">Page {page} of {Math.max(totalPages, 1)}</span><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button></div></div>; }
