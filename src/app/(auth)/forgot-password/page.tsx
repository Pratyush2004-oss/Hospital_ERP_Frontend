import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return <AuthCard title="Forgot your password?" description="Enter your email or phone number to request reset instructions."><ForgotPasswordForm /></AuthCard>;
}
