"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, MailWarning } from "lucide-react";
import { getApiErrorMessage, verifyEmail } from "@/lib/auth/auth-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function VerifyEmailForm() {
  return (
    <Suspense fallback={<div className="h-48" />}>
      <VerifyEmailFormContent />
    </Suspense>
  );
}

function VerifyEmailFormContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [state, setState] = useState<"idle" | "verifying" | "verified" | "error">(
    token ? "verifying" : "error",
  );
  const [message, setMessage] = useState(
    token ? "" : "This verification link is missing its token. Request a new email link after signing in.",
  );

  useEffect(() => {
    if (!token) return;

    let active = true;

    void (async () => {
      try {
        const alreadyVerified = await verifyEmail(token);
        if (!active) return;
        setState("verified");
        setMessage(
          alreadyVerified
            ? "This email address was already verified. You can sign in to the patient portal."
            : "Your email address is verified. You can sign in to the patient portal.",
        );
      } catch (error) {
        if (!active) return;
        setState("error");
        setMessage(getApiErrorMessage(error, "This verification link is invalid or expired."));
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  if (state === "verifying") {
    return (
      <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        <span>Verifying your email address...</span>
      </div>
    );
  }

  if (state === "verified") {
    return (
      <div className="space-y-5 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </span>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button nativeButton={false} render={<Link href="/login?next=%2Fportal" />}>
            Sign in to patient portal
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
            Staff sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Alert variant="destructive" role="alert">
        <MailWarning className="size-4" aria-hidden="true" />
        <AlertTitle>Verification did not complete</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <p className="text-sm text-muted-foreground">
        Sign in and request a new verification email from your patient portal, or
        contact the hospital reception if you still cannot access your profile.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button nativeButton={false} render={<Link href="/login?next=%2Fportal" />}>
          Go to sign in
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/register/patient" />}>
          Register as a patient
        </Button>
      </div>
    </div>
  );
}
