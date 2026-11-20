import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return <AuthCard title="Reset password" description="Choose a new password for your HospitalOS account."><ResetPasswordForm /></AuthCard>;
}
