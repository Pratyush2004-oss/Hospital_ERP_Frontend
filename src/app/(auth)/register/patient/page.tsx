import { AuthCard } from "@/components/auth/auth-card";
import { PatientRegisterForm } from "@/components/auth/patient-register-form";

export default function PatientRegisterPage() {
  return (
    <AuthCard
      title="Patient registration"
      description="Create a patient portal login and link it to your hospital profile."
      widthClassName="max-w-xl"
    >
      <PatientRegisterForm />
    </AuthCard>
  );
}
