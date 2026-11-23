"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { listTenantMemberships } from "@/lib/api/management-service";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

const statusMap = {
  ACTIVE: "success",
  PENDING: "warning",
  SUSPENDED: "error",
  INACTIVE: "neutral",
} as const;

export function HospitalManagement() {
  const memberships = useQuery({ queryKey: ["tenant-memberships"], queryFn: listTenantMemberships });

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Hospital administration"
        title="Hospitals"
        description="Hospitals available to your authenticated account."
        actions={
          <Button nativeButton={false} render={<Link href="/onboarding/hospital" />}>
            <Plus className="size-4" />
            Register hospital
          </Button>
        }
      />
      <div className="mt-6">
        {memberships.isLoading ? <LoadingState label="Loading hospitals..." /> : null}
        {memberships.isError ? <ErrorState onRetry={() => void memberships.refetch()} /> : null}
        {memberships.data?.length === 0 ? (
          <div className="space-y-4">
            <EmptyState
              title="No hospitals available"
              description="Your account is not associated with a hospital yet. Register one to start the approval process."
            />
            <div className="flex justify-center">
              <Button nativeButton={false} render={<Link href="/onboarding/hospital" />}>
                Register a hospital
              </Button>
            </div>
          </div>
        ) : null}
        {memberships.data && memberships.data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {memberships.data.map((membership) => (
              <a
                key={membership.id}
                href={`/hospitals/${membership.tenantSlug}`}
                className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <Building2 className="size-5 text-primary" />
                  <StatusBadge status={statusMap[membership.tenantStatus]}>
                    {membership.tenantStatus}
                  </StatusBadge>
                </div>
                <h2 className="mt-4 font-semibold">{membership.tenantName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{membership.tenantSlug}</p>
                <p className="mt-4 text-xs text-muted-foreground">
                  Membership: {membership.status}
                </p>
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}
