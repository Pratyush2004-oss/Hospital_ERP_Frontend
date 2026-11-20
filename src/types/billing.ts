export type CurrencyAmount = { currency: string; amount: string };
export type PaymentMethod = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";
export type PaymentStatus = "PENDING" | "SUCCESSFUL" | "FAILED" | "REFUNDED";
export type RefundStatus = "PENDING" | "APPROVED" | "PROCESSING" | "SUCCESSFUL" | "FAILED" | "REJECTED";
export type InvoiceStatus = "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED" | "REFUNDED";

export type OutstandingInvoice = { invoiceId: string; invoiceNumber: string; branchId: string; branchName: string; invoiceStatus: string; invoiceType: string; issueDate: string; dueDate: string | null; currency: string; totalAmount: string; amountPaid: string; balanceDue: string };
export type Payment = { id: string; branchId: string; patientId: string; paymentMethod: PaymentMethod; amount: string; currency: string; paymentStatus: PaymentStatus; reference: string | null; receivedBy: string; receivedAt: string; allocations?: Array<{ id: string; invoiceId: string; invoiceNumber: string; amount: string }> };
export type Refund = { id: string; invoiceId: string; invoiceNumber: string; invoicePaymentId: string | null; receiptId: string | null; branchId: string; patientId: string; amount: string; currency: string; refundStatus: RefundStatus; channel: "GATEWAY" | "OFFLINE"; reason: string | null; reference: string | null; createdAt: string; updatedAt: string };
export type RevenueSummary = { fromDate: string; toDate: string; timezone: string; invoiceCount: number; invoiced: CurrencyAmount[]; collected: CurrencyAmount[]; refunded: CurrencyAmount[]; netCollected: CurrencyAmount[]; outstanding: CurrencyAmount[] };
export type RevenueTrend = { granularity: "day" | "week" | "month"; fromDate: string; toDate: string; timezone: string; points: Array<{ period: string; currency: string; invoiced: string; collected: string; refunded: string; netCollected: string }> };
export type BillingDocument = { id: string; documentType: "INVOICE" | "PAYMENT_RECEIPT" | "CREDIT_NOTE"; documentNumber: string; invoiceId: string; paymentId: string | null; refundId: string | null; fileName: string; mimeType: string; fileSize: number; createdAt: string };
export type ReportStatusRow = { status: string; count: number; totals: CurrencyAmount[] };
export type BranchRevenueRow = { branchId: string; branchName: string; currency: string; invoiceCount: number; invoiced: string; collected: string; refunded: string; netCollected: string; outstanding: string };
export type PaymentMethodRevenueRow = { paymentMethod: string; currency: string; paymentCount: number; collected: string; refunded: string; netCollected: string };
export type InvoiceTypeRevenueRow = { invoiceType: string; currency: string; invoiceCount: number; invoiced: string; collected: string; refunded: string; outstanding: string };
export type DoctorBillingRow = { doctorId: string; doctorCode: string; doctorName: string | null; currency: string; invoiceCount: number; invoiced: string; collected: string; refunded: string; netCollected: string };
export type DepartmentBillingRow = { departmentId: string; departmentName: string; currency: string; invoiceCount: number; invoiced: string; collected: string; refunded: string; netCollected: string };
