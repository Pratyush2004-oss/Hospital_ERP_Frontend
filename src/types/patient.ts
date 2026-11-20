export type PatientStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED" | "DECEASED";
export type PatientGender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
export type PatientBloodGroup = "A_POSITIVE" | "A_NEGATIVE" | "B_POSITIVE" | "B_NEGATIVE" | "AB_POSITIVE" | "AB_NEGATIVE" | "O_POSITIVE" | "O_NEGATIVE";
export type PatientMaritalStatus = "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | "OTHER";
export type PatientContactType = "MOBILE" | "HOME" | "WORK" | "GUARDIAN" | "OTHER";
export type PatientAddressType = "HOME" | "WORK" | "OTHER";

export type PatientContact = { id: string; contactType: PatientContactType; phone: string | null; email: string | null; isPrimary: boolean; isVerified: boolean; createdAt: string; updatedAt: string };
export type PatientAddress = { id: string; addressType: PatientAddressType; addressLine1: string; addressLine2: string | null; city: string | null; state: string | null; postalCode: string | null; country: string | null; isPrimary: boolean; createdAt: string; updatedAt: string };
export type PatientEmergencyContact = { id: string; name: string; relationship: string; phone: string; email: string | null; createdAt: string; updatedAt: string };

export type PatientSummary = { id: string; patientCode: string; fullName: string; dateOfBirth: string | null; gender: PatientGender; bloodGroup: PatientBloodGroup | null; status: PatientStatus; accountLinked: boolean; createdAt: string; updatedAt: string };
export type Patient = PatientSummary & {
  maritalStatus: PatientMaritalStatus | null;
  profileImageKey: string | null;
  user: { id: string; fullName: string; isActive: boolean } | null;
  contacts: PatientContact[];
  addresses: PatientAddress[];
  emergencyContacts: PatientEmergencyContact[];
};

export type PatientInput = {
  fullName: string;
  dateOfBirth?: string | null;
  gender?: PatientGender;
  bloodGroup?: PatientBloodGroup | null;
  maritalStatus?: PatientMaritalStatus | null;
  profileImageKey?: string | null;
  contacts?: Array<{ contactType?: PatientContactType; phone?: string | null; email?: string | null; isPrimary?: boolean }>;
  addresses?: Array<{ addressType?: PatientAddressType; addressLine1: string; addressLine2?: string | null; city?: string | null; state?: string | null; postalCode?: string | null; country?: string | null; isPrimary?: boolean }>;
  emergencyContacts?: Array<{ name: string; relationship: string; phone: string; email?: string | null }>;
};

export type PatientUpdateInput = Omit<PatientInput, "contacts" | "addresses" | "emergencyContacts">;
