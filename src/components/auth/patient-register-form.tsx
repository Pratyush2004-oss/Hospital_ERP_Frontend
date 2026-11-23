"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { registerPatientAccount } from "@/lib/api/patient-portal-service";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const patientRegistrationSchema = z
  .object({
    hospitalSlug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Hospital code is required.")
      .max(100, "Hospital code is too long.")
      .regex(TENANT_SLUG_PATTERN, "Use the hospital code, for example riverside-care."),
    fullName: z
      .string()
      .trim()
      .min(1, "Full name is required.")
      .max(200, "Full name must be at most 200 characters."),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
    phone: z
      .string()
      .trim()
      .max(20, "Phone must be at most 20 characters.")
      .regex(/^\+?[0-9][0-9\s().-]{5,30}$/, "Enter a valid phone number.")
      .optional()
      .or(z.literal("")),
    dateOfBirth: z.string().trim().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER", "UNKNOWN"]),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters.")
      .max(128, "Password must be at most 128 characters.")
      .refine((value) => new TextEncoder().encode(value).length <= 72, {
        message: "Password must be at most 72 bytes.",
      }),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type PatientRegistrationValues = z.infer<typeof patientRegistrationSchema>;

class PatientRegistrationError extends Error {
  constructor(
    message: string,
    readonly reason: string | undefined,
  ) {
    super(message);
  }
}

export function PatientRegisterForm() {
  return (
    <Suspense fallback={<div className="h-72" />}>
      <PatientRegisterFormContent />
    </Suspense>
  );
}

function PatientRegisterFormContent() {
  const searchParams = useSearchParams();
  const hospital = searchParams.get("hospital")?.trim().toLowerCase() ?? "";
  const form = useForm<PatientRegistrationValues>({
    resolver: zodResolver(patientRegistrationSchema),
    defaultValues: {
      hospitalSlug: hospital,
      fullName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      gender: "UNKNOWN",
      password: "",
      confirmPassword: "",
    },
  });
  const gender = form.watch("gender");
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await registerPatientAccount({
        hospitalSlug: values.hospitalSlug,
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        phone: values.phone?.trim() ? values.phone : null,
        dateOfBirth: values.dateOfBirth?.trim() ? values.dateOfBirth : null,
        gender: values.gender,
      });
      setSuccess(result.user.email);
    } catch (error) {
      const reason = readErrorReason(error);
      form.setError("root", {
        message: patientErrorMessage(getApiErrorMessage(error), reason),
      });
    }
  });

  if (success !== null) {
    return (
      <div className="space-y-5 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Check your email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We created your patient profile and sent a verification link to{" "}
            <span className="font-medium text-foreground">{success}</span>.
          </p>
        </div>
        <Alert className="text-left">
          <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
          <AlertTitle>Verify before you sign in to the portal</AlertTitle>
          <AlertDescription>
            Patient portal access stays locked until your email address is verified.
            After verifying, sign in with the same email and password.
          </AlertDescription>
        </Alert>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button nativeButton={false} render={<Link href="/login?next=%2Fportal" />}>
            Go to patient sign in
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/register/patient" />}
          >
            Register another patient
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      {form.formState.errors.root?.message ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>We could not create your patient profile</AlertTitle>
          <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
        </Alert>
      ) : null}

      <FormField
        id="patient-hospital"
        label="Hospital code"
        required
        error={form.formState.errors.hospitalSlug?.message}
      >
        <Input
          id="patient-hospital"
          autoComplete="organization"
          placeholder="riverside-care"
          aria-invalid={Boolean(form.formState.errors.hospitalSlug)}
          {...form.register("hospitalSlug")}
        />
      </FormField>
      <p className="-mt-3 text-xs text-muted-foreground">
        Ask the hospital reception for its HospitalOS code, or use the link they
        shared. Only active hospitals accept patient registrations.
      </p>

      <FormField
        id="patient-full-name"
        label="Full name"
        required
        error={form.formState.errors.fullName?.message}
      >
        <Input
          id="patient-full-name"
          autoComplete="name"
          aria-invalid={Boolean(form.formState.errors.fullName)}
          {...form.register("fullName")}
        />
      </FormField>

      <FormField
        id="patient-email"
        label="Email address"
        required
        error={form.formState.errors.email?.message}
      >
        <Input
          id="patient-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(form.formState.errors.email)}
          {...form.register("email")}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="patient-phone"
          label="Phone (optional)"
          error={form.formState.errors.phone?.message}
        >
          <Input
            id="patient-phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(form.formState.errors.phone)}
            {...form.register("phone")}
          />
        </FormField>
        <FormField
          id="patient-date-of-birth"
          label="Date of birth (optional)"
          error={form.formState.errors.dateOfBirth?.message}
        >
          <Input
            id="patient-date-of-birth"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            {...form.register("dateOfBirth")}
          />
        </FormField>
      </div>

      <FormField id="patient-gender" label="Gender">
        <Select
          value={gender}
          onValueChange={(value) => {
            if (value) form.setValue("gender", value as PatientRegistrationValues["gender"]);
          }}
        >
          <SelectTrigger id="patient-gender" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UNKNOWN">Prefer not to say</SelectItem>
            <SelectItem value="FEMALE">Female</SelectItem>
            <SelectItem value="MALE">Male</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="patient-password"
          label="Password"
          required
          error={form.formState.errors.password?.message}
        >
          <Input
            id="patient-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            {...form.register("password")}
          />
        </FormField>
        <FormField
          id="patient-confirm-password"
          label="Confirm password"
          required
          error={form.formState.errors.confirmPassword?.message}
        >
          <Input
            id="patient-confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(form.formState.errors.confirmPassword)}
            {...form.register("confirmPassword")}
          />
        </FormField>
      </div>
      <p className="text-xs text-muted-foreground">
        Use at least 12 characters. Staff roles cannot be requested here; this form
        only creates a patient portal login.
      </p>

      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
        {form.formState.isSubmitting ? "Creating your profile..." : "Create patient account"}
      </Button>

      <div className="space-y-2 border-t pt-4 text-center text-sm text-muted-foreground">
        <p>
          Already have an account?{" "}
          <Link href="/login?next=%2Fportal" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
        <p>
          Forgot your password?{" "}
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">
            Recover access
          </Link>
        </p>
        <p>
          Staff member?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Use the hospital workspace sign in
          </Link>
        </p>
      </div>
    </form>
  );
}

function readErrorReason(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("response" in error)) return undefined;
  const response = (error as { response?: { data?: { error?: { details?: unknown } } } }).response;
  const details = response?.data?.error?.details;

  if (typeof details === "object" && details !== null && "reason" in details) {
    const reason = (details as { reason?: unknown }).reason;
    return typeof reason === "string" ? reason : undefined;
  }

  return undefined;
}

function patientErrorMessage(message: string, reason: string | undefined): string {
  switch (reason) {
    case "ACCOUNT_EXISTS":
      return "An account with this email or phone number already exists. Sign in, then add this hospital from your patient portal.";
    case "POTENTIAL_PATIENT_MATCH":
      return "A patient record may already exist at this hospital. Contact the hospital reception to link your existing record; do not create a second profile.";
    case "PATIENT_ALREADY_LINKED":
      return "Your account is already linked to a patient profile at this hospital.";
    default:
      return message;
  }
}
