"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock3,
  LockKeyhole,
  ListChecks,
  RefreshCw,
  Stethoscope,
  Users,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore, useState } from "react";
import { toast } from "sonner";
import { getSetupReadiness } from "@/lib/api/setup-service";
import { createBranch } from "@/lib/api/management-service";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { SetupStep, SetupStepKey, SetupStepStatus } from "@/types/setup";
import type { BranchInput } from "@/types/management";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BranchForm } from "@/components/management/branch-form";

const READ_PERMISSIONS = [
  "tenant:read",
  "branch:read",
  "department:read",
  "staff:read",
  "doctor:read",
  "schedule.read",
] as const;

const STEP_ICONS: Record<SetupStepKey, LucideIcon> = {
  "hospital-profile": Building2,
  branch: Workflow,
  department: ClipboardList,
  staff: Users,
  doctor: Stethoscope,
  schedule: CalendarClock,
};

const STATUS_META: Record<
  SetupStepStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  complete: {
    label: "Complete",
    icon: CheckCircle2,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  incomplete: {
    label: "To do",
    icon: Circle,
    className: "text-muted-foreground",
  },
  pending: {
    label: "Pending",
    icon: Clock3,
    className: "text-amber-600 dark:text-amber-400",
  },
  blocked: {
    label: "Blocked",
    icon: LockKeyhole,
    className: "text-amber-600 dark:text-amber-400",
  },
};

function skipStorageKey(tenantId: string): string {
  return `hospitalos:setup-skipped:${tenantId}`;
}

const EMPTY_SKIPPED: string[] = [];
const skippedCache = new Map<string, string[]>();
const skippedListeners = new Set<() => void>();

function readSkipped(tenantId: string): string[] {
  try {
    const raw = window.localStorage.getItem(skipStorageKey(tenantId));
    if (!raw) return EMPTY_SKIPPED;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : EMPTY_SKIPPED;
  } catch {
    return EMPTY_SKIPPED;
  }
}

function cachedSkipped(tenantId: string): string[] {
  const cached = skippedCache.get(tenantId);
  if (cached) return cached;
  const value = readSkipped(tenantId);
  skippedCache.set(tenantId, value);
  return value;
}

/** Local browser preference only; completion is always derived from the API. */
function writeSkipped(tenantId: string, value: string[]) {
  skippedCache.set(tenantId, value);
  try {
    window.localStorage.setItem(skipStorageKey(tenantId), JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode); skipping stays session-only.
  }
  for (const listener of skippedListeners) listener();
}

function subscribeSkipped(listener: () => void): () => void {
  skippedListeners.add(listener);
  return () => {
    skippedListeners.delete(listener);
  };
}

function useSkippedSteps(tenantId: string | undefined): string[] {
  return useSyncExternalStore(
    subscribeSkipped,
    () => (tenantId ? cachedSkipped(tenantId) : EMPTY_SKIPPED),
    () => EMPTY_SKIPPED,
  );
}

export function SetupChecklist() {
  const queryClient = useQueryClient();
  const [branchFormOpen, setBranchFormOpen] = useState(false);
  const tenant = useAuthStore((state) => state.session?.activeTenant ?? null);
  const permissions = tenant?.permissions ?? [];
  const canRead = READ_PERMISSIONS.some((permission) => permissions.includes(permission));
  const tenantId = tenant?.id;

  const skipped = useSkippedSteps(tenantId);

  function toggleSkip(key: SetupStepKey) {
    if (!tenantId) return;
    const next = skipped.includes(key)
      ? skipped.filter((entry) => entry !== key)
      : [...skipped, key];
    writeSkipped(tenantId, next);
  }

  const query = useQuery({
    queryKey: ["setup-readiness", tenantId],
    enabled: Boolean(tenantId) && canRead,
    queryFn: () => getSetupReadiness(),
  });
  const createFirstBranch = useMutation({
    mutationFn: createBranch,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["setup-readiness"] }),
        queryClient.invalidateQueries({ queryKey: ["branches"] }),
        queryClient.invalidateQueries({ queryKey: ["context-branches"] }),
      ]);
      setBranchFormOpen(false);
      toast.success("Branch created. Your setup checklist has been updated.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (!tenantId || !canRead) return null;

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="size-5 text-primary" />
            Hospital setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingState label="Checking your hospital setup..." />
        </CardContent>
      </Card>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="size-5 text-primary" />
            Hospital setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState
            title="Unable to load your setup progress"
            onRetry={() => void query.refetch()}
          />
        </CardContent>
      </Card>
    );
  }

  const readiness = query.data;

  if (readiness.steps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="size-5 text-primary" />
            Hospital setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No setup steps available"
            description="Your role can view this page but does not include any setup-related read permissions."
          />
        </CardContent>
      </Card>
    );
  }

  const nextRequired = readiness.steps.find((step) => step.required && !step.complete);
  const nextOptional = readiness.steps.find(
    (step) => !step.required && !step.complete && !skipped.includes(step.key),
  );
  const nextStepKey = nextRequired?.key ?? nextOptional?.key ?? null;

  const allRequiredComplete =
    readiness.progress.requiredTotal > 0 &&
    readiness.progress.requiredCompleted === readiness.progress.requiredTotal;
  const allComplete = allRequiredComplete && readiness.progress.completed === readiness.progress.total;

  return (
    <Card className={cn("border-primary/20", allRequiredComplete && "border-emerald-500/30")}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="size-5 text-primary" />
            {allComplete ? "Hospital setup complete" : "Finish setting up your hospital"}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {allRequiredComplete
              ? "All required steps are done. Optional steps can be completed whenever you are ready."
              : "Progress is calculated from your hospital's live records, so it stays accurate if you leave and come back."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          aria-label="Refresh setup progress"
        >
          <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">
              {readiness.progress.requiredCompleted} of {readiness.progress.requiredTotal} required
              steps complete
              {readiness.progress.optionalTotal > 0
                ? ` · ${readiness.progress.optionalCompleted} of ${readiness.progress.optionalTotal} optional`
                : ""}
            </p>
            <span className="text-sm font-semibold tabular-nums">
              {readiness.progress.percent}%
            </span>
          </div>
          <Progress
            value={readiness.progress.percent}
            aria-label="Required hospital setup progress"
          />
        </div>

        {allComplete ? (
          <Alert className="border-emerald-500/30 bg-emerald-500/5">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <AlertTitle>Setup complete</AlertTitle>
            <AlertDescription>
              Every checklist step is complete for {readiness.tenantName}. You can revisit any
              management page whenever your setup changes.
            </AlertDescription>
          </Alert>
        ) : allRequiredComplete ? (
          <Alert className="border-emerald-500/30 bg-emerald-500/5">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <AlertTitle>Core setup complete</AlertTitle>
            <AlertDescription>
              The hospital is ready to use. Remaining optional steps are not required for
              dashboard access.
            </AlertDescription>
          </Alert>
        ) : null}

        <ol className="space-y-3" aria-label="Hospital setup steps">
          {readiness.steps.map((step) => (
            <SetupStepRow
              key={step.key}
              step={step}
              isNext={step.key === nextStepKey}
              skipped={!step.required && skipped.includes(step.key) && !step.complete}
              onToggleSkip={() => toggleSkip(step.key)}
              onCreateBranch={
                step.key === "branch" && !step.complete && step.canAct
                  ? () => setBranchFormOpen(true)
                  : undefined
              }
            />
          ))}
        </ol>

        <p className="text-xs text-muted-foreground">
          Skipped optional steps stay incomplete until the underlying records exist. Required
          steps cannot be skipped.
        </p>
      </CardContent>
      <BranchForm
        branch={null}
        open={branchFormOpen}
        onOpenChange={setBranchFormOpen}
        onSubmit={(input) => {
          if ("branchCode" in input) createFirstBranch.mutate(input as BranchInput);
        }}
        isPending={createFirstBranch.isPending}
      />
    </Card>
  );
}

function SetupStepRow({
  step,
  isNext,
  skipped,
  onToggleSkip,
  onCreateBranch,
}: {
  step: SetupStep;
  isNext: boolean;
  skipped: boolean;
  onToggleSkip: () => void;
  onCreateBranch?: () => void;
}) {
  const Icon = STEP_ICONS[step.key];
  const status = STATUS_META[step.status];
  const StatusIcon = status.icon;
  const missingPrerequisites = step.prerequisites.filter(
    (prerequisite) => !prerequisite.met,
  );

  return (
    <li
      className={cn(
        "rounded-lg border p-3 sm:p-4",
        isNext && "border-primary/50 bg-primary/5",
        step.complete && "bg-muted/30",
        !step.complete && !isNext && "bg-background",
      )}
      aria-current={isNext ? "step" : undefined}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background",
              step.complete ? "border-emerald-500/40" : "border-border",
            )}
          >
            {step.complete ? (
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Icon className="size-4 text-muted-foreground" />
            )}
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{step.title}</p>
              {step.required ? (
                <Badge variant="outline">Required</Badge>
              ) : (
                <Badge variant="secondary">Optional</Badge>
              )}
              <span className={cn("inline-flex items-center gap-1 text-xs", status.className)}>
                <StatusIcon className="size-3.5" />
                {skipped ? "Skipped for now" : status.label}
              </span>
              {isNext ? <Badge>Next step</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground">{step.description}</p>
            <p className="text-xs text-muted-foreground">{step.detail}</p>
            {missingPrerequisites.length > 0 ? (
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Complete {missingPrerequisites.map((item) => item.title).join(" and ")} first.
              </p>
            ) : null}
            {!step.canAct ? (
              <p className="text-xs text-muted-foreground">
                You can view this area, but your role does not include the permission needed to
                change it. Ask a hospital administrator if that is unexpected.
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {onCreateBranch ? (
            <Button size="sm" variant={isNext ? "default" : "outline"} onClick={onCreateBranch}>
              <Workflow className="size-4" />
              Create first branch
            </Button>
          ) : null}
          <Button
            size="sm"
            variant={isNext && step.canAct && !onCreateBranch ? "default" : "outline"}
            nativeButton={false}
            render={<Link href={step.actionPath} />}
          >
            {step.canAct ? step.actionLabel : "View"}
          </Button>
          {!step.required && !step.complete ? (
            <Button size="sm" variant="ghost" onClick={onToggleSkip}>
              {skipped ? "Restore" : "Skip for now"}
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
