"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { listTenantMemberships } from "@/lib/api/management-service";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

export default function HospitalDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const memberships = useQuery({ queryKey: ["tenant-memberships"], queryFn: listTenantMemberships });
  const hospital = memberships.data?.find((item) => item.tenantSlug === slug);

  if (memberships.isLoading) return <PageContainer><LoadingState label="Loading hospital..." /></PageContainer>;
  if (memberships.isError) return <PageContainer><ErrorState onRetry={() => void memberships.refetch()} /></PageContainer>;
  if (!hospital) return <PageContainer><EmptyState title="Hospital not found" description="This hospital is not available to your account." /></PageContainer>;

  return (
    <PageContainer>
      <Button nativeButton={false} variant="ghost" render={<Link href="/hospitals" />} className="mb-4 -ml-3"><ArrowLeft className="size-4" />Back to hospitals</Button>
      <PageHeader eyebrow="Hospital details" title={hospital.tenantName} description={`Tenant slug: ${hospital.tenantSlug}`} />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5"><Building2 className="size-5 text-primary" /><p className="mt-4 text-sm text-muted-foreground">Status</p><StatusBadge status={hospital.tenantStatus === "ACTIVE" ? "success" : hospital.tenantStatus === "PENDING" ? "warning" : "neutral"}>{hospital.tenantStatus}</StatusBadge></div>
        <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Membership</p><p className="mt-2 font-medium">{hospital.status}</p><p className="mt-3 text-xs text-muted-foreground">Joined {hospital.joinedAt ? new Date(hospital.joinedAt).toLocaleDateString() : "not yet recorded"}</p></div>
      </div>
      <p className="mt-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">The backend currently exposes membership summaries only. Hospital contact details and profile editing require a tenant profile endpoint, so no unsupported fields or edit controls are shown.</p>
    </PageContainer>
  );
}
