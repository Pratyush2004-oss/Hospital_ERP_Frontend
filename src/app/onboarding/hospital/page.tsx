import { AuthGate } from "@/components/auth/auth-gate";
import { AuthenticatedHospitalRegistration } from "@/components/onboarding/authenticated-hospital-registration";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

export default function OnboardingHospitalPage() {
  return (
    <AuthGate>
      <OnboardingShell
        title="Register a hospital"
        description="Four short steps. Your registration is reviewed before the workspace is activated."
        widthClassName="max-w-3xl"
      >
        <AuthenticatedHospitalRegistration />
      </OnboardingShell>
    </AuthGate>
  );
}
