import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/client";
import { listDepartments, updateDepartmentBranches, updateDoctorBranches } from "./department-doctor-service";

vi.mock("@/lib/api/client", () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

describe("department and doctor service", () => {
  beforeEach(() => mockedApiRequest.mockReset());

  it("uses department list filters and pagination", async () => {
    mockedApiRequest.mockResolvedValue({
      data: { departments: [] },
      meta: { pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } },
    });

    await listDepartments({ page: 1, limit: 10, search: "cardio", isActive: true, branchId: "branch-1" });

    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "GET",
      url: "/departments",
      params: { page: 1, limit: 10, search: "cardio", isActive: "true", branchId: "branch-1" },
    });
  });

  it("replaces department branch associations through the backend contract", async () => {
    mockedApiRequest.mockResolvedValue({ data: { department: {} } });

    await updateDepartmentBranches("department-1", ["branch-1", "branch-2"]);

    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "PUT",
      url: "/departments/department-1/branches",
      data: { branchIds: ["branch-1", "branch-2"] },
    });
  });

  it("preserves branch-specific doctor consultation fee assignments", async () => {
    mockedApiRequest.mockResolvedValue({ data: { doctor: {} } });

    await updateDoctorBranches("doctor-1", [{ branchId: "branch-1", consultationFee: "125.00", currency: "USD", isActive: true }]);

    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "PUT",
      url: "/doctors/doctor-1/branches",
      data: { branches: [{ branchId: "branch-1", consultationFee: "125.00", currency: "USD", isActive: true }] },
    });
  });
});
