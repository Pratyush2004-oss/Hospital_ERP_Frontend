import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "./auth-store";
import * as authService from "@/lib/auth/auth-service";

vi.mock("@/lib/auth/auth-service", () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));

const session = {
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
  plane: "tenant" as const,
  activeTenant: { id: "tenant-1", slug: "riverside", roles: ["admin"], permissions: ["patients:read"] },
};

describe("auth store", () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null, status: "loading", initialized: false });
    vi.clearAllMocks();
  });

  it("initializes an authenticated session from the current-user endpoint", async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(session);

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().session?.user.email).toBe("ada@example.test");
  });

  it("clears state when session initialization is unauthorized", async () => {
    vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error("UNAUTHORIZED"));

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().session).toBeNull();
  });

  it("clears the session after logout even if the request fails", async () => {
    useAuthStore.setState({ session, status: "authenticated", initialized: true });
    vi.mocked(authService.logout).mockRejectedValue(new Error("network"));

    await expect(useAuthStore.getState().signOut()).rejects.toThrow("network");

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().session).toBeNull();
  });
});
