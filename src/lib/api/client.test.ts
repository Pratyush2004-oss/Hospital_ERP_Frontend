import { describe, expect, it, vi } from "vitest";

type RecordedRequest = {
  method: string;
  url: string;
  csrfToken: string | null;
};

/**
 * Loads a fresh copy of the API client (module state resets per test) with an
 * adapter that records each outgoing request instead of hitting the network.
 *
 * The suite runs in the `node` environment, where `document` is undefined, so
 * `getCookie("hos_csrf")` always misses. That reproduces the production
 * deployment where the frontend and API are separate sites and the CSRF cookie
 * is sent with requests but not readable from the frontend origin.
 */
async function createClient(routes: Record<string, unknown>) {
  vi.resetModules();
  const { apiClient } = await import("@/lib/api/client");
  const recorded: RecordedRequest[] = [];

  apiClient.defaults.adapter = async (config) => {
    const method = (config.method ?? "get").toUpperCase();
    const url = config.url ?? "";
    const header = config.headers.get("x-csrf-token");

    recorded.push({
      method,
      url,
      csrfToken: typeof header === "string" ? header : null,
    });

    return {
      data: routes[`${method} ${url}`] ?? { data: {} },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };

  return { apiClient, recorded };
}

const CSRF_TOKEN = "csrf-token-from-session";

describe("API client CSRF token fallback", () => {
  it("sends x-csrf-token learned from the login response", async () => {
    const { apiClient, recorded } = await createClient({
      "POST /auth/login": { data: { user: { id: "user-1" }, csrfToken: CSRF_TOKEN } },
      "POST /tenants/select": { data: { activeTenant: null } },
    });

    await apiClient.post("/auth/login", { identifier: "clinician@example.test", password: "secret" });
    await apiClient.post("/tenants/select", { slug: "general-hospital" });

    expect(recorded[1]).toEqual({ method: "POST", url: "/tenants/select", csrfToken: CSRF_TOKEN });
  });

  it("re-hydrates the token from GET /auth/me after a page reload", async () => {
    const { apiClient, recorded } = await createClient({
      "GET /auth/me": { data: { user: { id: "user-1" }, sessionId: "session-1", csrfToken: CSRF_TOKEN } },
      "POST /tenants/select": { data: { activeTenant: null } },
    });

    await apiClient.get("/auth/me");
    await apiClient.post("/tenants/select", { slug: "general-hospital" });

    expect(recorded[1]).toEqual({ method: "POST", url: "/tenants/select", csrfToken: CSRF_TOKEN });
  });

  it("sends no header when the session did not issue a token", async () => {
    const { apiClient, recorded } = await createClient({
      "GET /auth/me": { data: { user: { id: "user-1" }, csrfToken: null } },
      "POST /tenants/select": { data: { activeTenant: null } },
    });

    await apiClient.get("/auth/me");
    await apiClient.post("/tenants/select", { slug: "general-hospital" });

    expect(recorded[1]).toEqual({ method: "POST", url: "/tenants/select", csrfToken: null });
  });

  it("stops sending the token after logout", async () => {
    const { apiClient, recorded } = await createClient({
      "POST /auth/login": { data: { user: { id: "user-1" }, csrfToken: CSRF_TOKEN } },
      "POST /auth/logout": { data: {} },
      "POST /tenants/select": { data: { activeTenant: null } },
    });

    await apiClient.post("/auth/login", { identifier: "clinician@example.test", password: "secret" });
    await apiClient.post("/auth/logout");
    await apiClient.post("/tenants/select", { slug: "general-hospital" });

    // Logout itself is still a mutation and must carry the header.
    expect(recorded[1]).toEqual({ method: "POST", url: "/auth/logout", csrfToken: CSRF_TOKEN });
    expect(recorded[2]).toEqual({ method: "POST", url: "/tenants/select", csrfToken: null });
  });
});
