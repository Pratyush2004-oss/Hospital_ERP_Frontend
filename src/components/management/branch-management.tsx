"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { Eye, Pencil, Plus, Power, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { createBranch, deleteBranch, listBranches, updateBranch, updateBranchStatus } from "@/lib/api/management-service";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import type { Branch, BranchInput, UpdateBranchInput } from "@/types/management";
import { BranchForm } from "./branch-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function BranchManagement() {
  const permissions = useAuthStore((state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS);
  const canRead = permissions.includes("branch:read");
  const canCreate = permissions.includes("branch:create");
  const canUpdate = permissions.includes("branch:update");
  const canDelete = permissions.includes("branch:delete");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = ["branches", { search, activeFilter, page }];
  const branches = useQuery({
    queryKey,
    enabled: canRead,
    queryFn: () => listBranches({ page, pageSize: 10, search, isActive: activeFilter === "all" ? undefined : activeFilter === "active" }),
  });
  const saveMutation = useMutation({
    mutationFn: (input: BranchInput | UpdateBranchInput) => editing ? updateBranch(editing.id, input) : createBranch(input as BranchInput),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
      setFormOpen(false);
      setEditing(null);
      toast.success(editing ? "Branch updated." : "Branch created.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateBranchStatus(id, isActive),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch status updated.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteBranch,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast.success("Branch deleted.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (!canRead) {
    return <PageContainer><PageHeader eyebrow="Hospital operations" title="Branches" description="Branch access is controlled by backend permissions." /><ErrorState title="You are not authorized to view branches." /></PageContainer>;
  }

  const columns: ColumnDef<Branch, unknown>[] = [
    { accessorKey: "name", header: "Branch", cell: (info) => <Link className="font-medium hover:text-primary" href={`/branches/${info.row.original.id}`}>{info.row.original.name}</Link> },
    { accessorKey: "branchCode", header: "Code" },
    { accessorKey: "city", header: "City", cell: (info) => info.row.original.city || "—" },
    { accessorKey: "timezone", header: "Timezone" },
    { accessorKey: "isActive", header: "Status", cell: (info) => <StatusBadge status={info.row.original.isActive ? "success" : "neutral"}>{info.row.original.isActive ? "Active" : "Inactive"}</StatusBadge> },
    { id: "actions", header: "Actions", enableSorting: false, cell: (info) => {
      const branch = info.row.original;
      return <div className="flex items-center gap-1">
        <Button nativeButton={false} variant="ghost" size="icon-sm" render={<Link href={`/branches/${branch.id}`} aria-label={`View ${branch.name}`} />}><Eye className="size-4" /></Button>
        {canUpdate ? <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(branch); setFormOpen(true); }} aria-label={`Edit ${branch.name}`}><Pencil className="size-4" /></Button> : null}
        {canUpdate ? <ConfirmDialog trigger={<Button variant="ghost" size="icon-sm" aria-label={`${branch.isActive ? "Deactivate" : "Activate"} ${branch.name}`}><Power className="size-4" /></Button>} title={`${branch.isActive ? "Deactivate" : "Activate"} branch?`} description={`This will ${branch.isActive ? "prevent" : "allow"} the branch from being used by active workflows.`} onConfirm={() => statusMutation.mutate({ id: branch.id, isActive: !branch.isActive })} /> : null}
        {canDelete ? <ConfirmDialog trigger={<Button variant="ghost" size="icon-sm" aria-label={`Delete ${branch.name}`}><Trash2 className="size-4" /></Button>} title="Delete branch?" description="The backend will reject deletion while departments or doctor assignments reference this branch." onConfirm={() => deleteMutation.mutate(branch.id)} /> : null}
      </div>;
    }},
  ];

  return (
    <PageContainer>
      <PageHeader eyebrow="Hospital operations" title="Branches" description="Manage branches within the currently selected hospital." actions={canCreate ? <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="size-4" />Create branch</Button> : null} />
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or branch code..." className="sm:max-w-sm" />
        <Select value={activeFilter} onValueChange={(value) => { setActiveFilter(value ?? "all"); setPage(1); }}><SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
      </div>
      <div className="mt-4">
        {branches.isLoading ? <LoadingState label="Loading branches..." /> : null}
        {branches.isError ? <ErrorState onRetry={() => void branches.refetch()} /> : null}
        {branches.data ? <DataTable columns={columns} data={branches.data.branches} emptyMessage="No branches match the current filters." /> : null}
        {branches.data ? <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground"><span>{branches.data.pagination.total} total branches</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="px-2 py-1">Page {page} of {Math.max(branches.data.pagination.totalPages, 1)}</span><Button variant="outline" size="sm" disabled={page >= branches.data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div> : null}
      </div>
      <BranchForm branch={editing} open={formOpen} onOpenChange={setFormOpen} onSubmit={(input) => saveMutation.mutate(input)} isPending={saveMutation.isPending} />
    </PageContainer>
  );
}
