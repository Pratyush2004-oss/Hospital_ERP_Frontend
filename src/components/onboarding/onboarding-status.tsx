"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { getTenantOnboardingStatus } from "@/lib/api/management-service";
import type { TenantOnboardingRegistration } from "@/types/management";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<TenantOnboardingRegistration["status"], string> = {
  PENDING: "Awaiting approval",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  INACTIVE: "Inactive",
};

const STATUS_TONE: Record<
  TenantOnboardingRegistration["status"],
  "warning" | "success" | "error" | "neutral"
> = {
  PENDING: "warning",
  ACTIVE: "success",
  SUSPENDED: "error",
  INACTIVE: "neutral",
};

export function OnboardingStatus() {
  const searchParams = useSearchParams();
  const submitted = searchParams.get("submitted") === "1";
  const query = useQuery({
    queryKey: ["tenant-onboarding"],
    queryFn: getTenantOnboardingStatus,
    retry: false,
  });

  if (query.isLoading) {
    return <LoadingState label="Loading registration status..." />;
  }

  if (query.isError) {
    return (
      <ErrorState
        title={getApiErrorMessage(query.error, "Unable to load your registration status.")}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { registrations, supportEmail } = query.data ?? { registrations: [], supportEmail: null };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Hospital registration status
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track the hospitals you submitted. HospitalOS reviews every new workspace
            before it becomes available to staff.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          {query.isFetching ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Refresh
        </Button>
      </div>

      {submitted ? (
        <Alert className="border-emerald-600/30 bg-emerald-50/60 dark:bg-emerald-950/20">
          <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-400" />
          <AlertTitle>Registration submitted</AlertTitle>
          <AlertDescription>
            Your account and hospital registration were received. No further action is
            needed while an administrator reviews the hospital.
          </AlertDescription>
        </Alert>
      ) : null}

      {registrations.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="No hospital registrations yet"
            description="Start a guided registration. It takes four short steps and your details stay on this page while you review them."
          />
          <div className="flex justify-center">
            <Button nativeButton={false} render={<Link href="/onboarding/hospital" />}>
              Register a hospital <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {registrations.map((registration) => (
            <li key={registration.tenantId}>
              <RegistrationCard registration={registration} />
            </li>
          ))}
        </ul>
      )}

      <Alert>
        <ShieldCheck className="size-4 text-primary" />
        <AlertTitle>What approval means</AlertTitle>
        <AlertDescription>
          A <strong>PENDING</strong> hospital cannot be selected or used by staff yet.
          When it is approved, sign in with the same account and the hospital will be
          available as an active workspace. You will be its hospital administrator.
          Approval notes are not exposed here.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col justify-between gap-2 border-t pt-4 sm:flex-row">
        <Button variant="ghost" nativeButton={false} render={<Link href="/hospitals" />}>
          View hospitals
        </Button>
        <Button nativeButton={false} render={<Link href="/onboarding/hospital" />}>
          Register another hospital
        </Button>
      </div>

      {supportEmail ? (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Mail className="size-3.5" />
          Questions?{" "}
          <a className="font-medium text-primary hover:underline" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
        </p>
      ) : null}
    </div>
  );
}

function RegistrationCard({
  registration,
}: {
  registration: TenantOnboardingRegistration;
}) {
  const submittedDate = formatDate(registration.submittedAt);

  return (
    <article className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{registration.tenantName}</h3>
            <p className="truncate font-mono text-xs text-muted-foreground">
              /hospitals/{registration.tenantSlug}
            </p>
          </div>
        </div>
        <StatusBadge status={STATUS_TONE[registration.status]}>
          {STATUS_LABEL[registration.status]}
        </StatusBadge>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Submitted</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
            <Clock3 className="size-3.5 text-muted-foreground" />
            {submittedDate}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Contact email</dt>
          <dd className="mt-0.5 truncate font-medium">{registration.email ?? "Not provided"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Timezone</dt>
          <dd className="mt-0.5 truncate font-medium">{registration.timezone}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-xs text-muted-foreground">
          Reference: <span className="font-mono">{registration.registrationReference}</span>
        </p>
        {registration.status === "ACTIVE" ? (
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/hospitals" />}
          >
            Open hospital <ArrowRight className="size-4" />
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            {registration.status === "PENDING"
              ? "No action needed while HospitalOS reviews this registration."
              : "Contact HospitalOS support if you need help with this workspace."}
          </p>
        )}
      </div>
    </article>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
