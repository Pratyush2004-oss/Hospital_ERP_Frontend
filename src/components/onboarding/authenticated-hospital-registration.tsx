"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { registerTenant } from "@/lib/api/management-service";
import {
  getApiErrorStatus,
  onboardingStatusPath,
} from "@/lib/onboarding/registration-flow";
import {
  toHospitalRegistrationPayload,
  type HospitalProfileValues,
} from "@/lib/validations/onboarding";
import { Button } from "@/components/ui/button";
import { HospitalRegistrationWizard } from "./hospital-registration-wizard";

export function AuthenticatedHospitalRegistration() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const submissionLock = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateSlug, setDuplicateSlug] = useState(false);

  async function submit(values: HospitalProfileValues) {
    if (submissionLock.current) return;
    submissionLock.current = true;
    setSubmitting(true);
    setError(null);
    setDuplicateSlug(false);

    try {
      const membership = await registerTenant(toHospitalRegistrationPayload(values));
      if (!membership) {
        throw new Error("The hospital registration response was empty.");
      }

      await queryClient.invalidateQueries({ queryKey: ["tenant-onboarding"] });
      await queryClient.invalidateQueries({ queryKey: ["tenant-memberships"] });
      router.replace(onboardingStatusPath({ submitted: true }));
    } catch (cause) {
      const conflict = getApiErrorStatus(cause) === 409;
      setDuplicateSlug(conflict);
      setError(
        conflict
          ? "That workspace URL is already in use. Choose a different slug and submit again."
          : getApiErrorMessage(
              cause,
              "The hospital registration could not be completed. Please try again.",
            ),
      );
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          You are signed in. The founding administrator role is assigned by HospitalOS
          after approval; it cannot be chosen here.
        </p>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/hospitals" />}
        >
          <ArrowLeft className="size-4" /> Hospitals
        </Button>
      </div>

      <HospitalRegistrationWizard
        submitting={submitting}
        error={error}
        duplicateSlug={duplicateSlug}
        onSubmit={submit}
      />
    </div>
  );
}
