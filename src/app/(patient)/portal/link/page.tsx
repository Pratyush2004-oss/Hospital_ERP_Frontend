import { AuthCard } from "@/components/auth/auth-card";
import { PatientLinkAcceptance } from "@/components/patient/patient-link-acceptance";

export default async function PatientLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : null;

  return (
    <AuthCard
      title="Link your patient record"
      description="Securely connect your hospital patient profile to your HospitalOS account."
      widthClassName="max-w-xl"
    >
      <PatientLinkAcceptance token={token} />
    </AuthCard>
  );
}
