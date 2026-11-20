"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  FileBarChart,
  GitBranch,
  HeartPulse,
  Menu,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const features = [
  { icon: Building2, title: "Hospital & branch operations", description: "Manage hospital tenant context, branches, departments and operational configuration." },
  { icon: Users, title: "Patient records", description: "Register patients and maintain the demographic, contact and document workflows exposed by the system." },
  { icon: Stethoscope, title: "Doctors & scheduling", description: "Maintain doctor profiles, recurring schedules, breaks and leave requests." },
  { icon: CalendarDays, title: "Appointment management", description: "Book, reschedule, track and cancel appointments with branch-aware scheduling." },
  { icon: CreditCard, title: "Billing & payments", description: "Work with payments, refunds and the available billing operations and reports." },
  { icon: FileBarChart, title: "Financial reporting", description: "Review revenue, outstanding balances, payment methods and operational breakdowns." },
  { icon: Bell, title: "Notifications foundation", description: "A centralized notification architecture for application events and supported communication channels." },
  { icon: ShieldCheck, title: "Role-based access", description: "Navigation and actions follow the effective permissions resolved for the signed-in hospital user." },
];

const workflow = [
  { title: "Onboard the hospital", description: "Establish the hospital tenant and organizational structure." },
  { title: "Set up staff access", description: "Assign backend-managed hospital roles and branch access." },
  { title: "Register patients", description: "Create patient profiles and maintain supported records." },
  { title: "Schedule care", description: "Coordinate doctors, appointments and availability." },
  { title: "Run operations", description: "Manage branches, departments and day-to-day workflows." },
  { title: "Handle financial activity", description: "Review billing, payments, refunds and reports." },
];

const roles = [
  { title: "Hospital administrators", description: "Manage hospital-wide configuration and operational access." },
  { title: "Branch administrators", description: "Coordinate staff, patients and daily work for a branch." },
  { title: "Receptionists", description: "Support patient registration and appointment workflows." },
  { title: "Doctors", description: "Work with assigned appointments, patients and leave requests." },
  { title: "Billing staff", description: "Support payments, refunds and financial reporting." },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-semibold" aria-label="HospitalOS home">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><HeartPulse className="size-5" /></span>
            <span className="tracking-tight">HospitalOS</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm lg:flex" aria-label="Primary navigation">
            <a href="#features" className="text-muted-foreground hover:text-foreground">Features</a>
            <a href="#solutions" className="text-muted-foreground hover:text-foreground">Solutions</a>
            <a href="#workflow" className="text-muted-foreground hover:text-foreground">How it works</a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground">Contact</a>
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>Sign in</Button>
            <Button nativeButton={false} render={<Link href="/register" />}>Get started <ArrowRight /></Button>
          </div>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" />}>
              <Menu />
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(88vw,24rem)] p-0">
              <SheetHeader><SheetTitle>HospitalOS</SheetTitle></SheetHeader>
              <nav className="grid gap-1 px-4 pb-4" aria-label="Mobile navigation">
                {[["Features", "#features"], ["Solutions", "#solutions"], ["How it works", "#workflow"], ["Contact", "#contact"]].map(([label, href]) => (
                  <a key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted">{label}</a>
                ))}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-4">
                  <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>Sign in</Button>
                  <Button nativeButton={false} render={<Link href="/register" />}>Get started</Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main>
        <section className="border-b bg-[linear-gradient(to_bottom,var(--accent)_0,transparent_65%)]">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-24">
            <div>
              <p className="mb-4 text-sm font-semibold text-primary">Hospital operations, unified</p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]">
                One operating platform for modern hospital teams
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                HospitalOS brings patient, appointment, scheduling, billing and operational workflows into a tenant-aware workspace with permission-based access.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" nativeButton={false} render={<Link href="/register" />}>Create a hospital <ArrowRight /></Button>
                <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login" />}>Sign in to HospitalOS</Button>
              </div>
            </div>

            <div className="relative min-w-0 rounded-xl border bg-card p-3 shadow-md sm:p-4">
              <div className="flex h-10 items-center gap-2 border-b px-2">
                <span className="size-2.5 rounded-full bg-destructive/50" /><span className="size-2.5 rounded-full bg-warning/70" /><span className="size-2.5 rounded-full bg-success/70" />
                <span className="ml-3 text-xs text-muted-foreground">HospitalOS workspace</span>
              </div>
              <div className="grid min-h-[310px] grid-cols-[58px_1fr] sm:grid-cols-[150px_1fr]">
                <aside className="border-r py-4 pr-2">
                  <div className="mb-5 flex items-center gap-2 px-2"><span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"><HeartPulse className="size-4" /></span><span className="hidden text-xs font-semibold sm:block">HospitalOS</span></div>
                  {["Overview", "Patients", "Appointments", "Billing"].map((label, index) => (
                    <div key={label} className={["mx-1 mb-1 flex items-center gap-2 rounded-md px-2 py-2 text-[11px]", index === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"].join(" ")}>
                      {(() => {
                        const Icon = [HeartPulse, Users, CalendarDays, CircleDollarSign][index];
                        return <Icon className="size-3.5 shrink-0" />;
                      })()}
                      <span className="hidden sm:block">{label}</span>
                    </div>
                  ))}
                </aside>
                <div className="min-w-0 p-3 sm:p-5">
                  <div className="mb-5"><p className="text-xs text-muted-foreground">Workspace overview</p><p className="mt-1 font-semibold">Today’s operations</p></div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[["Patients", "Records"], ["Appointments", "Schedule"], ["Billing", "Payments"]].map(([label, value]) => (
                      <div key={label} className="rounded-lg border p-3"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-lg border p-3">
                    <div className="mb-4 flex items-center justify-between"><p className="text-xs font-medium">Appointment activity</p><span className="text-[10px] text-muted-foreground">This week</span></div>
                    <div className="flex h-24 items-end gap-2 sm:gap-3">
                      {[48, 72, 58, 82, 66, 92, 76].map((height, index) => <div key={index} className="flex-1 rounded-t-sm bg-primary/20" style={{ height: `${height}%` }}><div className="h-full w-full rounded-t-sm bg-primary/70" /></div>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <SectionHeading eyebrow="Platform capabilities" title="Built around the way hospital teams work" description="A single interface for core hospital operations and the permissions that govern them." />
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title} className="bg-card p-5 sm:p-6">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4.5" /></span>
                <h3 className="mt-5 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="border-y bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <SectionHeading eyebrow="How it works" title="A clear path from onboarding to daily operations" description="HospitalOS organizes work around verified tenant, branch and staff permissions." />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workflow.map((step, index) => (
                <article key={step.title} className="relative rounded-xl border bg-card p-5">
                  <span className="text-xs font-semibold text-primary">0{index + 1}</span>
                  <h3 className="mt-3 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="solutions" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <SectionHeading eyebrow="For hospital teams" title="Different access for different responsibilities" description="User experiences follow the roles and permissions available in the backend." align="left" />
            <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2">
              {roles.map((role, index) => (
                <article key={role.title} className="bg-card p-5">
                  <div className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{index === 0 ? <ShieldCheck className="size-4" /> : index === 1 ? <GitBranch className="size-4" /> : index === 2 ? <ClipboardCheck className="size-4" /> : index === 3 ? <Stethoscope className="size-4" /> : <CircleDollarSign className="size-4" />}</span><h3 className="font-semibold">{role.title}</h3></div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{role.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
            <div>
              <p className="text-sm font-semibold text-primary">Security by design</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Access that reflects your organization</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">The backend remains authoritative for tenant membership, branch access and RBAC. Navigation and interface actions are filtered to effective permissions without exposing protected data.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[["Tenant-aware", "Hospital context is isolated by backend authorization."], ["Permission-based", "Modules and actions follow resolved permissions."], ["Session protected", "Sensitive authentication credentials remain outside browser storage."], ["Branch-conscious", "Branch assignments are used where the backend supports access."]].map(([title, description]) => (
                <article key={title} className="rounded-lg border bg-card p-4"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="flex flex-col items-start justify-between gap-6 rounded-xl border bg-primary px-6 py-8 text-primary-foreground sm:px-8 lg:flex-row lg:items-center">
            <div><p className="text-sm font-medium text-primary-foreground/75">HospitalOS workspace</p><h2 className="mt-2 text-2xl font-semibold">Ready to bring your hospital onto HospitalOS?</h2></div>
            <Button size="lg" variant="secondary" nativeButton={false} render={<Link href="/register" />}>Create a hospital <ArrowRight /></Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 text-sm sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-2 font-semibold"><span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"><HeartPulse className="size-4" /></span>HospitalOS</div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground" aria-label="Footer navigation"><a href="#features" className="hover:text-foreground">Features</a><a href="#workflow" className="hover:text-foreground">How it works</a><Link href="/register" className="hover:text-foreground">Create a hospital</Link><Link href="/accept-invitation" className="hover:text-foreground">Accept an invitation</Link><Link href="/login" className="hover:text-foreground">Sign in</Link></nav>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, align = "center" }: { eyebrow: string; title: string; description: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">{description}</p>
    </div>
  );
}
