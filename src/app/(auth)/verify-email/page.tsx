import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Verify your email"
      description="Confirm your email address to unlock your patient portal."
    >
      <VerifyEmailForm />
    </AuthCard>
  );
}
