"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, GitBranch } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { listBranches, listTenantMemberships, selectTenant } from "@/lib/api/management-service";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/stores/auth-store";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TenantContext() {
  const session = useAuthStore((state) => state.session);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const memberships = useQuery({ queryKey: ["tenant-memberships"], queryFn: listTenantMemberships });
  const activeTenantSlug = memberships.data?.find((item) => item.tenantId === session?.activeTenant?.id)?.tenantSlug;
  const [selectedBranch, setSelectedBranch] = useState("");
  const branches = useQuery({
    queryKey: ["context-branches", activeTenantSlug],
    queryFn: () => listBranches({ page: 1, pageSize: 100 }),
    enabled: Boolean(activeTenantSlug && session?.activeTenant?.permissions.includes("branch:read")),
  });
  const tenantMutation = useMutation({
    mutationFn: selectTenant,
    onSuccess: async () => {
      await refreshSession();
      toast.success("Hospital context updated.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const currentTenant = memberships.data?.find((item) => item.tenantId === session?.activeTenant?.id);
  const selectedBranchId = branches.data?.branches.some((item) => item.id === selectedBranch)
    ? selectedBranch
    : branches.data?.branches[0]?.id ?? "";
  const branch = branches.data?.branches.find((item) => item.id === selectedBranchId);

  return (
    <div className="grid gap-3 border-b p-3">
      <ContextSelect id="tenant-context" label="Hospital / tenant" icon={<Building2 />} value={currentTenant?.tenantSlug ?? ""} options={memberships.data?.filter((item) => item.tenantStatus === "ACTIVE") ?? []} getLabel={(item) => item.tenantName} getValue={(item) => item.tenantSlug} onChange={(value) => tenantMutation.mutate(value)} disabled={tenantMutation.isPending || memberships.isLoading} />
      <ContextSelect id="branch-context" label="Branch" icon={<GitBranch />} value={branch?.id ?? ""} options={branches.data?.branches ?? []} getLabel={(item) => `${item.name} (${item.branchCode})`} getValue={(item) => item.id} onChange={setSelectedBranch} disabled={branches.isLoading || !activeTenantSlug} />
      <p className="col-span-full text-[11px] leading-relaxed text-muted-foreground">Hospital choices come from your memberships. Branch choices come from the backend branch list; selection is contextual only and never replaces backend authorization.</p>
    </div>
  );
}

function ContextSelect<T extends { id: string }>({ id, label, icon, value, options, getLabel, getValue, onChange, disabled }: { id: string; label: string; icon: ReactNode; value: string; options: T[]; getLabel: (value: T) => string; getValue: (value: T) => string; onChange: (value: string) => void; disabled?: boolean }) {
  const items = options.map((option) => ({
    value: getValue(option),
    label: getLabel(option),
  }));

  return <div className="min-w-0 space-y-1">
    <Label htmlFor={id} className="text-[11px] text-muted-foreground">{label}</Label>
    <Select
      value={value}
      items={items}
      onValueChange={(next) => next && onChange(next)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="h-8 w-full min-w-0 text-xs"><span className="flex min-w-0 items-center gap-2 overflow-hidden"><span className="shrink-0 text-primary">{icon}</span><SelectValue className="min-w-0 truncate" placeholder={disabled ? "Unavailable" : "Select"} /></span></SelectTrigger>
      <SelectContent>{options.map((option) => <SelectItem key={getValue(option)} value={getValue(option)}>{getLabel(option)}</SelectItem>)}</SelectContent>
    </Select>
  </div>;
}
