import { Suspense } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { OnboardingStatus } from "@/components/onboarding/onboarding-status";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { LoadingState } from "@/components/shared/states";

export default function OnboardingStatusPage() {
  return (
    <AuthGate>
      <OnboardingShell
        title="Onboarding status"
        description="Follow your hospital registration through review and activation."
        widthClassName="max-w-3xl"
      >
        <Suspense fallback={<LoadingState label="Loading registration status..." />}>
          <OnboardingStatus />
        </Suspense>
      </OnboardingShell>
    </AuthGate>
  );
}
