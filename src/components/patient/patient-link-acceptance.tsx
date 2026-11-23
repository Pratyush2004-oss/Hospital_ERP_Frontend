"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { getApiErrorMessage, registerAccount, resendEmailVerification } from "@/lib/auth/auth-service";
import {
  acceptPatientLinkInvitation,
  getPatientLinkInvitationDetails,
} from "@/lib/api/patient-linking-service";
import { useAuthStore } from "@/stores/auth-store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { LoadingState, ErrorState } from "@/components/shared/states";

export function PatientLinkAcceptance({ token }: { token: string | null }) {
  const session = useAuthStore((state) => state.session);
  const details = useQuery({
    queryKey: ["patient-link-details", token],
    queryFn: () => getPatientLinkInvitationDetails(token!),
    enabled: Boolean(token),
    retry: false,
  });

  if (!token) {
    return (
      <LinkState
        icon={<Mail />}
        title="Open the link from your hospital email"
        description="Patient linking links contain a one-time token. Ask hospital reception to send a new invitation if you cannot find the email."
      />
    );
  }

  if (details.isLoading) return <LoadingState label="Checking your linking invitation..." />;
  if (details.isError) {
    return (
      <ErrorState
        title={getApiErrorMessage(details.error, "This invitation could not be loaded.")}
        onRetry={() => void details.refetch()}
      />
    );
  }

  const invitation = details.data;
  if (!invitation || !invitation.valid || invitation.status !== "INVITED") {
    const status = invitation?.status ?? "INVALID";
    return (
      <LinkState
        icon={<ShieldAlert />}
        title={
          status === "EXPIRED"
            ? "This linking invitation has expired"
            : status === "REVOKED"
              ? "This linking invitation was revoked"
              : status === "ACCEPTED"
                ? "This invitation has already been used"
                : "This linking invitation is not valid"
        }
        description={
          status === "ACCEPTED"
            ? "The patient record may already be linked to an account. Sign in to the patient portal to check."
            : "Ask hospital reception to send a new linking invitation from your patient profile."
        }
      >
        <Button nativeButton={false} render={<Link href="/portal" />}>
          Open patient portal
        </Button>
      </LinkState>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-medium">
            <Building2 className="size-4" aria-hidden="true" />
            {invitation.hospitalName}
          </span>
          <Badge variant="secondary">{invitation.status}</Badge>
        </div>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <Detail label="Patient profile" value={invitation.patientName ?? "Patient record"} />
          <Detail label="Invitation sent to" value={invitation.email ?? "Hidden"} />
          <Detail
            label="Expires"
            value={
              invitation.expiresAt
                ? new Date(invitation.expiresAt).toLocaleString()
                : "Unknown"
            }
          />
        </dl>
      </div>

      {session ? (
        session.user.emailVerifiedAt ? (
          <AcceptInvitation token={token} />
        ) : (
          <VerifyRequired />
        )
      ) : invitation.requiresAccount ? (
        <CreateAccount suggestedName={invitation.patientName ?? ""} />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in with the account that uses <strong>{invitation.email}</strong> to
            link this patient record. This invitation is single-use and expires
            automatically.
          </p>
          <Button nativeButton={false} render={<Link href={signInHref(token)} />}>
            Sign in to link this record
          </Button>
        </div>
      )}

      {session ? (
        <p className="text-xs text-muted-foreground">
          Signed in as {session.user.email}. A different account cannot use this
          invitation.
        </p>
      ) : null}
    </div>
  );
}

function signInHref(token: string) {
  const next = `/portal/link?token=${encodeURIComponent(token)}`;
  return `/login?next=${encodeURIComponent(next)}`;
}

function AcceptInvitation({ token }: { token: string }) {
  const [accepted, setAccepted] = useState<{
    hospitalName: string;
    hospitalSlug: string;
    alreadyLinked: boolean;
  } | null>(null);
  const accept = useMutation({
    mutationFn: () => acceptPatientLinkInvitation(token),
    onSuccess: (result) => {
      setAccepted({
        hospitalName: result.hospitalName,
        hospitalSlug: result.hospitalSlug,
        alreadyLinked: result.alreadyLinked,
      });
    },
  });

  if (accepted) {
    return (
      <div className="space-y-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-5" aria-hidden="true" />
          {accepted.alreadyLinked ? "This record was already linked" : "Patient record linked"}
        </p>
        <p>
          {accepted.hospitalName} is now available in your patient portal. Your
          profile, appointments and billing for this hospital stay separate from any
          other hospital.
        </p>
        <Button
          nativeButton={false}
          render={
            <Link
              href={`/portal?hospital=${encodeURIComponent(accepted.hospitalSlug)}`}
            />
          }
        >
          Open {accepted.hospitalName}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Confirm that this is your patient record. Linking gives this account access
        to the profile, appointments and billing for this hospital only.
      </p>
      {accept.isError ? (
        <Alert variant="destructive" role="alert">
          <ShieldAlert className="size-4" aria-hidden="true" />
          <AlertTitle>Could not link this record</AlertTitle>
          <AlertDescription>{getApiErrorMessage(accept.error)}</AlertDescription>
        </Alert>
      ) : null}
      <Button onClick={() => accept.mutate()} disabled={accept.isPending}>
        <ShieldCheck className="size-4" aria-hidden="true" />
        {accept.isPending ? "Linking..." : "Link my patient record"}
      </Button>
    </div>
  );
}

function VerifyRequired() {
  const [message, setMessage] = useState<string | null>(null);
  const resend = useMutation({
    mutationFn: resendEmailVerification,
    onSuccess: () => setMessage("A new verification email has been sent."),
    onError: (error) => setMessage(getApiErrorMessage(error)),
  });

  return (
    <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-medium">
        <Clock3 className="size-4" aria-hidden="true" /> Verify your email first
      </p>
      <p>
        Your account email must be verified before a patient record can be linked.
        Open the verification email, then return to this page.
      </p>
      {message ? <p role="status">{message}</p> : null}
      <Button variant="outline" onClick={() => resend.mutate()} disabled={resend.isPending}>
        {resend.isPending ? "Sending..." : "Resend verification email"}
      </Button>
    </div>
  );
}

function CreateAccount({ suggestedName }: { suggestedName: string }) {
  const [fullName, setFullName] = useState(suggestedName);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const register = useMutation({
    mutationFn: () =>
      registerAccount({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      }),
    onSuccess: () => {
      setMessage(
        "Account created. Check your email for the verification link, verify it, then sign in and reopen this invitation.",
      );
    },
  });

  if (message) {
    return (
      <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-4" aria-hidden="true" /> Verify your email
        </p>
        <p>{message}</p>
        <Button nativeButton={false} render={<Link href={signInHrefFromHere()} />}>
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        register.mutate();
      }}
    >
      <div>
        <p className="text-sm font-medium">Create your HospitalOS account</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Use the email address that received this invitation. You will need to
          verify it before linking.
        </p>
      </div>
      <FormField id="link-full-name" label="Full name" required>
        <Input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          autoComplete="name"
          required
        />
      </FormField>
      <FormField id="link-email" label="Invited email address" required>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="link-password" label="Password" required description="At least 12 characters.">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={12}
            required
          />
        </FormField>
        <FormField
          id="link-password-confirm"
          label="Confirm password"
          required
          error={confirmPassword && password !== confirmPassword ? "Passwords do not match." : undefined}
        >
          <Input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={12}
            required
          />
        </FormField>
      </div>
      {register.isError ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Account could not be created</AlertTitle>
          <AlertDescription>{getApiErrorMessage(register.error)}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="submit"
        disabled={
          register.isPending ||
          !fullName.trim() ||
          !email.trim() ||
          password.length < 12 ||
          password !== confirmPassword
        }
      >
        {register.isPending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}

function signInHrefFromHere() {
  if (typeof window === "undefined") return "/login?next=%2Fportal";
  const next = `${window.location.pathname}${window.location.search}`;
  return `/login?next=${encodeURIComponent(next)}`;
}

function LinkState({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children ? <div className="flex justify-center">{children}</div> : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
