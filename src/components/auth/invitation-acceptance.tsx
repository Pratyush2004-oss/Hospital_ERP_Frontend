"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  LoaderCircle,
  Mail,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  acceptInvitation,
  getApiErrorMessage,
  getInvitationDetails,
  type AcceptInvitationResult,
  type InvitationDetails,
} from "@/lib/auth/auth-service";
import { getApiErrorStatus } from "@/lib/onboarding/registration-flow";
import { useAuthStore } from "@/stores/auth-store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { LoadingState, ErrorState } from "@/components/shared/states";

const newAccountSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(200, "Full name must be at most 200 characters"),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .max(128, "Password must be at most 128 characters")
      .refine(
        (value) => new TextEncoder().encode(value).length <= 72,
        "Password must be at most 72 bytes",
      ),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type NewAccountValues = z.infer<typeof newAccountSchema>;

export function InvitationAcceptance({ token }: { token: string | null }) {
  const details = useQuery({
    queryKey: ["invitation-details", token],
    queryFn: () => getInvitationDetails(token!),
    enabled: Boolean(token),
    retry: false,
  });

  if (!token) {
    return (
      <InvitationState
        icon={<Mail />}
        title="Open the link from your invitation email"
        description="Invitation links contain a one-time token. Ask your hospital administrator to resend it if you cannot find the email."
      >
        <Actions />
      </InvitationState>
    );
  }

  if (details.isLoading) {
    return <LoadingState label="Checking your invitation..." />;
  }

  if (details.isError) {
    return (
      <ErrorState
        title={getApiErrorMessage(details.error, "This invitation could not be loaded.")}
        onRetry={() => void details.refetch()}
      />
    );
  }

  const invitation = details.data;
  if (!invitation) {
    return (
      <InvitationState
        icon={<ShieldAlert />}
        title="This invitation is not valid"
        description="The link may be incomplete or no longer associated with an active invitation."
      >
        <Actions />
      </InvitationState>
    );
  }

  if (!invitation.valid || invitation.status !== "INVITED") {
    return <UnavailableInvitation invitation={invitation} />;
  }

  return (
    <div className="space-y-5">
      <InvitationSummary invitation={invitation} />
      {invitation.requiresPassword ? (
        <NewAccountAcceptance
          token={token}
          invitation={invitation}
          onInvitationChanged={() => void details.refetch()}
        />
      ) : (
        <ExistingAccountAcceptance
          token={token}
          invitation={invitation}
          onInvitationChanged={() => void details.refetch()}
        />
      )}
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in with a different account
        </Link>
      </p>
    </div>
  );
}

function InvitationSummary({ invitation }: { invitation: InvitationDetails }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              You are joining
            </p>
            <h2 className="truncate text-lg font-semibold">
              {invitation.hospitalName ?? "A HospitalOS hospital"}
            </h2>
            {invitation.email ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5" />
                Invitation for {invitation.email}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Role
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {invitation.roles.length > 0 ? (
              invitation.roles.map((role) => (
                <Badge key={role.slug} variant="outline">
                  {role.name}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No role assigned</span>
            )}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="size-3.5" /> Branch access
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {invitation.branches.length > 0 ? (
              invitation.branches.map((branch) => (
                <Badge key={branch.name} variant="secondary">
                  {branch.name}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Hospital-wide</span>
            )}
          </div>
        </div>
      </div>

      {invitation.expiresAt ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3 className="size-3.5" />
          This invitation expires on {formatDate(invitation.expiresAt)}.
        </p>
      ) : null}
    </div>
  );
}

function NewAccountAcceptance({
  token,
  invitation,
  onInvitationChanged,
}: {
  token: string;
  invitation: InvitationDetails;
  onInvitationChanged: () => void;
}) {
  const router = useRouter();
  const form = useForm<NewAccountValues>({
    resolver: zodResolver(newAccountSchema),
    defaultValues: {
      fullName: invitation.fullName ?? "",
      password: "",
      confirmPassword: "",
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<AcceptInvitationResult | null>(null);

  if (accepted) {
    return <AcceptedInvitation result={accepted} onContinue={() => router.replace("/dashboard")} />;
  }

  const submit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const result = await acceptInvitation(token, {
        fullName: values.fullName.trim(),
        password: values.password,
      });
      await useAuthStore.getState().refreshSession();
      setAccepted(result);
    } catch (error) {
      if (getApiErrorStatus(error) === 400) onInvitationChanged();
      setSubmitError(getApiErrorMessage(error, "The invitation could not be accepted."));
    }
  });

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      <div>
        <h3 className="flex items-center gap-2 font-semibold">
          <UserRound className="size-4 text-primary" />
          Create your account
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Use your full name and set a password. Your email is already verified by
          the invitation.
        </p>
      </div>

      {submitError ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not accept the invitation</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <FormField
        id="fullName"
        label="Full name"
        required
        error={form.formState.errors.fullName?.message}
      >
        <Input
          id="fullName"
          autoComplete="name"
          aria-invalid={Boolean(form.formState.errors.fullName)}
          {...form.register("fullName")}
        />
      </FormField>

      <FormField
        id="password"
        label="Create a password"
        required
        error={form.formState.errors.password?.message}
      >
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            className="pr-10"
            aria-invalid={Boolean(form.formState.errors.password)}
            {...form.register("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </FormField>

      <FormField
        id="confirmPassword"
        label="Confirm password"
        required
        error={form.formState.errors.confirmPassword?.message}
      >
        <Input
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          aria-invalid={Boolean(form.formState.errors.confirmPassword)}
          {...form.register("confirmPassword")}
        />
      </FormField>

      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
        {form.formState.isSubmitting ? "Accepting..." : "Create account and join"}
      </Button>
    </form>
  );
}

function ExistingAccountAcceptance({
  token,
  invitation,
  onInvitationChanged,
}: {
  token: string;
  invitation: InvitationDetails;
  onInvitationChanged: () => void;
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<AcceptInvitationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (accepted) {
    return <AcceptedInvitation result={accepted} onContinue={() => router.replace("/dashboard")} />;
  }

  async function accept() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await acceptInvitation(token, {});
      await useAuthStore.getState().refreshSession();
      setAccepted(result);
    } catch (error) {
      if (getApiErrorStatus(error) === 400) onInvitationChanged();
      setSubmitError(getApiErrorMessage(error, "The invitation could not be accepted."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Alert>
        <ShieldCheck className="size-4 text-primary" />
        <AlertTitle>Use your existing HospitalOS account</AlertTitle>
        <AlertDescription>
          You are already registered with the invited email. Joining signs you in to
          that account; your password is never reset.
        </AlertDescription>
      </Alert>

      {submitError ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not accept the invitation</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="button" className="w-full" onClick={accept} disabled={submitting}>
        {submitting ? <LoaderCircle className="animate-spin" /> : null}
        {submitting ? "Joining..." : "Join hospital"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Signed in with a different account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Check your account
        </Link>
      </p>

      {invitation.fullName ? (
        <p className="text-center text-xs text-muted-foreground">
          Invitation name: {invitation.fullName}
        </p>
      ) : null}
    </div>
  );
}

function AcceptedInvitation({
  result,
  onContinue,
}: {
  result: AcceptInvitationResult;
  onContinue: () => void;
}) {
  return (
    <InvitationState
      icon={<CheckCircle2 className="text-emerald-600" />}
      title="You have joined the hospital"
      description={
        result.accountCreated
          ? "Your account was created and your hospital membership is active."
          : "Your existing account was used and your hospital membership is active."
      }
    >
      <Button className="w-full" onClick={onContinue}>
        Continue to your dashboard
      </Button>
    </InvitationState>
  );
}

function UnavailableInvitation({ invitation }: { invitation: InvitationDetails }) {
  const states: Record<
    Exclude<InvitationDetails["status"], "INVITED">,
    { title: string; description: string; icon: React.ReactNode }
  > = {
    INVALID: {
      title: "This invitation is not valid",
      description: "The link may be incomplete. Ask your administrator for a new invitation.",
      icon: <ShieldAlert />,
    },
    EXPIRED: {
      title: "This invitation has expired",
      description:
        "Invitation links are time-limited. Ask your hospital administrator to resend the invitation.",
      icon: <Clock3 />,
    },
    REVOKED: {
      title: "This invitation was revoked",
      description:
        "An administrator cancelled this invitation, so the link can no longer be used. Ask them to send a new one.",
      icon: <ShieldAlert />,
    },
    ACCEPTED: {
      title: "This invitation was already used",
      description:
        "Each invitation can be accepted once. Sign in with the account that accepted it.",
      icon: <CheckCircle2 />,
    },
  };
  if (invitation.status === "INVITED") return null;
  const state = states[invitation.status];

  return (
    <InvitationState icon={state.icon} title={state.title} description={state.description}>
      <Actions signedInHint={invitation.status === "ACCEPTED"} />
    </InvitationState>
  );
}

function InvitationState({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-6">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Actions({ signedInHint = false }: { signedInHint?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button nativeButton={false} render={<Link href={signedInHint ? "/dashboard" : "/login"} />}>
        {signedInHint ? "Go to dashboard" : "Sign in"}
      </Button>
      <Button variant="outline" nativeButton={false} render={<Link href="/register" />}>
        Create a hospital
      </Button>
    </div>
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
