import { AppointmentDetails } from "@/components/management/appointment-details";

export const instant = false;

export default async function AppointmentDetailsPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  return <AppointmentDetails appointmentId={appointmentId} />;
}
