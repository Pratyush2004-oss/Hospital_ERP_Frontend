import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/client";
import {
  getAppointmentDashboard,
  getDoctorDashboard,
  getFinancialDashboard,
  getOperationalDashboard,
  getPatientDashboard,
} from "./dashboard-service";

vi.mock("@/lib/api/client", () => ({ apiRequest: vi.fn() }));
const mockedApiRequest = vi.mocked(apiRequest);

const query = { fromDate: "2026-11-01", toDate: "2026-11-22" };

describe("dashboard service", () => {
  beforeEach(() => mockedApiRequest.mockReset());

  it("calls every Phase 22 dashboard endpoint with the selected range", async () => {
    mockedApiRequest
      .mockResolvedValueOnce({ data: { operational: { fromDate: query.fromDate } } })
      .mockResolvedValueOnce({ data: { appointments: { total: 0 } } })
      .mockResolvedValueOnce({ data: { patients: { total: 0 } } })
      .mockResolvedValueOnce({ data: { doctors: { activeDoctors: 0 } } })
      .mockResolvedValueOnce({ data: { financial: { invoiceCount: 0 } } });

    await getOperationalDashboard(query);
    await getAppointmentDashboard(query);
    await getPatientDashboard(query);
    await getDoctorDashboard(query);
    await getFinancialDashboard(query);

    expect(mockedApiRequest.mock.calls.map(([config]) => config.url)).toEqual([
      "/dashboard/operational",
      "/dashboard/appointments",
      "/dashboard/patients",
      "/dashboard/doctors",
      "/dashboard/financial",
    ]);
    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, {
      method: "GET",
      url: "/dashboard/operational",
      params: { fromDate: "2026-11-01", toDate: "2026-11-22" },
    });
  });

  it("sends branchId only when a branch is selected", async () => {
    mockedApiRequest.mockResolvedValue({
      data: { financial: { invoiceCount: 0 } },
    });

    await getFinancialDashboard({ ...query, branchId: "branch-a" });
    expect(mockedApiRequest).toHaveBeenLastCalledWith({
      method: "GET",
      url: "/dashboard/financial",
      params: {
        fromDate: "2026-11-01",
        toDate: "2026-11-22",
        branchId: "branch-a",
      },
    });
  });

  it("unwraps each section from the response envelope", async () => {
    mockedApiRequest.mockResolvedValueOnce({
      data: { doctors: { activeDoctors: 3, workload: [] } },
    });

    await expect(getDoctorDashboard(query)).resolves.toEqual({
      activeDoctors: 3,
      workload: [],
    });
  });
});
