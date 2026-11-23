import { AuthGate } from "@/components/auth/auth-gate";
import { PatientPortal } from "@/components/patient/patient-portal";

export default function PatientPortalPage() {
  return (
    <AuthGate>
      <PatientPortal />
    </AuthGate>
  );
}
