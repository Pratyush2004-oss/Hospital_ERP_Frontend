"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { decideRefund, downloadReport, getBranchBreakdown, getDepartmentBreakdown, getDoctorBreakdown, getInvoiceStatus, getPaymentMethodBreakdown, getPaymentSummary, getRefundSummary, getRevenue, getRevenueTrend, listRefunds } from "@/lib/api/billing-service";
import type { RefundStatus } from "@/types/billing";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;
const amount = (value: string, currency: string) => `${currency} ${value}`;
const reportKey = (fromDate: string, toDate: string, branchId: string) => [fromDate, toDate, branchId];

export function FinancialAnalytics() {
  const permissions = useAuthStore((state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS);
  const canRead = permissions.includes("reports:read");
  const canExport = permissions.includes("reports:export");
  const canRefund = permissions.includes("payment:refund");
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());
  const [branchId, setBranchId] = useState("");
  const [refundStatus, setRefundStatus] = useState("");
  const filters = { fromDate, toDate, ...(branchId ? { branchId } : {}) };
  const key = reportKey(fromDate, toDate, branchId);
  const revenue = useQuery({ queryKey: ["financial-revenue", ...key], enabled: canRead, queryFn: () => getRevenue(filters) });
  const trend = useQuery({ queryKey: ["financial-trend", ...key], enabled: canRead, queryFn: () => getRevenueTrend({ ...filters, granularity: "day" }) });
  const paymentSummary = useQuery({ queryKey: ["financial-payment-summary", ...key], enabled: canRead, queryFn: () => getPaymentSummary(filters) });
  const refundSummary = useQuery({ queryKey: ["financial-refund-summary", ...key], enabled: canRead, queryFn: () => getRefundSummary(filters) });
  const invoiceStatus = useQuery({ queryKey: ["financial-invoice-status", ...key], enabled: canRead, queryFn: () => getInvoiceStatus(filters) });
  const branches = useQuery({ queryKey: ["financial-branches", ...key], enabled: canRead, queryFn: () => getBranchBreakdown(filters) });
  const methods = useQuery({ queryKey: ["financial-methods", ...key], enabled: canRead, queryFn: () => getPaymentMethodBreakdown(filters) });
  const departments = useQuery({ queryKey: ["financial-departments", ...key], enabled: canRead, queryFn: () => getDepartmentBreakdown(filters) });
  const doctors = useQuery({ queryKey: ["financial-doctors", ...key], enabled: canRead, queryFn: () => getDoctorBreakdown(filters) });
  const refunds = useQuery({ queryKey: ["financial-refunds", fromDate, toDate, branchId, refundStatus], enabled: canRead, queryFn: () => listRefunds({ page: 1, limit: 50, fromDate, toDate, ...(branchId ? { branchId } : {}), ...(refundStatus ? { status: refundStatus as RefundStatus } : {}) }) });
  const decision = useMutation({ mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" | "process" }) => decideRefund(id, action), onSuccess: () => { void refunds.refetch(); void refundSummary.refetch(); toast.success("Refund status updated."); }, onError: (error) => toast.error(getApiErrorMessage(error)) });
  const exportReport = useMutation({ mutationFn: (path: string) => downloadReport(path, filters, `hospitalos-${path.replaceAll("/", "-")}-${toDate}.csv`), onSuccess: () => toast.success("Report download started."), onError: (error) => toast.error(getApiErrorMessage(error)) });

  if (!canRead) return <PageContainer><PageHeader eyebrow="Financial analytics" title="Financial analytics" /><ErrorState title="You are not authorized to view financial reports." /></PageContainer>;
  const currency = revenue.data?.invoiced[0]?.currency ?? "USD";
  const metric = (values: Array<{ currency: string; amount: string }> | undefined) => values?.find((item) => item.currency === currency)?.amount ?? "0.00";
  const refresh = () => [revenue, trend, paymentSummary, refundSummary, invoiceStatus, branches, methods, departments, doctors, refunds].forEach((query) => void query.refetch());
  const exportPath = "revenue";

  return <PageContainer>
    <PageHeader eyebrow="Financial analytics" title="Financial reports" description="Aggregated values and status decisions are supplied by the backend ledger." />
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <Input aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="w-auto" />
      <Input aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="w-auto" />
      <Input aria-label="Branch ID filter" placeholder="Branch ID (optional)" value={branchId} onChange={(event) => setBranchId(event.target.value)} className="w-52" />
      <Button variant="outline" onClick={refresh}><RefreshCw className="size-4" />Refresh</Button>
      {canExport ? <><Button variant="outline" disabled={exportReport.isPending} onClick={() => exportReport.mutate(exportPath)}><Download className="size-4" />Revenue CSV</Button><Button variant="outline" disabled={exportReport.isPending} onClick={() => exportReport.mutate("payment-summary")}><Download className="size-4" />Payments CSV</Button><Button variant="outline" disabled={exportReport.isPending} onClick={() => exportReport.mutate("invoice-status")}><Download className="size-4" />Invoices CSV</Button><Button variant="outline" disabled={exportReport.isPending} onClick={() => exportReport.mutate("branches")}><Download className="size-4" />Branches CSV</Button></> : null}
    </div>
    {revenue.isLoading ? <LoadingState label="Loading financial reports..." /> : revenue.data ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{([["Invoiced", revenue.data.invoiced], ["Collected", revenue.data.collected], ["Outstanding", revenue.data.outstanding], ["Refunded", revenue.data.refunded], ["Net collections", revenue.data.netCollected]] as const).map(([label, values]) => <Card key={label}><CardContent className="p-4"><div className="text-sm text-muted-foreground">{label}</div><div className="mt-1 text-xl font-semibold">{amount(metric(values), currency)}</div></CardContent></Card>)}</div> : null}
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Revenue trend</CardTitle></CardHeader><CardContent className="h-72">{trend.data?.points.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={trend.data.points}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis /><Tooltip formatter={(value, name) => [`${currency} ${String(value)}`, String(name)]} /><Line type="monotone" dataKey="collected" stroke="var(--primary)" name="Collected" /><Line type="monotone" dataKey="refunded" stroke="var(--destructive)" name="Refunded" /></LineChart></ResponsiveContainer> : <p className="text-sm text-muted-foreground">No revenue data for this period.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Payment methods</CardTitle></CardHeader><CardContent className="h-72">{methods.data?.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={methods.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="paymentMethod" /><YAxis /><Tooltip formatter={(value) => [`${currency} ${String(value)}`, "Collected"]} /><Bar dataKey="collected" fill="var(--primary)" /></BarChart></ResponsiveContainer> : <p className="text-sm text-muted-foreground">No payment method data for this period.</p>}</CardContent></Card>
    </div>
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      {[["Branch reports", branches.data?.map((row) => `${row.branchName} · ${amount(row.netCollected, row.currency)}`)], ["Department reports", departments.data?.map((row) => `${row.departmentName} · ${amount(row.netCollected, row.currency)}`)], ["Doctor reports", doctors.data?.map((row) => `${row.doctorName ?? row.doctorCode} · ${amount(row.netCollected, row.currency)}`)], ["Invoice statuses", invoiceStatus.data?.map((row) => `${row.status} · ${row.count}`)]].map(([title, rows]) => <Card key={String(title)}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{(rows as string[] | undefined)?.length ? (rows as string[]).map((row) => <div className="border-b pb-2" key={row}>{row}</div>) : <p className="text-muted-foreground">No data for this period.</p>}</CardContent></Card>)}
    </div>
    <Card className="mt-5"><CardHeader><CardTitle>Refund management</CardTitle><div className="flex flex-wrap gap-2"><select aria-label="Refund status filter" value={refundStatus} onChange={(event) => setRefundStatus(event.target.value)} className="h-8 rounded-lg border bg-transparent px-2 text-sm"><option value="">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="PROCESSING">Processing</option><option value="SUCCESSFUL">Successful</option><option value="FAILED">Failed</option><option value="REJECTED">Rejected</option></select>{canExport ? <Button variant="outline" size="sm" onClick={() => exportReport.mutate("refund-summary")}><Download className="size-4" />Export refunds</Button> : null}</div></CardHeader><CardContent><div className="mb-4 grid gap-2 sm:grid-cols-4">{(refundSummary.data ?? []).map((row) => <div className="rounded-lg border p-3 text-sm" key={row.status}><div className="text-muted-foreground">{row.status}</div><div className="font-semibold">{row.count}</div></div>)}</div><div className="space-y-2">{refunds.data?.refunds.map((refund) => <div className="flex flex-wrap items-center justify-between gap-3 border-b py-3 text-sm" key={refund.id}><div><div className="font-medium">{refund.invoiceNumber} · {amount(refund.amount, refund.currency)}</div><div className="text-muted-foreground">{refund.reason ?? "No reason supplied"} · {refund.createdAt.slice(0, 10)}</div></div><div className="flex items-center gap-2"><StatusBadge status={refund.refundStatus === "SUCCESSFUL" ? "success" : refund.refundStatus === "FAILED" || refund.refundStatus === "REJECTED" ? "error" : "neutral"}>{refund.refundStatus}</StatusBadge>{canRefund && refund.refundStatus === "PENDING" ? <><Button size="sm" variant="outline" disabled={decision.isPending} onClick={() => decision.mutate({ id: refund.id, action: "approve" })}>Approve</Button><Button size="sm" variant="ghost" disabled={decision.isPending} onClick={() => decision.mutate({ id: refund.id, action: "reject" })}>Reject</Button></> : null}{canRefund && refund.refundStatus === "APPROVED" ? <Button size="sm" variant="outline" disabled={decision.isPending} onClick={() => decision.mutate({ id: refund.id, action: "process" })}>Process</Button> : null}</div></div>)}</div></CardContent></Card>
  </PageContainer>;
}
