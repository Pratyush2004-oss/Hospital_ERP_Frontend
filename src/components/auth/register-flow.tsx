"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, Building2, CheckCircle2, Mail } from "lucide-react";
import { getApiErrorMessage, registerAccount } from "@/lib/auth/auth-service";
import { registerTenant } from "@/lib/api/management-service";
import {
  getApiErrorStatus,
  getRegisterIntent,
  onboardingStatusPath,
  RegistrationStepError,
  submitHospitalRegistration,
  type RegisterIntent,
  type RegistrationProgress,
  type RegistrationStage,
} from "@/lib/onboarding/registration-flow";
import {
  registrationAccountSchema,
  toHospitalRegistrationPayload,
  toRegisterAccountPayload,
  type HospitalProfileValues,
  type RegistrationAccountValues,
} from "@/lib/validations/onboarding";
import { useAuthStore } from "@/stores/auth-store";
import { HospitalRegistrationWizard } from "@/components/onboarding/hospital-registration-wizard";
import { InvitationEntry } from "./invitation-entry";
import { FormField } from "@/components/shared/form-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Step = "choose" | "account" | "hospital";
type FailedStage = RegistrationStage | null;

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const signIn = useAuthStore((state) => state.signIn);
  const submissionLock = useRef(false);

  const [intent, setIntent] = useState<RegisterIntent>(() =>
    getRegisterIntent(searchParams.get("intent")),
  );
  const [step, setStep] = useState<Step>("choose");
  const [accountValues, setAccountValues] = useState<RegistrationAccountValues | null>(null);
  const [hospitalDraft, setHospitalDraft] = useState<Partial<HospitalProfileValues> | null>(null);
  const [progress, setProgress] = useState<Partial<RegistrationProgress>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [failedStage, setFailedStage] = useState<FailedStage>(null);
  const [duplicateSlug, setDuplicateSlug] = useState(false);

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

  const continueToHospital = accountForm.handleSubmit((values) => {
    setAccountValues(values);
    setSubmitError(null);
    setFailedStage(null);
    setDuplicateSlug(false);
    setStep("hospital");
  });

  async function submitHospital(values: HospitalProfileValues) {
    if (!accountValues) {
      setStep("account");
      return;
    }
    if (submissionLock.current) return;
    submissionLock.current = true;

    setSubmitting(true);
    setSubmitError(null);
    setFailedStage(null);
    setDuplicateSlug(false);

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
      router.replace(onboardingStatusPath({ submitted: true }));
    } catch (error) {
      if (error instanceof RegistrationStepError) {
        setProgress(error.progress);
        setFailedStage(error.stage);

        const conflict =
          error.stage === "hospital" && getApiErrorStatus(error.cause) === 409;
        setDuplicateSlug(conflict);
        setSubmitError(
          conflict
            ? "That workspace URL is already in use. Choose a different slug and submit again."
            : stageErrorMessage(error.stage, error.cause),
        );

        // A duplicate/invalid account cannot be fixed from the hospital form.
        // Return to the account step so the user can edit or sign in instead.
        if (error.stage === "account") setStep("account");
      } else {
        setSubmitError(getApiErrorMessage(error));
      }
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  if (intent === "invitation") {
    return <InvitationEntry token={searchParams.get("token")} />;
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
      <HospitalRegistrationWizard
        initialValues={hospitalDraft ?? undefined}
        submitting={submitting}
        error={submitError}
        duplicateSlug={duplicateSlug}
        onDraftChange={setHospitalDraft}
        onBackToAccount={() => {
          setStep("account");
          setSubmitError(null);
          setFailedStage(null);
          setDuplicateSlug(false);
          if (accountValues) accountForm.reset(accountValues);
        }}
        onSubmit={submitHospital}
      />
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
