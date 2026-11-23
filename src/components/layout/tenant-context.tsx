"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, GitBranch } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { listBranches, listTenantMemberships, selectTenant } from "@/lib/api/management-service";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { isActiveMembership } from "@/lib/tenants/hospital-selection";
import { useAuthStore } from "@/stores/auth-store";
import {
  ALL_BRANCHES,
  useBranchContextStore,
} from "@/stores/branch-context-store";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TenantContext() {
  const session = useAuthStore((state) => state.session);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const selectedBranchId = useBranchContextStore((state) => state.selectedBranchId);
  const setSelectedBranch = useBranchContextStore((state) => state.setSelectedBranch);
  const clearBranch = useBranchContextStore((state) => state.clear);

  const memberships = useQuery({ queryKey: ["tenant-memberships"], queryFn: listTenantMemberships });
  const activeTenantSlug = memberships.data?.find((item) => item.tenantId === session?.activeTenant?.id)?.tenantSlug;
  const branches = useQuery({
    queryKey: ["context-branches", activeTenantSlug],
    queryFn: () => listBranches({ page: 1, pageSize: 100, isActive: true }),
    enabled: Boolean(activeTenantSlug && session?.activeTenant?.permissions.includes("branch:read")),
  });
  const tenantMutation = useMutation({
    mutationFn: selectTenant,
    onSuccess: async () => {
      clearBranch();
      await refreshSession();
      toast.success("Hospital context updated.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  useEffect(() => {
    if (!branches.data) return;
    const stillExists = branches.data.branches.some((item) => item.id === selectedBranchId);
    if (!stillExists && selectedBranchId !== ALL_BRANCHES) clearBranch();
  }, [branches.data, clearBranch, selectedBranchId]);

  const currentTenant = memberships.data?.find((item) => item.tenantId === session?.activeTenant?.id);
  const selectedBranch = branches.data?.branches.find((item) => item.id === selectedBranchId);
  const scopeLabel = selectedBranch
    ? `${selectedBranch.name} (${selectedBranch.branchCode})`
    : "All branches";

  return (
    <div className="grid gap-3 border-b p-3">
      <ContextSelect
        id="tenant-context"
        label="Hospital / tenant"
        icon={<Building2 />}
        value={currentTenant?.tenantSlug ?? ""}
        options={memberships.data?.filter(isActiveMembership) ?? []}
        getLabel={(item) => item.tenantName}
        getValue={(item) => item.tenantSlug}
        onChange={(value) => tenantMutation.mutate(value)}
        disabled={tenantMutation.isPending || memberships.isLoading}
      />
      <div className="min-w-0 space-y-1">
        <Label htmlFor="branch-context" className="text-[11px] text-muted-foreground">
          Branch filter
        </Label>
        <Select
          value={selectedBranchId}
          onValueChange={(next) => {
            if (!next) return;
            const branch = branches.data?.branches.find((item) => item.id === next);
            setSelectedBranch(next, branch?.name ?? null);
          }}
          disabled={branches.isLoading || !activeTenantSlug}
        >
          <SelectTrigger id="branch-context" className="h-8 w-full min-w-0 text-xs">
            <span className="flex min-w-0 items-center gap-2 overflow-hidden">
              <span className="shrink-0 text-primary"><GitBranch /></span>
              <SelectValue className="min-w-0 truncate" placeholder={branches.isLoading ? "Loading branches..." : "All branches"} />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_BRANCHES}>All branches</SelectItem>
            {branches.data?.branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name} ({branch.branchCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="col-span-full text-[11px] leading-relaxed text-muted-foreground">
        Showing <span className="font-medium text-foreground">{scopeLabel}</span>. This
        selection filters supported screens; it is not a security boundary. Tenant,
        permission and backend scope checks still apply.
      </p>
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
