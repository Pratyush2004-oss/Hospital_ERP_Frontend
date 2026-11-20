import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/client";
import { createPatient, listPatientChildren, listPatients } from "./patient-service";

vi.mock("@/lib/api/client", () => ({ apiRequest: vi.fn() }));
const mockedApiRequest = vi.mocked(apiRequest);

describe("patient service", () => {
  beforeEach(() => mockedApiRequest.mockReset());

  it("passes search and pagination to the backend and reads metadata", async () => {
    mockedApiRequest.mockResolvedValue({
      data: { patients: [] },
      meta: { pagination: { page: 2, pageSize: 10, total: 12, totalPages: 2 } },
    });
    const result = await listPatients({ page: 2, limit: 10, search: "P-0001" });
    expect(result.pagination.total).toBe(12);
    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "GET",
      url: "/patients",
      params: { page: 2, limit: 10, search: "P-0001" },
    });
  });

  it("sends registration fields without inventing a patient code or tenant", async () => {
    mockedApiRequest.mockResolvedValue({ data: { patient: { id: "patient-1" } } });
    await createPatient({ fullName: "Ada Lovelace", contacts: [{ phone: "+15551234567", isPrimary: true }] });
    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "POST",
      url: "/patients",
      data: { fullName: "Ada Lovelace", contacts: [{ phone: "+15551234567", isPrimary: true }] },
    });
  });

  it("loads child records from their dedicated endpoints", async () => {
    mockedApiRequest
      .mockResolvedValueOnce({ data: { contacts: [] } })
      .mockResolvedValueOnce({ data: { addresses: [] } })
      .mockResolvedValueOnce({ data: { emergencyContacts: [] } });
    await listPatientChildren("patient-1");
    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, { method: "GET", url: "/patients/patient-1/contacts" });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, { method: "GET", url: "/patients/patient-1/addresses" });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(3, { method: "GET", url: "/patients/patient-1/emergency-contacts" });
  });
});
