import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/client";
import { getTenantSettings, updateTenantSetting } from "./settings-service";

vi.mock("@/lib/api/client", () => ({ apiRequest: vi.fn() }));
const mockedApiRequest = vi.mocked(apiRequest);

describe("settings service", () => {
  beforeEach(() => mockedApiRequest.mockReset());

  it("reads tenant settings and updates a backend-defined key", async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: { settings: [{ key: "timezone", value: "UTC" }] } }).mockResolvedValueOnce({ data: { setting: { key: "timezone", value: "Asia/Kolkata" } } });
    await expect(getTenantSettings()).resolves.toEqual([{ key: "timezone", value: "UTC" }]);
    await expect(updateTenantSetting("timezone", "Asia/Kolkata")).resolves.toEqual({ key: "timezone", value: "Asia/Kolkata" });
    expect(mockedApiRequest).toHaveBeenLastCalledWith({ method: "PUT", url: "/tenants/settings/timezone", data: { value: "Asia/Kolkata" } });
  });
});
