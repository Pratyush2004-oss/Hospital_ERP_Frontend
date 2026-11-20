import { PatientDetails } from "@/components/management/patient-details";

export const instant = false;

export default async function PatientDetailsPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  return <PatientDetails patientId={patientId} />;
}
