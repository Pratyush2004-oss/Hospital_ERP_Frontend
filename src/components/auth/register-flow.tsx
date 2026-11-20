"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { getApiErrorMessage, registerAccount } from "@/lib/auth/auth-service";
import { registerTenant } from "@/lib/api/management-service";
import {
  getRegisterIntent,
  RegistrationStepError,
  submitHospitalRegistration,
  type RegisterIntent,
  type RegistrationProgress,
  type RegistrationStage,
} from "@/lib/onboarding/registration-flow";
import {
  hospitalRegistrationSchema,
  registrationAccountSchema,
  toHospitalRegistrationPayload,
  toRegisterAccountPayload,
  type HospitalRegistrationValues,
  type RegistrationAccountValues,
} from "@/lib/validations/onboarding";
import { useAuthStore } from "@/stores/auth-store";
import type { TenantMembership } from "@/types/management";
import { InvitationUnavailable } from "./invitation-unavailable";
import { FormField } from "@/components/shared/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Step = "choose" | "account" | "hospital" | "success";
type FailedStage = RegistrationStage | null;

const FALLBACK_TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
];

function resolvedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function supportedTimezones(): string[] {
  const intl = Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  };

  try {
    return intl.supportedValuesOf?.("timeZone") ?? FALLBACK_TIMEZONES;
  } catch {
    return FALLBACK_TIMEZONES;
  }
}

function stageErrorMessage(stage: RegistrationStage, cause: unknown): string {
  const detail = getApiErrorMessage(cause);

  switch (stage) {
    case "account":
      return `We could not create your account. ${detail}`;
    case "sign-in":
      return `Your account was created, but signing in failed. ${detail}`;
    case "hospital":
      return `Your account is ready, but the hospital registration could not be completed. ${detail}`;
  }
}

export function RegisterFlow() {
  const searchParams = useSearchParams();
  const signIn = useAuthStore((state) => state.signIn);
  const signOut = useAuthStore((state) => state.signOut);

  const [intent, setIntent] = useState<RegisterIntent>(() =>
    getRegisterIntent(searchParams.get("intent")),
  );
  const [step, setStep] = useState<Step>("choose");
  const [accountValues, setAccountValues] = useState<RegistrationAccountValues | null>(null);
  const [progress, setProgress] = useState<Partial<RegistrationProgress>>({});
  const [tenant, setTenant] = useState<TenantMembership | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [failedStage, setFailedStage] = useState<FailedStage>(null);

  const defaultTimezone = useMemo(() => resolvedTimezone(), []);
  const timezones = useMemo(
    () => [...new Set([defaultTimezone, ...supportedTimezones(), "UTC"])].sort(),
    [defaultTimezone],
  );

  const accountForm = useForm<RegistrationAccountValues>({
    resolver: zodResolver(registrationAccountSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const hospitalForm = useForm<HospitalRegistrationValues>({
    resolver: zodResolver(hospitalRegistrationSchema),
    defaultValues: {
      name: "",
      slug: "",
      legalName: "",
      email: "",
      phone: "",
      timezone: defaultTimezone,
    },
  });

  const continueToHospital = accountForm.handleSubmit((values) => {
    setAccountValues(values);
    setSubmitError(null);
    setFailedStage(null);
    setStep("hospital");
  });

  const timezone = useWatch({ control: hospitalForm.control, name: "timezone" });

  const submitHospital = hospitalForm.handleSubmit(async (values) => {
    if (!accountValues) {
      setStep("account");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setFailedStage(null);

    try {
      const result = await submitHospitalRegistration(
        {
          account: toRegisterAccountPayload(accountValues),
          hospital: toHospitalRegistrationPayload(values),
        },
        {
          registerAccount,
          signIn: (email, password) => signIn(email, password),
          registerTenant: async (input) => {
            const membership = await registerTenant(input);
            if (!membership) {
              throw new Error("The hospital registration response was empty.");
            }
            return membership;
          },
        },
        progress,
      );

      setProgress(result.progress);
      setTenant(result.tenant);
      setStep("success");
      // The hospital is PENDING and cannot be selected yet. Signing out avoids
      // leaving a credential-only session that looks like a broken workspace.
      await signOut().catch(() => undefined);
    } catch (error) {
      if (error instanceof RegistrationStepError) {
        setProgress(error.progress);
        setFailedStage(error.stage);
        setSubmitError(stageErrorMessage(error.stage, error.cause));
        // A duplicate/invalid account cannot be fixed from the hospital form.
        // Return to the account step so the user can edit or sign in instead.
        if (error.stage === "account") setStep("account");
      } else {
        setSubmitError(getApiErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  });

  const retry = () => {
    void submitHospital();
  };

  if (intent === "invitation") {
    return <InvitationUnavailable hasToken={Boolean(searchParams.get("token"))} />;
  }

  if (step === "success" && tenant) {
    return (
      <div className="space-y-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-6" />
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Hospital submitted</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {tenant.tenantName} has been created and is waiting for HospitalOS review.
          </p>
        </div>

        <dl className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-left text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Hospital</dt>
            <dd className="font-medium">{tenant.tenantName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Workspace slug</dt>
            <dd className="font-medium">{tenant.tenantSlug}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{tenant.tenantStatus}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Your role</dt>
            <dd className="font-medium">Hospital administrator (after activation)</dd>
          </div>
        </dl>

        <Alert className="text-left">
          <ShieldCheck className="size-4 text-primary" />
          <AlertTitle>What happens next</AlertTitle>
          <AlertDescription>
            A HospitalOS administrator must activate the hospital before it can be
            used. Activation notifications are not available in this build yet.
            Once it is active, sign in with the same email and password.
          </AlertDescription>
        </Alert>

        <p className="text-xs text-muted-foreground">
          Keep your workspace slug for support. Sign in with the same email and
          password once the hospital is active.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button nativeButton={false} render={<Link href="/login" />}>
            Go to sign in
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  if (step === "account") {
    return (
      <div className="space-y-5">
        <StepIndicator current={1} />
        <div>
          <h2 className="text-lg font-semibold">Create your account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This account will become the first hospital administrator. No role can
            be chosen here; the backend assigns the tenant-scoped role.
          </p>
        </div>

        {submitError && failedStage === "account" ? (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Could not create the account</AlertTitle>
            <AlertDescription>
              {submitError}{" "}
              <Link href="/login" className="font-medium underline underline-offset-3">
                Sign in instead
              </Link>
            </AlertDescription>
          </Alert>
        ) : null}

        <form className="space-y-4" onSubmit={continueToHospital} noValidate>
          <FormField
            id="register-full-name"
            label="Full name"
            required
            error={accountForm.formState.errors.fullName?.message}
          >
            <Input
              id="register-full-name"
              autoComplete="name"
              {...accountForm.register("fullName")}
            />
          </FormField>

          <FormField
            id="register-email"
            label="Work email"
            required
            error={accountForm.formState.errors.email?.message}
          >
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="you@hospital.com"
              {...accountForm.register("email")}
            />
          </FormField>

          <FormField
            id="register-phone"
            label="Phone (optional)"
            error={accountForm.formState.errors.phone?.message}
          >
            <Input
              id="register-phone"
              type="tel"
              autoComplete="tel"
              {...accountForm.register("phone")}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="register-password"
              label="Password"
              required
              error={accountForm.formState.errors.password?.message}
            >
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                {...accountForm.register("password")}
              />
            </FormField>
            <FormField
              id="register-confirm-password"
              label="Confirm password"
              required
              error={accountForm.formState.errors.confirmPassword?.message}
            >
              <Input
                id="register-confirm-password"
                type="password"
                autoComplete="new-password"
                {...accountForm.register("confirmPassword")}
              />
            </FormField>
          </div>
          <p className="text-xs text-muted-foreground">
            Use at least 12 characters (and no more than 72 UTF-8 bytes, the backend
            limit).
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("choose");
                setSubmitError(null);
              }}
            >
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button type="submit">Continue to hospital details</Button>
          </div>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  if (step === "hospital") {
    return (
      <div className="space-y-5">
        <StepIndicator current={2} />
        <div>
          <h2 className="text-lg font-semibold">Hospital details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The hospital is created in PENDING status and reviewed by HospitalOS
            before it becomes available to staff.
          </p>
        </div>

        {submitError ? (
          <Alert variant="destructive" role="alert">
            <AlertTitle>
              {failedStage === "hospital"
                ? "Hospital registration did not complete"
                : "Registration did not complete"}
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{submitError}</p>
              {failedStage === "hospital" || failedStage === "sign-in" ? (
                <p className="text-xs">
                  Your account already exists. Retrying will not create it again.
                </p>
              ) : null}
              <Button type="button" size="sm" variant="outline" onClick={retry}>
                {failedStage === "hospital" ? "Retry hospital registration" : "Retry"}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <form className="space-y-4" onSubmit={submitHospital} noValidate>
          <FormField
            id="hospital-name"
            label="Hospital name"
            required
            error={hospitalForm.formState.errors.name?.message}
          >
            <Input
              id="hospital-name"
              autoComplete="organization"
              placeholder="Riverside Care Hospital"
              {...hospitalForm.register("name")}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="hospital-slug"
              label="Workspace slug (optional)"
              error={hospitalForm.formState.errors.slug?.message}
            >
              <Input
                id="hospital-slug"
                placeholder="riverside-care"
                {...hospitalForm.register("slug")}
              />
            </FormField>
            <FormField
              id="hospital-legal-name"
              label="Legal name (optional)"
              error={hospitalForm.formState.errors.legalName?.message}
            >
              <Input id="hospital-legal-name" {...hospitalForm.register("legalName")} />
            </FormField>
          </div>
          <p className="text-xs text-muted-foreground">
            Lowercase letters, numbers and hyphens only. Leave blank to generate one
            from the hospital name.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="hospital-email"
              label="Hospital email (optional)"
              error={hospitalForm.formState.errors.email?.message}
            >
              <Input
                id="hospital-email"
                type="email"
                {...hospitalForm.register("email")}
              />
            </FormField>
            <FormField
              id="hospital-phone"
              label="Hospital phone (optional)"
              error={hospitalForm.formState.errors.phone?.message}
            >
              <Input id="hospital-phone" type="tel" {...hospitalForm.register("phone")} />
            </FormField>
          </div>

          <FormField
            id="hospital-timezone"
            label="Timezone"
            required
            error={hospitalForm.formState.errors.timezone?.message}
          >
            <Select
              value={timezone}
              items={timezones.map((timezone) => ({ value: timezone, label: timezone }))}
              onValueChange={(value) => {
                if (value) {
                  hospitalForm.setValue("timezone", value, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger id="hospital-timezone" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((timezone) => (
                  <SelectItem key={timezone} value={timezone}>
                    {timezone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("account");
                setSubmitError(null);
                setFailedStage(null);
                if (accountValues) accountForm.reset(accountValues);
              }}
              disabled={submitting}
            >
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle className="animate-spin" /> : null}
              {submitting ? "Submitting..." : "Submit hospital registration"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">How would you like to start?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Register a new hospital workspace or use the invitation link from your
          hospital administrator.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setIntent("hospital");
            setStep("account");
          }}
          className="group rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </span>
          <span className="mt-4 block font-semibold">Create a hospital</span>
          <span className="mt-1 block text-sm text-muted-foreground">
            Set up a new hospital workspace. You become its first administrator
            after HospitalOS approval.
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIntent("invitation")}
          className="group rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <Mail className="size-5" />
          </span>
          <span className="mt-4 block font-semibold">Accept an invitation</span>
          <span className="mt-1 block text-sm text-muted-foreground">
            Join an existing hospital with a link from its administrator.
          </span>
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function StepIndicator({ current }: { current: 1 | 2 }) {
  const steps = ["Account", "Hospital", "Approval"] as const;

  return (
    <ol className="grid grid-cols-3 gap-2 text-xs" aria-label="Registration progress">
      {steps.map((label, index) => {
        const number = index + 1;
        const state = number < current ? "done" : number === current ? "current" : "next";

        return (
          <li
            key={label}
            aria-current={state === "current" ? "step" : undefined}
            className="flex items-center gap-2 rounded-md border px-2 py-1.5"
          >
            <span
              className={
                state === "current"
                  ? "flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
                  : state === "done"
                    ? "flex size-5 items-center justify-center rounded-full bg-primary/15 text-primary"
                    : "flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground"
              }
            >
              {state === "done" ? <CheckCircle2 className="size-3.5" /> : number}
            </span>
            <span className={state === "next" ? "text-muted-foreground" : "font-medium"}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
