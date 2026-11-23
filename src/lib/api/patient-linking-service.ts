import { apiRequest } from "@/lib/api/client";
import type {
  PatientLinkAcceptanceResult,
  PatientLinkInvitation,
  PatientLinkInvitationDetails,
  PatientLinkingPanel,
} from "@/types/patient-linking";

export async function getPatientLinkingPanel(
  patientId: string,
): Promise<PatientLinkingPanel> {
  const response = await apiRequest<{ linking: PatientLinkingPanel }>({
    method: "GET",
    url: `/patients/${encodeURIComponent(patientId)}/linking-invitations`,
  });

  return response.data.linking;
}

export async function sendPatientLinkInvitation(
  patientId: string,
  email?: string,
): Promise<PatientLinkInvitation> {
  const response = await apiRequest<{ invitation: PatientLinkInvitation }>({
    method: "POST",
    url: `/patients/${encodeURIComponent(patientId)}/linking-invitations`,
    data: email ? { email } : {},
  });

  return response.data.invitation;
}

export async function revokePatientLinkInvitation(
  patientId: string,
  invitationId: string,
): Promise<void> {
  await apiRequest<never>({
    method: "POST",
    url: `/patients/${encodeURIComponent(patientId)}/linking-invitations/${encodeURIComponent(invitationId)}/revoke`,
  });
}

export async function getPatientLinkInvitationDetails(
  token: string,
): Promise<PatientLinkInvitationDetails> {
  const response = await apiRequest<{ invitation: PatientLinkInvitationDetails }>({
    method: "GET",
    url: "/portal/link-invitations/details",
    params: { token },
  });

  return response.data.invitation;
}

export async function acceptPatientLinkInvitation(
  token: string,
): Promise<PatientLinkAcceptanceResult> {
  const response = await apiRequest<PatientLinkAcceptanceResult>({
    method: "POST",
    url: "/portal/link-invitations/accept",
    data: { token },
  });

  return response.data;
}
