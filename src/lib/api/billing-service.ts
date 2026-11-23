import { apiClient, apiRequest } from "@/lib/api/client";
import type { BillingDocument, BranchRevenueRow, CurrencyAmount, DepartmentBillingRow, DoctorBillingRow, InvoiceTypeRevenueRow, OutstandingInvoice, Payment, PaymentMethod, PaymentStatus, PaymentMethodRevenueRow, Refund, RefundStatus, ReportStatusRow, RevenueSummary, RevenueTrend } from "@/types/billing";

type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
function pagination(meta: Record<string, unknown> | undefined): Pagination {
  const value = meta?.pagination;
  if (!value || typeof value !== "object") throw new Error("Billing response did not include pagination metadata.");
  const p = value as Record<string, unknown>;
  if (!["page", "pageSize", "total", "totalPages"].every((key) => typeof p[key] === "number")) throw new Error("Billing response contained invalid pagination metadata.");
  return { page: p.page as number, pageSize: p.pageSize as number, total: p.total as number, totalPages: p.totalPages as number };
}
export async function getRevenue(filters: { fromDate: string; toDate: string; branchId?: string }): Promise<RevenueSummary> { const response = await apiRequest<{ revenue: RevenueSummary }>({ method: "GET", url: "/billing-reports/revenue", params: filters }); return response.data.revenue; }
export async function getRevenueTrend(filters: { fromDate: string; toDate: string; granularity: "day" | "week" | "month"; branchId?: string }): Promise<RevenueTrend> { const response = await apiRequest<{ trends: RevenueTrend }>({ method: "GET", url: "/billing-reports/revenue/trends", params: filters }); return response.data.trends; }
type ReportFilters = { fromDate: string; toDate: string; branchId?: string; paymentMethod?: PaymentMethod; invoiceStatus?: string; paymentStatus?: PaymentStatus; refundStatus?: RefundStatus; doctorId?: string; departmentId?: string };
export async function getReport<T>(path: string, key: string, filters: ReportFilters): Promise<T> { const response = await apiRequest<Record<string, T>>({ method: "GET", url: `/billing-reports/${path}`, params: filters }); return response.data[key] as T; }
export async function getPendingOverdue(filters: ReportFilters) { return getReport<{ pending: { invoiceCount: number; outstanding: CurrencyAmount[] }; overdue: { invoiceCount: number; outstanding: CurrencyAmount[] } }>("/pending-overdue", "pendingOverdue", filters); }
export async function getPaymentSummary(filters: ReportFilters) { return getReport<ReportStatusRow[]>("/payment-summary", "payments", filters); }
export async function getRefundSummary(filters: ReportFilters) { return getReport<ReportStatusRow[]>("/refund-summary", "refunds", filters); }
export async function getInvoiceStatus(filters: ReportFilters) { return getReport<ReportStatusRow[]>("/invoice-status", "invoiceStatus", filters); }
export async function getBranchBreakdown(filters: ReportFilters) { return getReport<BranchRevenueRow[]>("/branches", "branches", filters); }
export async function getPaymentMethodBreakdown(filters: ReportFilters) { return getReport<PaymentMethodRevenueRow[]>("/payment-methods", "paymentMethods", filters); }
export async function getInvoiceTypeBreakdown(filters: ReportFilters) { return getReport<InvoiceTypeRevenueRow[]>("/invoice-types", "invoiceTypes", filters); }
export async function getDoctorBreakdown(filters: ReportFilters) { return getReport<DoctorBillingRow[]>("/doctors", "doctors", filters); }
export async function getDepartmentBreakdown(filters: ReportFilters) { return getReport<DepartmentBillingRow[]>("/departments", "departments", filters); }
export async function downloadReport(path: string, filters: ReportFilters, filename: string): Promise<void> {
  const response = await apiClient.get(`/billing-reports/${path}`, { params: { ...filters, format: "csv" }, responseType: "blob" });
  const url = URL.createObjectURL(response.data as Blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
export async function listOutstandingInvoices(query: { page: number; limit: number; state?: "ALL" | "PENDING" | "OVERDUE"; branchId?: string }) { const response = await apiRequest<{ invoices: OutstandingInvoice[] }>({ method: "GET", url: "/billing-reports/outstanding/invoices", params: query }); return { invoices: response.data.invoices, pagination: pagination(response.meta) }; }
export async function listPayments(query: { page: number; limit: number; branchId?: string; method?: PaymentMethod; status?: PaymentStatus; fromDate?: string; toDate?: string }) { const response = await apiRequest<{ payments: Payment[] }>({ method: "GET", url: "/payments", params: query }); return { payments: response.data.payments, pagination: pagination(response.meta) }; }
export async function getPayment(id: string): Promise<Payment> { const response = await apiRequest<{ payment: Payment }>({ method: "GET", url: `/payments/${id}` }); return response.data.payment; }
export async function recordPayment(input: { branchId: string; patientId: string; method: PaymentMethod; amount: string; currency?: string; reference?: string; allocations: Array<{ invoiceId: string; amount: string }> }, idempotencyKey: string): Promise<Payment> { const response = await apiRequest<{ payment: Payment }>({ method: "POST", url: "/payments", headers: { "Idempotency-Key": idempotencyKey }, data: input }); return response.data.payment; }
export async function initiateGatewayPayment(invoiceId: string, method: "CARD" | "UPI" | "BANK_TRANSFER" | "OTHER", idempotencyKey: string) { const response = await apiRequest<{ initiation: { paymentId: string; invoiceId: string; invoiceNumber: string; paymentStatus: PaymentStatus; amount: string; currency: string; provider: string; providerOrderId: string; checkoutUrl: string; expiresAt: string | null } }>({ method: "POST", url: "/payments/initiate", headers: { "Idempotency-Key": idempotencyKey }, data: { invoiceId, method } }); return response.data.initiation; }
export async function listRefunds(query: { page: number; limit: number; branchId?: string; status?: RefundStatus; fromDate?: string; toDate?: string }) { const response = await apiRequest<{ refunds: Refund[] }>({ method: "GET", url: "/refunds", params: query }); return { refunds: response.data.refunds, pagination: pagination(response.meta) }; }
export async function getRefund(id: string): Promise<Refund> { const response = await apiRequest<{ refund: Refund }>({ method: "GET", url: `/refunds/${id}` }); return response.data.refund; }
export async function decideRefund(id: string, action: "approve" | "reject" | "process", reason?: string) { const response = await apiRequest<{ refund: Refund }>({ method: "POST", url: `/refunds/${id}/${action}`, data: action === "process" ? {} : { reason } }); return response.data.refund; }
export async function generateBillingDocument(kind: "invoices" | "payments" | "refunds", id: string): Promise<BillingDocument> { const suffix = kind === "payments" ? `${id}/receipt` : kind === "refunds" ? `${id}/credit-note` : id; const response = await apiRequest<{ document: BillingDocument }>({ method: "POST", url: `/billing-documents/${kind}/${suffix}`, params: {} }); return response.data.document; }
