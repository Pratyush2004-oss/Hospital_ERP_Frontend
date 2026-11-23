import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/client";
import {
  getTenantSettings,
  updateTenantIdentity,
  updateTenantSetting,
} from "./settings-service";

vi.mock("@/lib/api/client", () => ({ apiRequest: vi.fn() }));
const mockedApiRequest = vi.mocked(apiRequest);

const tenant = {
  id: "tenant-1",
  name: "Riverside Hospital",
  slug: "riverside",
  legalName: "Riverside Hospital LLC",
  email: "hello@riverside.test",
  phone: "+1 555 0100",
  logoUrl: null,
  timezone: "America/New_York",
  status: "ACTIVE",
};

describe("settings service", () => {
  beforeEach(() => mockedApiRequest.mockReset());

  it("returns the tenant and the actual key/value settings object", async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: {
        tenant,
        settings: {
          branding: { primaryColor: "#0a7", portalName: "Riverside" },
          "patient.code_format": "P-{seq:6}",
        },
      },
    });

    const result = await getTenantSettings();

    expect(result.tenant.id).toBe("tenant-1");
    expect(result.settings.branding).toEqual({
      primaryColor: "#0a7",
      portalName: "Riverside",
    });
    expect(Array.isArray(result.settings)).toBe(false);
  });

  it("saves a typed setting through the existing key endpoint", async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: {
        setting: {
          key: "locale",
          value: { timezone: "Europe/London", language: "en-GB", dateFormat: "DD/MM/YYYY" },
          auditId: "audit-1",
        },
      },
    });

    await expect(
      updateTenantSetting("locale", {
        timezone: "Europe/London",
        language: "en-GB",
        dateFormat: "DD/MM/YYYY",
      }),
    ).resolves.toMatchObject({ key: "locale", auditId: "audit-1" });

    expect(mockedApiRequest).toHaveBeenLastCalledWith({
      method: "PUT",
      url: "/tenants/settings/locale",
      data: {
        value: { timezone: "Europe/London", language: "en-GB", dateFormat: "DD/MM/YYYY" },
      },
    });
  });

  it("updates hospital identity separately from tenant settings", async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: { tenant: { ...tenant, name: "Riverside Care" }, auditId: "audit-2" },
    });

    await expect(updateTenantIdentity({ name: "Riverside Care" })).resolves.toMatchObject({
      auditId: "audit-2",
    });

    expect(mockedApiRequest).toHaveBeenLastCalledWith({
      method: "PATCH",
      url: "/tenants/settings/identity",
      data: { name: "Riverside Care" },
    });
  });
});
