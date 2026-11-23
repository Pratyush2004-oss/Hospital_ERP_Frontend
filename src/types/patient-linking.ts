import type { Patient } from "@/types/patient";

export type PatientLinkInvitationStatus =
  | "INVITED"
  | "EXPIRED"
  | "REVOKED"
  | "ACCEPTED";

export type PatientLinkInvitation = {
  id: string;
  email: string;
  status: PatientLinkInvitationStatus;
  createdAt: string;
  expiresAt: string;
  invitedByName: string | null;
};

export type PatientLinkingPanel = {
  patientId: string;
  patientCode: string;
  patientName: string;
  accountLinked: boolean;
  invitationEmails: string[];
  invitations: PatientLinkInvitation[];
};

export type PatientLinkInvitationDetails = {
  valid: boolean;
  status: PatientLinkInvitationStatus | "INVALID";
  hospitalName: string | null;
  hospitalSlug: string | null;
  email: string | null;
  patientName: string | null;
  expiresAt: string | null;
  requiresAccount: boolean;
  requiresEmailVerification: boolean;
};

export type PatientLinkAcceptanceResult = {
  patient: Patient;
  hospitalName: string;
  hospitalSlug: string;
  alreadyLinked: boolean;
};
