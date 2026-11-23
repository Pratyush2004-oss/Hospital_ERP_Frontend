import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/client";
import { acceptInvitation, changePassword, getApiErrorMessage, getCurrentUser, getInvitationDetails, listSessions, login, logout, registerAccount, revokeSession } from "./auth-service";

vi.mock("@/lib/api/client", () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

describe("auth service", () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it("maps a successful cookie-based login response", async () => {
    mockedApiRequest.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          fullName: "Ada Lovelace",
          email: "ada@example.test",
          phone: null,
          isActive: true,
          emailVerifiedAt: null,
          phoneVerifiedAt: null,
          lastLoginAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        csrfToken: "csrf-token",
      },
    });

    const session = await login({ identifier: "ada@example.test", password: "correct" });

    expect(session.user.email).toBe("ada@example.test");
    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "POST",
      url: "/auth/login",
      data: { identifier: "ada@example.test", password: "correct" },
    });
  });

  it("maps the backend current-user response including authorization context", async () => {
    mockedApiRequest.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          fullName: "Ada Lovelace",
          email: "ada@example.test",
          phone: null,
          isActive: true,
          emailVerifiedAt: null,
          phoneVerifiedAt: null,
          lastLoginAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        sessionId: "session-1",
        plane: "tenant",
        activeTenant: { id: "tenant-1", slug: "riverside", roles: ["admin"], permissions: ["patients:read"] },
      },
    });

    const session = await getCurrentUser();

    expect(session.activeTenant?.permissions).toEqual(["patients:read"]);
    expect(session.sessionId).toBe("session-1");
  });

  it("uses the backend account-registration contract without requesting a session", async () => {
    mockedApiRequest.mockResolvedValue({
      data: {
        user: {
          id: "user-2",
          fullName: "Grace Hopper",
          email: "grace@example.test",
          phone: null,
          isActive: true,
          emailVerifiedAt: null,
          phoneVerifiedAt: null,
          lastLoginAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      },
    });

    const user = await registerAccount({
      fullName: "Grace Hopper",
      email: "grace@example.test",
      password: "correct-horse-battery",
    });

    expect(user.id).toBe("user-2");
    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "POST",
      url: "/auth/register",
      data: {
        fullName: "Grace Hopper",
        email: "grace@example.test",
        password: "correct-horse-battery",
      },
    });
  });

  it("calls logout without sending credentials to browser storage", async () => {
    mockedApiRequest.mockResolvedValue({ data: undefined });

    await logout();

    expect(mockedApiRequest).toHaveBeenCalledWith({ method: "POST", url: "/auth/logout" });
  });

  it("uses the backend session isCurrent flag and revocation endpoint", async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: {
        sessions: [
          {
            id: "session-1",
            userAgent: "Browser",
            ipAddress: "127.0.0.1",
            createdAt: "2026-01-01T00:00:00.000Z",
            lastUsedAt: "2026-01-01T00:00:00.000Z",
            expiresAt: "2026-02-01T00:00:00.000Z",
            isCurrent: true,
          },
        ],
      },
    }).mockResolvedValueOnce({ data: undefined });

    const sessions = await listSessions();
    expect(sessions[0]?.isCurrent).toBe(true);

    await revokeSession("session-2");
    expect(mockedApiRequest).toHaveBeenLastCalledWith({
      method: "DELETE",
      url: "/auth/sessions/session-2",
    });
  });

  it("extracts standardized backend error messages", () => {
    expect(getApiErrorMessage({ response: { data: { error: { message: "Invalid email, phone number or password" } } } })).toBe("Invalid email, phone number or password");
  });

  it("uses the backend password-change and session contracts", async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: { message: "Password changed." } }).mockResolvedValueOnce({ data: { sessions: [] } });
    await expect(changePassword({ currentPassword: "old", newPassword: "new" })).resolves.toBe("Password changed.");
    await expect(listSessions()).resolves.toEqual([]);
    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, { method: "POST", url: "/auth/change-password", data: { currentPassword: "old", newPassword: "new" } });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, { method: "GET", url: "/auth/sessions" });
  });

  it("inspects an invitation without revealing the raw token", async () => {
    mockedApiRequest.mockResolvedValue({
      data: {
        invitation: {
          valid: true,
          status: "INVITED",
          hospitalName: "Riverside Care",
          email: "a***@example.test",
          fullName: "Ada",
          expiresAt: "2026-12-01T00:00:00.000Z",
          requiresPassword: false,
          roles: [{ slug: "doctor", name: "Doctor" }],
          departments: [],
          branches: [{ name: "Main Branch" }],
        },
      },
    });

    const invitation = await getInvitationDetails("single-use-token-value");

    expect(invitation.hospitalName).toBe("Riverside Care");
    expect(invitation.email).toBe("a***@example.test");
    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "POST",
      url: "/auth/invitations/details",
      data: { token: "single-use-token-value" },
    });
  });

  it("accepts an invitation for a new account and returns the membership", async () => {
    mockedApiRequest.mockResolvedValue({
      data: { tenantId: "tenant-1", membershipId: "membership-1", accountCreated: true },
    });

    const result = await acceptInvitation("single-use-token-value", {
      fullName: "Ada Lovelace",
      password: "correct-horse-battery",
    });

    expect(result.accountCreated).toBe(true);
    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "POST",
      url: "/auth/invitations/accept",
      data: {
        token: "single-use-token-value",
        fullName: "Ada Lovelace",
        password: "correct-horse-battery",
      },
    });
  });
});
