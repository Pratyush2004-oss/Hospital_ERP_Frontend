import { AuthCard } from "@/components/auth/auth-card";
import { ReactivateAccountForm } from "@/components/auth/reactivate-account-form";

export default function ReactivateAccountPage() {
  return (
    <AuthCard
      title="Reactivate your account"
      description="Restore sign-in access with your account password."
    >
      <ReactivateAccountForm />
    </AuthCard>
  );
}
