"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, MailWarning } from "lucide-react";
import { getApiErrorMessage, verifyEmailChange } from "@/lib/auth/auth-service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function VerifyEmailChangeForm() {
  return (
    <Suspense fallback={<div className="h-48" />}>
      <VerifyEmailChangeContent />
    </Suspense>
  );
}

function VerifyEmailChangeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [state, setState] = useState<"verifying" | "verified" | "error">(
    token ? "verifying" : "error",
  );
  const [message, setMessage] = useState(
    token
      ? ""
      : "This email-change link is missing its token. Request a new link from your profile.",
  );

  useEffect(() => {
    if (!token) return;
    let active = true;

    void (async () => {
      try {
        const result = await verifyEmailChange(token);
        if (!active) return;
        setState("verified");
        setMessage(result);
      } catch (error) {
        if (!active) return;
        setState("error");
        setMessage(getApiErrorMessage(error, "This email-change link is invalid or expired."));
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
        <span>Confirming your new email address...</span>
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
        <Button nativeButton={false} render={<Link href="/login" />}>
          Sign in with your new email
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Alert variant="destructive" role="alert">
        <MailWarning className="size-4" aria-hidden="true" />
        <AlertTitle>Email change did not complete</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>
        Back to sign in
      </Button>
    </div>
  );
}
