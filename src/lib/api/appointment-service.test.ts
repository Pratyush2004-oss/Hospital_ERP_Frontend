import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/client";
import { createAppointment, getAvailability, listAppointments } from "./appointment-service";

vi.mock("@/lib/api/client", () => ({ apiRequest: vi.fn() }));
const mockedApiRequest = vi.mocked(apiRequest);

describe("appointment service", () => {
  beforeEach(() => mockedApiRequest.mockReset());

  it("passes supported list filters and pagination", async () => {
    mockedApiRequest.mockResolvedValue({ data: { appointments: [] }, meta: { pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } } });
    await listAppointments({ page: 1, limit: 20, dateFrom: "2026-11-19", dateTo: "2026-11-19", status: "CONFIRMED" });
    expect(mockedApiRequest).toHaveBeenCalledWith({ method: "GET", url: "/appointments", params: { page: 1, limit: 20, dateFrom: "2026-11-19", dateTo: "2026-11-19", status: "CONFIRMED" } });
  });

  it("uses backend availability and sends idempotency for booking", async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: { availability: { days: [] } } }).mockResolvedValueOnce({ data: { appointment: { id: "appointment-1" } } });
    await getAvailability({ doctorId: "doctor-1", branchId: "branch-1", date: "2026-11-19" });
    await createAppointment({ patientId: "patient-1", doctorId: "doctor-1", branchId: "branch-1", startAt: "2026-11-19T09:00:00+05:30", appointmentSource: "RECEPTIONIST" }, "retry-key");
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, expect.objectContaining({ method: "POST", url: "/appointments", headers: { "Idempotency-Key": "retry-key" } }));
  });
});
