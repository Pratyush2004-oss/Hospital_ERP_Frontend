"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Mail, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { listStaffInvitations, listTenantStaff } from "@/lib/api/staff-service";
import { listTenantMemberships } from "@/lib/api/management-service";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";

const invitationStatusMap = {
  ACCEPTED: "success",
  INVITED: "warning",
  EXPIRED: "neutral",
  REVOKED: "neutral",
} as const;

export default function HospitalDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const activeTenant = useAuthStore((state) => state.session?.activeTenant ?? null);
  const permissions = useAuthStore(
    (state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS,
  );
  const canReadStaff = permissions.includes("staff:read");

  const memberships = useQuery({ queryKey: ["tenant-memberships"], queryFn: listTenantMemberships });
  const hospital = memberships.data?.find((item) => item.tenantSlug === slug);
  // Staff endpoints always use the session's active tenant, so only show them
  // when this page is displaying that same hospital.
  const isActiveHospital = Boolean(hospital && activeTenant?.id === hospital.tenantId);

  const staff = useQuery({
    queryKey: ["tenant-staff"],
    queryFn: listTenantStaff,
    enabled: canReadStaff && isActiveHospital,
  });
  const invitations = useQuery({
    queryKey: ["staff-invitations"],
    queryFn: listStaffInvitations,
    enabled: canReadStaff && isActiveHospital,
  });

  if (memberships.isLoading) return <PageContainer><LoadingState label="Loading hospital..." /></PageContainer>;
  if (memberships.isError) return <PageContainer><ErrorState onRetry={() => void memberships.refetch()} /></PageContainer>;
  if (!hospital) return <PageContainer><EmptyState title="Hospital not found" description="This hospital is not available to your account." /></PageContainer>;

  const activeMembers = (staff.data ?? []).filter((member) => member.status === "ACTIVE");
  const pendingInvitations = (invitations.data ?? []).filter(
    (invitation) => invitation.status === "INVITED",
  );

  return (
    <PageContainer>
      <Button nativeButton={false} variant="ghost" render={<Link href="/hospitals" />} className="mb-4 -ml-3"><ArrowLeft className="size-4" />Back to hospitals</Button>
      <PageHeader eyebrow="Hospital details" title={hospital.tenantName} description={`Tenant slug: ${hospital.tenantSlug}`} />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5"><Building2 className="size-5 text-primary" /><p className="mt-4 text-sm text-muted-foreground">Status</p><StatusBadge status={hospital.tenantStatus === "ACTIVE" ? "success" : hospital.tenantStatus === "PENDING" ? "warning" : "neutral"}>{hospital.tenantStatus}</StatusBadge></div>
        <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Membership</p><p className="mt-2 font-medium">{hospital.status}</p><p className="mt-3 text-xs text-muted-foreground">Joined {hospital.joinedAt ? new Date(hospital.joinedAt).toLocaleDateString() : "not yet recorded"}</p></div>
      </div>

      {canReadStaff && !isActiveHospital ? (
        <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Select this hospital as your active workspace to view its staff and setup progress.</p>
      ) : null}

      {canReadStaff && isActiveHospital ? (
        <Card className="mt-6 scroll-mt-24" id="staff">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="size-5 text-primary" />Staff</CardTitle>
            <p className="text-sm text-muted-foreground">
              Only accepted memberships grant access. An invitation that was sent but not accepted stays pending.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <section aria-labelledby="active-staff-heading" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="active-staff-heading" className="text-sm font-semibold">Active memberships</h3>
                <Badge variant="secondary">{activeMembers.length}</Badge>
              </div>
              {staff.isLoading ? <LoadingState label="Loading staff..." /> : null}
              {staff.isError ? <ErrorState title="Unable to load staff memberships" onRetry={() => void staff.refetch()} /> : null}
              {staff.data && activeMembers.length === 0 ? (
                <EmptyState title="No active team members yet" description="Accepted invitations and existing memberships appear here." />
              ) : null}
              {activeMembers.length > 0 ? (
                <ul className="divide-y rounded-lg border">
                  {activeMembers.map((member) => (
                    <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                      <div><p className="font-medium">{member.fullName}</p><p className="text-xs text-muted-foreground">{member.email}</p></div>
                      <div className="flex flex-wrap gap-1">
                        {member.roles.length > 0 ? member.roles.map((role) => <Badge key={role.id} variant="outline">{role.name}</Badge>) : <span className="text-xs text-muted-foreground">No role assigned</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <section aria-labelledby="pending-invitations-heading" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="pending-invitations-heading" className="text-sm font-semibold">Invitations</h3>
                <Badge variant="secondary">{pendingInvitations.length} pending</Badge>
              </div>
              {invitations.isLoading ? <LoadingState label="Loading invitations..." /> : null}
              {invitations.isError ? <ErrorState title="Unable to load staff invitations" onRetry={() => void invitations.refetch()} /> : null}
              {invitations.data && invitations.data.length === 0 ? (
                <EmptyState title="No invitations sent yet" description="Pending invitations are listed separately and do not count as completed staff setup." />
              ) : null}
              {invitations.data && invitations.data.length > 0 ? (
                <ul className="divide-y rounded-lg border">
                  {invitations.data.map((invitation) => (
                    <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                      <div><p className="font-medium">{invitation.fullName ?? invitation.email}</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="size-3" />{invitation.email}</p></div>
                      <StatusBadge status={invitationStatusMap[invitation.status]}>{invitation.status}</StatusBadge>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Invitation sending and role assignment are not available on this screen yet; the checklist reads the existing membership and invitation APIs.
              </p>
            </section>
          </CardContent>
        </Card>
      ) : null}

      <p className="mt-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">The backend currently exposes membership summaries only. Hospital contact details and profile editing require a tenant profile endpoint, so no unsupported fields or edit controls are shown.</p>
    </PageContainer>
  );
}
