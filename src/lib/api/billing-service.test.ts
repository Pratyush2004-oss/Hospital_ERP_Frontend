import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/client";
import { getBranchBreakdown, getRevenue, initiateGatewayPayment, listOutstandingInvoices, recordPayment } from "./billing-service";

const { mockedGet } = vi.hoisted(() => ({ mockedGet: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiRequest: vi.fn(), apiClient: { get: mockedGet } }));
const mockedApiRequest = vi.mocked(apiRequest);

describe("billing service", () => {
  beforeEach(() => mockedApiRequest.mockReset());

  it("uses backend report filters and pagination", async () => {
    mockedApiRequest.mockResolvedValue({ data: { invoices: [] }, meta: { pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } } });
    await listOutstandingInvoices({ page: 1, limit: 20, state: "OVERDUE" });
    expect(mockedApiRequest).toHaveBeenCalledWith({ method: "GET", url: "/billing-reports/outstanding/invoices", params: { page: 1, limit: 20, state: "OVERDUE" } });
  });

  it("keeps revenue amounts as backend decimal strings", async () => {
    mockedApiRequest.mockResolvedValue({ data: { revenue: { invoiced: [{ currency: "USD", amount: "12.34" }] } } });
    const report = await getRevenue({ fromDate: "2026-11-01", toDate: "2026-11-19" });
    expect(report.invoiced[0]?.amount).toBe("12.34");
  });

  it("sends idempotency keys for financial writes", async () => {
    mockedApiRequest.mockResolvedValueOnce({ data: { payment: { id: "payment-1" } } }).mockResolvedValueOnce({ data: { initiation: { checkoutUrl: "https://checkout.test" } } });
    await recordPayment({ branchId: "branch-1", patientId: "patient-1", method: "CASH", amount: "10.00", allocations: [{ invoiceId: "invoice-1", amount: "10.00" }] }, "payment-key");
    await initiateGatewayPayment("invoice-1", "CARD", "gateway-key");
    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, expect.objectContaining({ headers: { "Idempotency-Key": "payment-key" } }));
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, expect.objectContaining({ headers: { "Idempotency-Key": "gateway-key" } }));
  });

  it("maps aggregate report envelopes without recalculating amounts", async () => {
    mockedApiRequest.mockResolvedValue({ data: { branches: [{ branchId: "branch-1", branchName: "Main", currency: "USD", invoiceCount: 2, invoiced: "20.00", collected: "10.00", refunded: "1.00", netCollected: "9.00", outstanding: "10.00" }] } });
    const report = await getBranchBreakdown({ fromDate: "2026-11-01", toDate: "2026-11-19" });
    expect(report[0]?.netCollected).toBe("9.00");
  });

  it("requests CSV exports with the report filters", async () => {
    mockedGet.mockResolvedValue({ data: new Blob(["csv"]) });
    vi.stubGlobal("document", { createElement: () => ({ click: vi.fn() }) });
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:test"), revokeObjectURL: vi.fn() });
    const { downloadReport } = await import("./billing-service");
    await downloadReport("revenue", { fromDate: "2026-11-01", toDate: "2026-11-19" }, "revenue.csv");
    expect(mockedGet).toHaveBeenCalledWith("/billing-reports/revenue", expect.objectContaining({ params: { fromDate: "2026-11-01", toDate: "2026-11-19", format: "csv" }, responseType: "blob" }));
    mockedGet.mockReset();
  });
});
