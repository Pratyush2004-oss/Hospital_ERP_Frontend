"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getBranch, updateBranch } from "@/lib/api/management-service";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import { BranchForm } from "@/components/management/branch-form";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export default function BranchDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const permissions = useAuthStore((state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS);
  const [formOpen, setFormOpen] = useState(false);
  const queryClient = useQueryClient();
  const branch = useQuery({ queryKey: ["branch", id], queryFn: () => getBranch(id), enabled: permissions.includes("branch:read") });
  const updateMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateBranch>[1]) => updateBranch(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["branch", id] });
      await queryClient.invalidateQueries({ queryKey: ["branches"] });
      setFormOpen(false);
      toast.success("Branch updated.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (!permissions.includes("branch:read")) return <PageContainer><ErrorState title="You are not authorized to view this branch." /></PageContainer>;
  if (branch.isLoading) return <PageContainer><LoadingState label="Loading branch..." /></PageContainer>;
  if (branch.isError || !branch.data) return <PageContainer><ErrorState title="Unable to load branch." onRetry={() => void branch.refetch()} /></PageContainer>;
  const value = branch.data;

  return <PageContainer>
    <Button nativeButton={false} variant="ghost" render={<Link href="/branches" />} className="mb-4 -ml-3"><ArrowLeft className="size-4" />Back to branches</Button>
    <PageHeader eyebrow="Branch details" title={value.name} description={`Branch code: ${value.branchCode}`} actions={permissions.includes("branch:update") ? <Button onClick={() => setFormOpen(true)}><Pencil className="size-4" />Edit branch</Button> : null} />
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-5"><div className="flex items-center justify-between"><MapPin className="size-5 text-primary" /><StatusBadge status={value.isActive ? "success" : "neutral"}>{value.isActive ? "Active" : "Inactive"}</StatusBadge></div><p className="mt-4 text-sm text-muted-foreground">Address</p><p className="mt-1">{[value.addressLine1, value.addressLine2, value.city, value.state, value.postalCode, value.country].filter(Boolean).join(", ") || "Not provided"}</p></div>
      <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Contact</p><p className="mt-2">{value.contactEmail || "No email provided"}</p><p className="mt-1">{value.contactPhone || "No phone provided"}</p><p className="mt-4 text-sm text-muted-foreground">Timezone</p><p className="mt-1">{value.timezone}</p></div>
    </div>
    <BranchForm branch={value} open={formOpen} onOpenChange={setFormOpen} onSubmit={(input) => updateMutation.mutate(input)} isPending={updateMutation.isPending} />
  </PageContainer>;
}
