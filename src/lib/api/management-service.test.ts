import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/client";
import {
  createBranch,
  listBranches,
  listTenantMemberships,
  selectTenant,
  updateBranchStatus,
} from "./management-service";

vi.mock("@/lib/api/client", () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

describe("management service", () => {
  beforeEach(() => mockedApiRequest.mockReset());

  it("sends server-side branch filters and reads pagination metadata", async () => {
    mockedApiRequest.mockResolvedValue({
      data: { branches: [] },
      meta: { pagination: { page: 2, pageSize: 10, total: 11, totalPages: 2 } },
    });

    const result = await listBranches({ page: 2, pageSize: 10, search: "north", isActive: true });

    expect(result.pagination.totalPages).toBe(2);
    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "GET",
      url: "/branches",
      params: { page: 2, pageSize: 10, search: "north", isActive: "true", sortBy: "name", sortOrder: "asc" },
    });
  });

  it("uses the backend branch create contract", async () => {
    mockedApiRequest.mockResolvedValue({ data: { branch: { id: "branch-1" } } });

    await createBranch({ name: "North", branchCode: "NORTH", timezone: "UTC" });

    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "POST",
      url: "/branches",
      data: { name: "North", branchCode: "NORTH", timezone: "UTC" },
    });
  });

  it("uses the backend branch status mutation contract", async () => {
    mockedApiRequest.mockResolvedValue({ data: { branch: { id: "branch-1", isActive: false } } });

    await updateBranchStatus("branch-1", false);

    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "PATCH",
      url: "/branches/branch-1/status",
      data: { isActive: false },
    });
  });

  it("reads the caller's memberships from the existing tenancy endpoint", async () => {
    mockedApiRequest.mockResolvedValue({ data: { memberships: [] } });

    await listTenantMemberships();

    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "GET",
      url: "/tenants/memberships",
    });
  });

  it("selects a hospital through the server-side session selection", async () => {
    mockedApiRequest.mockResolvedValue({ data: { tenant: { id: "tenant-1" } } });

    await selectTenant("riverside");

    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "POST",
      url: "/tenants/select",
      data: { slug: "riverside" },
    });
  });
});
