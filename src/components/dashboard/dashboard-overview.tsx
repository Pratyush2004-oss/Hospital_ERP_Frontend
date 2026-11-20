"use client";

import {
  ArrowUpRight,
  CalendarCheck2,
  CircleDollarSign,
  ClipboardList,
  Stethoscope,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataTable } from "@/components/shared/data-table";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/stores/auth-store";

type Appointment = {
  [key: string]: string;
  patient: string;
  doctor: string;
  time: string;
  status: "Confirmed" | "Pending" | "Checked in";
};

const appointmentActivity = [
  { day: "Mon", appointments: 42, completed: 34 },
  { day: "Tue", appointments: 58, completed: 47 },
  { day: "Wed", appointments: 51, completed: 43 },
  { day: "Thu", appointments: 67, completed: 54 },
  { day: "Fri", appointments: 72, completed: 61 },
  { day: "Sat", appointments: 38, completed: 31 },
  { day: "Sun", appointments: 24, completed: 20 },
];

const recentAppointments: Appointment[] = [
  { patient: "Jordan Lee", doctor: "Dr. Priya Shah", time: "09:30 AM", status: "Confirmed" },
  { patient: "Morgan Chen", doctor: "Dr. Samuel Ortiz", time: "10:15 AM", status: "Checked in" },
  { patient: "Taylor Brooks", doctor: "Dr. Priya Shah", time: "11:00 AM", status: "Pending" },
  { patient: "Casey Williams", doctor: "Dr. Elena Rossi", time: "11:30 AM", status: "Confirmed" },
];

const appointmentColumns = [
  { accessorKey: "patient", header: "Patient", enableSorting: true },
  { accessorKey: "doctor", header: "Doctor", enableSorting: true },
  { accessorKey: "time", header: "Time" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: { original: Appointment } }) => {
      const variant = row.original.status === "Confirmed" ? "success" : row.original.status === "Checked in" ? "info" : "warning";
      return <StatusBadge status={variant}>{row.original.status}</StatusBadge>;
    },
  },
];

export function DashboardOverview() {
  const user = useAuthStore((state) => state.session?.user);
  const displayName = user?.fullName?.split(/\s+/)[0] ?? "there";

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Workspace"
        title={`Good to see you, ${displayName}`}
        description="A concise view of your hospital workspace."
        actions={<Button variant="outline"><CalendarCheck2 />View schedule</Button>}
      />

      <Alert className="border-primary/20 bg-primary/5">
        <ClipboardList className="size-4 text-primary" />
        <AlertTitle>Mock dashboard preview</AlertTitle>
        <AlertDescription>These metrics are illustrative only and are not connected to HospitalOS backend data.</AlertDescription>
      </Alert>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key metrics">
        <StatCard label="Total patients" value="12,486" trend="+8.2% from last month" icon={<Users className="size-4" />} />
        <StatCard label="Today's appointments" value="184" trend="32 remaining today" icon={<CalendarCheck2 className="size-4" />} />
        <StatCard label="Total doctors" value="248" trend="12 departments represented" icon={<Stethoscope className="size-4" />} />
        <StatCard label="Pending invoices" value="$48,290" trend="24 invoices awaiting review" icon={<CircleDollarSign className="size-4" />} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div><CardTitle>Revenue overview</CardTitle><p className="mt-1 text-sm text-muted-foreground">Illustrative monthly revenue trend</p></div>
            <span className="text-sm font-medium text-emerald-600">+12.4%</span>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-3xl font-semibold">$284,760</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={appointmentActivity}>
                  <defs><linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} /><stop offset="95%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", borderRadius: "var(--radius)" }} />
                  <Area type="monotone" dataKey="appointments" stroke="var(--primary)" fill="url(#revenue-fill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pending payment summary</CardTitle><p className="text-sm text-muted-foreground">Mock accounts receivable snapshot</p></CardHeader>
          <CardContent className="space-y-5">
            <div><div className="mb-2 flex justify-between text-sm"><span>Insurance claims</span><span className="font-medium">$28,400</span></div><Progress value={68} /></div>
            <div><div className="mb-2 flex justify-between text-sm"><span>Self-pay balances</span><span className="font-medium">$13,890</span></div><Progress value={42} /></div>
            <div><div className="mb-2 flex justify-between text-sm"><span>Corporate accounts</span><span className="font-medium">$6,000</span></div><Progress value={24} /></div>
            <Button variant="outline" className="w-full" onClick={() => undefined}>Review payment queue <ArrowUpRight /></Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader><SectionHeader title="Appointment activity" description="Mock appointment volume for the current week" /></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={appointmentActivity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", borderRadius: "var(--radius)" }} />
                <Area type="monotone" dataKey="appointments" name="Scheduled" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.12} strokeWidth={2} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="var(--success)" fill="var(--success)" fillOpacity={0.08} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent patient registrations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {["Avery Johnson", "Riley Patel", "Jamie Wilson", "Drew Anderson"].map((patient, index) => (
              <div key={patient} className="flex items-center justify-between gap-3 text-sm"><div><p className="font-medium">{patient}</p><p className="text-xs text-muted-foreground">{index + 1} hour{index ? "s" : ""} ago</p></div><span className="text-xs text-muted-foreground">MRN-00{184 + index}</span></div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Recent appointments" description="Mock appointments requiring attention" />
        <DataTable columns={appointmentColumns} data={recentAppointments} />
      </section>
    </PageContainer>
  );
}
