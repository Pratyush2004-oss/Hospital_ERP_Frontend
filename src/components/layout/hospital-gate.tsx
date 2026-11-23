"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Clock3,
  Hospital,
  LoaderCircle,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { listTenantMemberships, selectTenant } from "@/lib/api/management-service";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import {
  describeMembershipState,
  planHospitalSelection,
  resolveSelectableMembership,
} from "@/lib/tenants/hospital-selection";
import { useAuthStore } from "@/stores/auth-store";
import type { TenantMembership } from "@/types/management";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingState } from "@/components/shared/states";

/**
 * ONB-18 hospital context gate.
 *
 * The dashboard is not mounted until a valid hospital context exists, so
 * tenant-specific pages and their API calls never run against a missing or
 * stale tenant. The gate reuses the existing membership listing and the
 * server-side `POST /tenants/select` session selection; it does not introduce
 * new endpoints or store a tenant in local storage.
 */
export function HospitalGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const signOut = useAuthStore((state) => state.signOut);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const attemptedSlugRef = useRef<string | null>(null);

  const memberships = useQuery({
    queryKey: ["tenant-memberships"],
    queryFn: listTenantMemberships,
    retry: false,
  });

  const selection = useMutation({
    mutationFn: async (tenantSlug: string) => {
      // Reject inactive or unknown hospitals before touching the API.
      if (!resolveSelectableMembership(memberships.data ?? [], tenantSlug)) {
        throw new Error("That hospital is not available for your account.");
      }
      await selectTenant(tenantSlug);
    },
    onSuccess: async () => {
      setSelectionError(null);
      await queryClient.invalidateQueries({ queryKey: ["tenant-memberships"] });
      // Reload the server-side session so `activeTenant` (id, roles and
      // permissions) matches the newly selected hospital.
      await refreshSession();
    },
    onError: (error) => {
      setSelectionError(
        getApiErrorMessage(error, "We could not switch to that hospital."),
      );
    },
  });

  const plan = memberships.data
    ? planHospitalSelection({
        memberships: memberships.data,
        activeTenantId: session?.activeTenant?.id ?? null,
      })
    : null;

  const autoSelectSlug = plan?.kind === "auto-select" ? plan.membership.tenantSlug : null;
  const selectHospital = selection.mutate;

  useEffect(() => {
    if (!autoSelectSlug) return;
    // Only attempt the automatic selection once per hospital so a failure
    // surfaces the retry state instead of looping requests.
    if (attemptedSlugRef.current === autoSelectSlug) return;
    attemptedSlugRef.current = autoSelectSlug;
    selectHospital(autoSelectSlug);
  }, [autoSelectSlug, selectHospital]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.replace("/login");
    }
  };

  if (memberships.isLoading) {
    return (
      <GateScreen>
        <LoadingState label="Loading your hospitals..." />
      </GateScreen>
    );
  }

  if (memberships.isError) {
    return (
      <GateScreen>
        <GateMessage
          tone="error"
          title={
            isUnauthorized(memberships.error)
              ? "Your session has expired"
              : getApiErrorMessage(
                  memberships.error,
                  "We could not load your hospital memberships.",
                )
          }
          description={
            isUnauthorized(memberships.error)
              ? "Sign in again to continue. No hospital data was loaded."
              : "Check your connection and try again."
          }
        >
          <div className="flex flex-wrap justify-center gap-2">
            {isUnauthorized(memberships.error) ? (
              <Button nativeButton={false} render={<Link href="/login" />}>
                Sign in again
              </Button>
            ) : (
              <Button variant="outline" onClick={() => void memberships.refetch()}>
                <RefreshCw className="size-4" aria-hidden="true" /> Try again
              </Button>
            )}
            <Button variant="ghost" onClick={() => void handleSignOut()}>
              <LogOut className="size-4" aria-hidden="true" /> Sign out
            </Button>
          </div>
        </GateMessage>
      </GateScreen>
    );
  }

  if (!plan) {
    return (
      <GateScreen>
        <LoadingState label="Preparing your hospital workspace..." />
      </GateScreen>
    );
  }

  if (plan.kind === "restore") {
    return <>{children}</>;
  }

  if (plan.kind === "auto-select") {
    return (
      <GateScreen>
        <GateMessage
          tone={selectionError ? "error" : "info"}
          title={
            selectionError
              ? selectionError
              : `Opening ${plan.membership.tenantName}...`
          }
          description={
            selectionError
              ? "The hospital context was not established, so no hospital page has loaded."
              : "Your only active hospital is being selected automatically."
          }
        >
          {selectionError ? (
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => {
                  setSelectionError(null);
                  selectHospital(plan.membership.tenantSlug);
                }}
              >
                Try again
              </Button>
              <Button variant="outline" onClick={() => void memberships.refetch()}>
                Refresh hospitals
              </Button>
              <Button variant="ghost" onClick={() => void handleSignOut()}>
                <LogOut className="size-4" aria-hidden="true" /> Sign out
              </Button>
            </div>
          ) : (
            <LoaderCircle
              className="mx-auto size-5 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </GateMessage>
      </GateScreen>
    );
  }

  if (plan.kind === "choose") {
    return (
      <HospitalChooser
        memberships={plan.memberships}
        pendingSlug={selection.isPending ? selection.variables ?? null : null}
        error={selectionError}
        onSelect={(membership) => {
          setSelectionError(null);
          selectHospital(membership.tenantSlug);
        }}
        onSignOut={() => void handleSignOut()}
      />
    );
  }

  return (
    <NoActiveHospital
      memberships={plan.memberships}
      isRefreshing={memberships.isFetching}
      onRefresh={() => void memberships.refetch()}
      onSignOut={() => void handleSignOut()}
    />
  );
}

function GateScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}

function GateMessage({
  tone,
  title,
  description,
  children,
}: {
  tone: "info" | "error";
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`space-y-4 rounded-xl border bg-card p-6 text-center shadow-sm ${
        tone === "error" ? "border-destructive/30" : ""
      }`}
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <span
        className={`mx-auto flex size-11 items-center justify-center rounded-lg ${
          tone === "error"
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary"
        }`}
      >
        {tone === "error" ? (
          <TriangleAlert className="size-5" aria-hidden="true" />
        ) : (
          <Hospital className="size-5" aria-hidden="true" />
        )}
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function HospitalChooser({
  memberships,
  pendingSlug,
  error,
  onSelect,
  onSignOut,
}: {
  memberships: readonly TenantMembership[];
  pendingSlug: string | null;
  error: string | null;
  onSelect: (membership: TenantMembership) => void;
  onSignOut: () => void;
}) {
  const pending = pendingSlug
    ? memberships.find((membership) => membership.tenantSlug === pendingSlug)
    : null;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hospital className="size-5" aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight">HospitalOS</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </Button>
        </div>

        <section
          aria-labelledby="hospital-chooser-heading"
          className="rounded-xl border bg-card p-5 shadow-sm sm:p-7"
        >
          <h1 id="hospital-chooser-heading" className="text-xl font-semibold tracking-tight">
            Choose your hospital
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your account has access to more than one hospital. Pick the workspace you
            want to open. You can switch hospitals any time from the sidebar.
          </p>

          {error ? (
            <Alert variant="destructive" className="mt-4" role="alert">
              <TriangleAlert className="size-4" aria-hidden="true" />
              <AlertTitle>Hospital not selected</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <ul className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="Hospitals you can open">
            {memberships.map((membership) => {
              const isPending = membership.tenantSlug === pendingSlug;
              return (
                <li key={membership.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelect(membership)}
                    disabled={pendingSlug !== null}
                    aria-busy={isPending}
                    aria-label={`Open ${membership.tenantName} (${membership.tenantSlug})`}
                    className="flex h-full w-full items-center gap-3 rounded-lg border bg-background p-4 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {isPending ? (
                        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Building2 className="size-5" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {membership.tenantName}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {membership.tenantSlug}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 min-h-5 text-xs text-muted-foreground" role="status" aria-live="polite">
            {pending
              ? `Opening ${pending.tenantName}...`
              : "Only hospitals with an active membership appear here."}
          </p>
        </section>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Hospital access is validated by the server for every request.
        </p>
      </div>
    </div>
  );
}

function NoActiveHospital({
  memberships,
  isRefreshing,
  onRefresh,
  onSignOut,
}: {
  memberships: readonly TenantMembership[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
}) {
  const hasPendingTenant = memberships.some(
    (membership) => membership.tenantStatus === "PENDING",
  );
  const hasInvitation = memberships.some((membership) => membership.status === "INVITED");
  const hasSuspended = memberships.some(
    (membership) =>
      membership.tenantStatus === "SUSPENDED" || membership.status === "SUSPENDED",
  );
  const hasRemoved = memberships.some((membership) => membership.status === "REMOVED");

  const title = hasPendingTenant
    ? "Your hospital is awaiting approval"
    : hasInvitation
      ? "You have a pending invitation"
      : hasSuspended
        ? "Your hospital access is suspended"
        : hasRemoved
          ? "Your hospital access was removed"
          : "No active hospital yet";

  const description = hasPendingTenant
    ? "A HospitalOS administrator is reviewing your hospital registration. You can open the workspace once it is approved."
    : hasInvitation
      ? "Accept your invitation email to activate the membership, then refresh this page."
      : hasSuspended
        ? "A hospital administrator or HospitalOS support suspended this membership. Contact them to restore access."
        : hasRemoved
          ? "This membership was removed. Ask a hospital administrator for a new invitation if you still need access."
          : "Your account is signed in but not linked to an active hospital. Accept an invitation or register a hospital to continue.";

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-14">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hospital className="size-5" aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-tight">HospitalOS</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </Button>
        </div>

        <section
          aria-labelledby="no-hospital-heading"
          className="rounded-xl border bg-card p-5 shadow-sm sm:p-7"
        >
          <span className="flex size-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            {hasPendingTenant || hasInvitation ? (
              <Clock3 className="size-5" aria-hidden="true" />
            ) : (
              <Building2 className="size-5" aria-hidden="true" />
            )}
          </span>
          <h1 id="no-hospital-heading" className="mt-3 text-xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>

          {memberships.length > 0 ? (
            <ul className="mt-5 space-y-2" aria-label="Your hospital memberships">
              {memberships.map((membership) => (
                <li
                  key={membership.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{membership.tenantName}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {membership.tenantSlug}
                    </p>
                  </div>
                  <StatusBadge status={membershipTone(membership)}>
                    {describeMembershipState(membership)}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button nativeButton={false} render={<Link href="/onboarding/status" />}>
              Check registration status
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/accept-invitation" />}
            >
              <Mail className="size-4" aria-hidden="true" /> Accept an invitation
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/onboarding/hospital" />}
            >
              Register a hospital
            </Button>
          </div>

          <div className="mt-4 border-t pt-4">
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isRefreshing}>
              {isRefreshing ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-4" aria-hidden="true" />
              )}
              {isRefreshing ? "Checking..." : "Refresh status"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function membershipTone(
  membership: Pick<TenantMembership, "status" | "tenantStatus">,
): "warning" | "error" | "neutral" {
  if (membership.status === "REMOVED" || membership.tenantStatus === "SUSPENDED") {
    return "error";
  }
  if (membership.tenantStatus === "INACTIVE") return "neutral";
  return "warning";
}

function isUnauthorized(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("response" in error)) return false;
  return (error as { response?: { status?: number } }).response?.status === 401;
}
