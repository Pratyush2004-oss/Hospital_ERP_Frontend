import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailChangeForm } from "@/components/auth/verify-email-change-form";

export default function VerifyEmailChangePage() {
  return (
    <AuthCard
      title="Confirm your new email"
      description="Verify the new address before it becomes your HospitalOS sign-in email."
    >
      <VerifyEmailChangeForm />
    </AuthCard>
  );
}
