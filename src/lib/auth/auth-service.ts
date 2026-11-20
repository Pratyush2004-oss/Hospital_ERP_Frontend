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

export type AuthSessionInfo = { id: string; userAgent: string | null; ipAddress: string | null; createdAt: string; lastUsedAt: string | null; current: boolean };
export async function listSessions(): Promise<AuthSessionInfo[]> {
  const response = await apiRequest<{ sessions: AuthSessionInfo[] }>({ method: "GET", url: "/auth/sessions" });
  return response.data.sessions;
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
