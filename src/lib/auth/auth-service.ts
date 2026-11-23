import { apiRequest } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import type { AuthSession, CurrentUserResponse } from "@/types/auth";

type LoginInput = {
  identifier: string;
  password: string;
};

export type RegisterAccountInput = {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
};

type AuthMutationResponse = {
  user: CurrentUserResponse["user"];
  csrfToken: string;
};

function toSession(response: CurrentUserResponse): AuthSession {
  return {
    user: response.user,
    sessionId: response.sessionId,
    plane: response.plane,
    activeTenant: response.activeTenant,
  };
}

export async function registerAccount(input: RegisterAccountInput): Promise<CurrentUserResponse["user"]> {
  const response = await apiRequest<{ user: CurrentUserResponse["user"] }>({
    method: "POST",
    url: "/auth/register",
    data: input,
  });

  return response.data.user;
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const response = await apiRequest<AuthMutationResponse>({
    method: "POST",
    url: "/auth/login",
    data: input,
  });

  return { user: response.data.user };
}

export async function getCurrentUser(): Promise<AuthSession> {
  const response = await apiRequest<CurrentUserResponse>({
    method: "GET",
    url: "/auth/me",
  });

  return toSession(response.data);
}

export async function logout(): Promise<void> {
  await apiRequest<never>({
    method: "POST",
    url: "/auth/logout",
  });
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<string> {
  const response = await apiRequest<{ message: string }>({ method: "POST", url: "/auth/change-password", data: input });
  return response.data.message;
}

export type OwnProfileInput = {
  fullName?: string;
  phone?: string | null;
};

export async function updateOwnProfile(
  input: OwnProfileInput,
): Promise<CurrentUserResponse["user"]> {
  const response = await apiRequest<{ user: CurrentUserResponse["user"] }>({
    method: "PATCH",
    url: "/auth/me",
    data: input,
  });
  return response.data.user;
}

export async function requestEmailChange(input: {
  newEmail: string;
  currentPassword: string;
}): Promise<{ status: string; expiresAt: string }> {
  const response = await apiRequest<{ status: string; expiresAt: string }>({
    method: "POST",
    url: "/auth/email/change",
    data: input,
  });
  return response.data;
}

export async function verifyEmailChange(token: string): Promise<string> {
  const response = await apiRequest<{ email: string; message: string }>({
    method: "POST",
    url: "/auth/email/change/verify",
    data: { token },
  });
  return response.data.message;
}

export async function deactivateAccount(currentPassword: string): Promise<string> {
  const response = await apiRequest<{ message: string }>({
    method: "POST",
    url: "/auth/account/deactivate",
    data: { currentPassword },
  });
  return response.data.message;
}

export async function reactivateAccount(input: {
  identifier: string;
  password: string;
}): Promise<void> {
  await apiRequest<{ user: CurrentUserResponse["user"] }>({
    method: "POST",
    url: "/auth/account/reactivate",
    data: input,
  });
}

export type AuthSessionInfo = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  isCurrent: boolean;
};

export async function listSessions(): Promise<AuthSessionInfo[]> {
  const response = await apiRequest<{ sessions: AuthSessionInfo[] }>({ method: "GET", url: "/auth/sessions" });
  return response.data.sessions;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await apiRequest<never>({ method: "DELETE", url: `/auth/sessions/${sessionId}` });
}

export async function resendEmailVerification(): Promise<{ status: string; retryAfterSeconds?: number }> {
  const response = await apiRequest<{ status: string; retryAfterSeconds?: number }>({
    method: "POST",
    url: "/auth/email/resend",
  });

  return response.data;
}

export async function verifyEmail(token: string): Promise<boolean> {
  const response = await apiRequest<{ alreadyVerified: boolean }>({
    method: "POST",
    url: "/auth/email/verify",
    data: { token },
  });

  return response.data.alreadyVerified;
}

export type InvitationStatus =
  | "INVITED"
  | "ACCEPTED"
  | "EXPIRED"
  | "REVOKED"
  | "INVALID";

export type InvitationDetails = {
  valid: boolean;
  status: InvitationStatus;
  hospitalName: string | null;
  email: string | null;
  fullName: string | null;
  expiresAt: string | null;
  requiresPassword: boolean;
  roles: { slug: string; name: string }[];
  departments: { name: string }[];
  branches: { name: string }[];
};

export type AcceptInvitationResult = {
  tenantId: string;
  membershipId: string;
  accountCreated: boolean;
};

export async function getInvitationDetails(token: string): Promise<InvitationDetails> {
  const response = await apiRequest<{ invitation: InvitationDetails }>({
    method: "POST",
    url: "/auth/invitations/details",
    data: { token },
  });

  return response.data.invitation;
}

export async function acceptInvitation(
  token: string,
  input: { fullName?: string; password?: string },
): Promise<AcceptInvitationResult> {
  const response = await apiRequest<AcceptInvitationResult>({
    method: "POST",
    url: "/auth/invitations/accept",
    data: { token, ...input },
  });

  return response.data;
}

export async function requestPasswordReset(identifier: string): Promise<string> {
  const response = await apiRequest<{ message: string; resetToken?: string }>({
    method: "POST",
    url: "/auth/forgot-password",
    data: { identifier },
  });

  return response.data.message;
}

export async function resetPassword(token: string, password: string): Promise<string> {
  const response = await apiRequest<{ message: string }>({
    method: "POST",
    url: "/auth/reset-password",
    data: { token, password },
  });

  return response.data.message;
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: ApiResponse<unknown> & { error?: { message?: string } } } }).response;
    const message = response?.data?.error?.message;
    if (typeof message === "string") return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
