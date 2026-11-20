"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { getRevenue, getRevenueTrend, initiateGatewayPayment, listOutstandingInvoices, listPayments, listRefunds } from "@/lib/api/billing-service";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const money = (value: string, currency: string) => `${currency} ${value}`;
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => `${today().slice(0, 8)}01`;

export function BillingManagement() {
  const permissions = useAuthStore((state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS);
  const canRead = permissions.includes("payment:read");
  const canReport = permissions.includes("reports:read");
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());
  const revenue = useQuery({ queryKey: ["billing-revenue", fromDate, toDate], enabled: canReport, queryFn: () => getRevenue({ fromDate, toDate }) });
  const trend = useQuery({ queryKey: ["billing-revenue-trend", fromDate, toDate], enabled: canReport, queryFn: () => getRevenueTrend({ fromDate, toDate, granularity: "day" }) });
  const invoices = useQuery({ queryKey: ["billing-outstanding"], enabled: canReport, queryFn: () => listOutstandingInvoices({ page: 1, limit: 20, state: "ALL" }) });
  const payments = useQuery({ queryKey: ["billing-payments"], enabled: canRead, queryFn: () => listPayments({ page: 1, limit: 20 }) });
  const refunds = useQuery({ queryKey: ["billing-refunds"], enabled: canRead, queryFn: () => listRefunds({ page: 1, limit: 20 }) });
  const initiate = useMutation({ mutationFn: (invoiceId: string) => initiateGatewayPayment(invoiceId, "CARD", crypto.randomUUID()), onSuccess: (checkout) => { window.open(checkout.checkoutUrl, "_blank", "noopener,noreferrer"); toast.success("Checkout created. Payment status remains backend-pending until verified."); }, onError: (error) => toast.error(getApiErrorMessage(error)) });
  if (!canRead && !canReport) return <PageContainer><PageHeader eyebrow="Billing" title="Billing" /><ErrorState title="You are not authorized to view billing information." /></PageContainer>;
  const firstCurrency = revenue.data?.invoiced[0]?.currency ?? "USD";
  const metric = (values: Array<{ currency: string; amount: string }> | undefined) => values?.find((item) => item.currency === firstCurrency)?.amount ?? "0.00";
  return <PageContainer><PageHeader eyebrow="Financial operations" title="Billing" description="Financial summaries and statuses are calculated by the backend ledger." /><div className="mt-6 flex flex-wrap items-center gap-3"><Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="w-auto" /><Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="w-auto" /><Button variant="outline" onClick={() => { void revenue.refetch(); void trend.refetch(); }}><RefreshCw className="size-4" />Refresh</Button></div>{canReport && revenue.data ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Invoiced", metric(revenue.data.invoiced)], ["Collected", metric(revenue.data.collected)], ["Outstanding", metric(revenue.data.outstanding)], ["Refunded", metric(revenue.data.refunded)], ["Net collected", metric(revenue.data.netCollected)]].map(([label, value]) => <Card key={String(label)}><CardContent className="p-4"><div className="text-sm text-muted-foreground">{label}</div><div className="mt-1 text-xl font-semibold">{money(String(value), firstCurrency)}</div></CardContent></Card>)}</div> : null}<div className="mt-6 grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Revenue trend</CardTitle></CardHeader><CardContent>{trend.isLoading ? <LoadingState label="Loading revenue..." /> : trend.data?.points.length ? <div className="space-y-2">{trend.data.points.slice(-10).map((point) => <div className="flex items-center justify-between border-b py-2 text-sm" key={`${point.period}-${point.currency}`}><span>{point.period} · {point.currency}</span><span className="font-medium">{money(point.netCollected, point.currency)}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No revenue data for this period.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Outstanding invoices</CardTitle></CardHeader><CardContent>{invoices.isLoading ? <LoadingState label="Loading outstanding invoices..." /> : <div className="space-y-2">{invoices.data?.invoices.map((invoice) => <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm" key={invoice.invoiceId}><div><div className="font-medium">{invoice.invoiceNumber} · {invoice.branchName}</div><div className="text-muted-foreground">{invoice.invoiceStatus} · Balance {money(invoice.balanceDue, invoice.currency)}</div></div>{permissions.includes("payment:create") && invoice.balanceDue !== "0.00" ? <Button size="sm" variant="outline" disabled={initiate.isPending} onClick={() => initiate.mutate(invoice.invoiceId)}><ExternalLink className="size-4" />Checkout</Button> : null}</div>)}</div>}</CardContent></Card></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Recent payments</CardTitle></CardHeader><CardContent><div className="space-y-2">{payments.data?.payments.map((payment) => <div className="flex justify-between border-b py-2 text-sm" key={payment.id}><span>{payment.paymentMethod} · {payment.paymentStatus}</span><span className="font-medium">{money(payment.amount, payment.currency)}</span></div>)}</div></CardContent></Card><Card><CardHeader><CardTitle>Refunds</CardTitle></CardHeader><CardContent><div className="space-y-2">{refunds.data?.refunds.map((refund) => <div className="flex justify-between border-b py-2 text-sm" key={refund.id}><span>{refund.invoiceNumber} · <StatusBadge status={refund.refundStatus === "SUCCESSFUL" ? "success" : refund.refundStatus === "REJECTED" || refund.refundStatus === "FAILED" ? "error" : "neutral"}>{refund.refundStatus}</StatusBadge></span><span className="font-medium">{money(refund.amount, refund.currency)}</span></div>)}</div></CardContent></Card></div><Card className="mt-4"><CardHeader><CardTitle>Backend capability notes</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">The API currently exposes outstanding-invoice reporting, payment history, gateway initiation, refund history, and secure billing-document generation. Invoice CRUD/lifecycle routes are not registered. Manual payment recording requires a patient ID that the outstanding-invoice report intentionally does not return, so it is not exposed here without an authoritative patient-to-invoice API.</CardContent></Card></PageContainer>;
}
