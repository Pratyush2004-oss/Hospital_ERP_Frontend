"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  CalendarClock,
  FileText,
  LogOut,
  MailWarning,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPortalProfile,
  linkPatientToHospital,
  listPortalAppointments,
  listPortalHospitals,
  listPortalInvoices,
  updatePortalProfile,
} from "@/lib/api/patient-portal-service";
import { getApiErrorMessage, resendEmailVerification } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/stores/auth-store";
import type { Patient } from "@/types/patient";
import type { PatientPortalProfileUpdateInput } from "@/types/patient-portal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";

type ApiErrorShape = {
  response?: {
    status?: number;
    data?: { error?: { code?: string; message?: string } };
  };
};

type PortalTab = "profile" | "appointments" | "billing";

function isEmailUnverified(error: unknown): boolean {
  const response = typeof error === "object" && error !== null && "response" in error
    ? (error as ApiErrorShape).response
    : undefined;

  return response?.status === 403 && response.data?.error?.code === "EMAIL_NOT_VERIFIED";
}

export function PatientPortal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const queryClient = useQueryClient();
  const [selectedHospitalSlug, setSelectedHospitalSlug] = useState<string | null>(null);
  const [hospitalCode, setHospitalCode] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [tab, setTab] = useState<PortalTab>("profile");

  const hospitals = useQuery({
    queryKey: ["patient-portal-hospitals"],
    queryFn: listPortalHospitals,
    retry: false,
  });

  const requestedSlug = searchParams.get("hospital");
  const effectiveSlug =
    (selectedHospitalSlug &&
      hospitals.data?.some((hospital) => hospital.tenantSlug === selectedHospitalSlug)
      ? selectedHospitalSlug
      : null) ??
    (requestedSlug &&
    hospitals.data?.some((hospital) => hospital.tenantSlug === requestedSlug)
      ? requestedSlug
      : null) ??
    hospitals.data?.[0]?.tenantSlug ??
    null;

  const profile = useQuery({
    queryKey: ["patient-portal-profile", effectiveSlug],
    queryFn: () => getPortalProfile(effectiveSlug as string),
    enabled: Boolean(effectiveSlug),
  });

  const linkHospital = useMutation({
    mutationFn: () => linkPatientToHospital({ hospitalSlug: hospitalCode.trim().toLowerCase() }),
    onSuccess: async () => {
      setSelectedHospitalSlug(hospitalCode.trim().toLowerCase());
      setHospitalCode("");
      setAddOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["patient-portal-hospitals"] });
      await queryClient.invalidateQueries({ queryKey: ["patient-portal-profile"] });
    },
  });

  const resend = useMutation({
    mutationFn: resendEmailVerification,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["patient-portal-hospitals"] });
    },
  });

  const logout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">HospitalOS patient portal</p>
              <p className="truncate text-xs text-muted-foreground">
                {session?.user.fullName} · {session?.user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/forgot-password" />}>
              Recover access
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              <LogOut className="size-4" aria-hidden="true" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <PageContainer className="max-w-6xl py-6">
        {hospitals.isLoading ? <LoadingState label="Loading your patient profiles..." /> : null}

        {hospitals.isError ? (
          isEmailUnverified(hospitals.error) ? (
            <VerifyEmailState
              isSending={resend.isPending}
              message={resend.data ? "A new verification email has been requested." : resend.error ? getApiErrorMessage(resend.error) : null}
              onResend={() => resend.mutate()}
            />
          ) : (
            <ErrorState
              title={getApiErrorMessage(hospitals.error, "Unable to load your patient profiles.")}
              onRetry={() => void hospitals.refetch()}
            />
          )
        ) : null}

        {hospitals.data && hospitals.data.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5" aria-hidden="true" /> No hospital profile linked
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                Your account is verified, but no patient profile is linked yet. Use the
                linking email sent by hospital reception, or self-register with a new hospital.
              </p>
              <p>
                Have a linking email?{" "}
                <Link href="/portal/link" className="font-medium text-primary hover:underline">
                  Open the secure linking page
                </Link>
                .
              </p>
              <p>
                Need a new profile?{" "}
                <Link href="/register/patient" className="font-medium text-primary hover:underline">
                  Register as a patient
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        ) : null}

        {hospitals.data && hospitals.data.length > 0 ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Your care</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  One login, one profile per hospital. Data never crosses hospital boundaries.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setAddOpen((value) => !value)}>
                <Plus className="size-4" aria-hidden="true" /> Add another hospital
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Linked hospitals">
              {hospitals.data.map((hospital) => {
                const active = hospital.tenantSlug === effectiveSlug;
                return (
                  <button
                    key={hospital.tenantId}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedHospitalSlug(hospital.tenantSlug)}
                    className={`rounded-lg border bg-card p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/40"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-medium">{hospital.tenantName}</span>
                      <Badge variant="secondary">{hospital.status}</Badge>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {hospital.patientCode} · {hospital.tenantSlug}
                    </span>
                  </button>
                );
              })}
            </div>

            {addOpen ? (
              <Card>
                <CardHeader>
                  <CardTitle>Add another hospital</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (hospitalCode.trim()) linkHospital.mutate();
                    }}
                  >
                    <FormField
                      id="add-hospital-code"
                      label="Hospital code"
                      required
                      description="Use the code supplied by the hospital. Existing records are never claimed automatically."
                    >
                      <Input
                        value={hospitalCode}
                        onChange={(event) => setHospitalCode(event.target.value)}
                        placeholder="riverside-care"
                        autoComplete="organization"
                        aria-invalid={linkHospital.isError}
                      />
                    </FormField>
                    <Button type="submit" disabled={!hospitalCode.trim() || linkHospital.isPending}>
                      {linkHospital.isPending ? "Linking..." : "Link hospital"}
                    </Button>
                  </form>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Existing patient records are never claimed automatically. If the
                    hospital already has your record, use the email invitation from reception.
                  </p>
                  {linkHospital.isError ? (
                    <Alert variant="destructive" className="mt-3" role="alert">
                      <AlertCircle className="size-4" aria-hidden="true" />
                      <AlertTitle>Could not link this hospital</AlertTitle>
                      <AlertDescription>{getApiErrorMessage(linkHospital.error)}</AlertDescription>
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <nav className="flex flex-wrap gap-2 border-b pb-2" aria-label="Patient portal sections">
              <TabButton active={tab === "profile"} onClick={() => setTab("profile")}>
                <UserRound className="size-4" /> Profile
              </TabButton>
              <TabButton active={tab === "appointments"} onClick={() => setTab("appointments")}>
                <CalendarClock className="size-4" /> Appointments
              </TabButton>
              <TabButton active={tab === "billing"} onClick={() => setTab("billing")}>
                <FileText className="size-4" /> Billing
              </TabButton>
            </nav>

            {tab === "profile" ? (
              <>
                {profile.isLoading ? <LoadingState label="Loading your profile..." /> : null}
                {profile.isError ? (
                  <ErrorState
                    title={getApiErrorMessage(profile.error, "Unable to load this patient profile.")}
                    onRetry={() => void profile.refetch()}
                  />
                ) : null}
                {profile.data && effectiveSlug ? (
                  <ProfileSection
                    patient={profile.data}
                    hospitalSlug={effectiveSlug}
                    hospitalName={
                      hospitals.data.find((hospital) => hospital.tenantSlug === effectiveSlug)
                        ?.tenantName ?? "Your hospital"
                    }
                  />
                ) : null}
              </>
            ) : null}

            {tab === "appointments" && effectiveSlug ? (
              <AppointmentsSection hospitalSlug={effectiveSlug} />
            ) : null}

            {tab === "billing" && effectiveSlug ? (
              <BillingSection hospitalSlug={effectiveSlug} />
            ) : null}
          </div>
        ) : null}
      </PageContainer>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function VerifyEmailState({
  isSending,
  message,
  onResend,
}: {
  isSending: boolean;
  message: string | null;
  onResend: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailWarning className="size-5 text-amber-600" aria-hidden="true" />
          Verify your email to open the portal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your patient profile exists, but portal access stays locked until your
          email address is verified. Open the link in your verification email, then
          reload this page.
        </p>
        {message ? <p className="text-sm" role="status">{message}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={onResend} disabled={isSending}>
            <MailWarning className="size-4" aria-hidden="true" />
            {isSending ? "Sending..." : "Resend verification email"}
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/forgot-password" />}>
            Trouble signing in?
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileSection({
  patient,
  hospitalName,
  hospitalSlug,
}: {
  patient: Patient;
  hospitalName: string;
  hospitalSlug: string;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(patient.fullName);
  const [dateOfBirth, setDateOfBirth] = useState(patient.dateOfBirth ?? "");
  const [gender, setGender] = useState(patient.gender);

  const save = useMutation({
    mutationFn: (input: PatientPortalProfileUpdateInput) =>
      updatePortalProfile(hospitalSlug, input),
    onSuccess: async () => {
      toast.success("Profile updated.");
      setEditing(false);
      await queryClient.invalidateQueries({
        queryKey: ["patient-portal-profile", hospitalSlug],
      });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const primary =
    patient.contacts?.find((contact) => contact.isPrimary) ?? patient.contacts?.[0] ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserRound className="size-5" aria-hidden="true" /> Profile details
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setEditing((value) => !value)}>
            {editing ? "Cancel" : "Edit permitted fields"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {editing ? (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                save.mutate({
                  fullName: fullName.trim(),
                  dateOfBirth: dateOfBirth || null,
                  gender,
                });
              }}
            >
              <FormField id="portal-full-name" label="Full name" required className="sm:col-span-2">
                <Input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  maxLength={200}
                />
              </FormField>
              <FormField id="portal-dob" label="Date of birth">
                <Input
                  type="date"
                  value={dateOfBirth}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                />
              </FormField>
              <FormField id="portal-gender" label="Gender">
                <Select value={gender} onValueChange={(value) => setGender((value ?? "UNKNOWN") as typeof gender)}>
                  <SelectTrigger id="portal-gender" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["MALE", "FEMALE", "OTHER", "UNKNOWN"].map((value) => (
                      <SelectItem key={value} value={value}>
                        {value.charAt(0) + value.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={save.isPending || !fullName.trim()}>
                  {save.isPending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Hospital" value={hospitalName} />
              <Info label="Patient ID" value={patient.patientCode} />
              <Info label="Full name" value={patient.fullName} />
              <Info label="Date of birth" value={patient.dateOfBirth ?? "Not provided"} />
              <Info label="Gender" value={patient.gender} />
              <Info label="Status" value={<Badge variant="secondary">{patient.status}</Badge>} />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            You may update your name, date of birth and gender. Email, phone, patient ID
            and clinical information can only be changed by hospital staff.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact on file</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {primary ? (
            <>
              <Info label="Phone" value={primary.phone ?? "Not provided"} />
              <Info label="Email" value={primary.email ?? "Not provided"} />
            </>
          ) : (
            <p className="text-muted-foreground">No contact details are recorded for this profile.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Contact hospital reception to change your contact details. Email changes are
            handled outside the portal because email is your verified login identity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function AppointmentsSection({ hospitalSlug }: { hospitalSlug: string }) {
  const [page, setPage] = useState(1);
  const appointments = useQuery({
    queryKey: ["patient-portal-appointments", hospitalSlug, page],
    queryFn: () => listPortalAppointments(hospitalSlug, page),
  });

  if (appointments.isLoading) return <LoadingState label="Loading your appointments..." />;
  if (appointments.isError) {
    return (
      <ErrorState
        title={getApiErrorMessage(appointments.error, "Appointments could not be loaded.")}
        onRetry={() => void appointments.refetch()}
      />
    );
  }
  if (!appointments.data?.items.length) {
    return (
      <EmptyState
        title="No appointments yet"
        description="Appointments booked with this hospital will appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.data.items.map((appointment) => (
          <div key={appointment.id} className="rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                {new Date(appointment.startAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              <Badge variant="secondary">{appointment.appointmentStatus}</Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {appointment.doctorName} · {appointment.branchName} ·{" "}
              {appointment.durationMinutes} min
            </p>
            {appointment.reason ? <p className="mt-1">{appointment.reason}</p> : null}
          </div>
        ))}
        <Pagination
          page={appointments.data.page}
          totalPages={appointments.data.totalPages}
          onChange={setPage}
        />
      </CardContent>
    </Card>
  );
}

function BillingSection({ hospitalSlug }: { hospitalSlug: string }) {
  const [page, setPage] = useState(1);
  const invoices = useQuery({
    queryKey: ["patient-portal-invoices", hospitalSlug, page],
    queryFn: () => listPortalInvoices(hospitalSlug, page),
  });

  if (invoices.isLoading) return <LoadingState label="Loading your billing..." />;
  if (invoices.isError) {
    return (
      <ErrorState
        title={getApiErrorMessage(invoices.error, "Billing could not be loaded.")}
        onRetry={() => void invoices.refetch()}
      />
    );
  }
  if (!invoices.data?.items.length) {
    return (
      <EmptyState
        title="No invoices yet"
        description="Invoices issued by this hospital will appear here."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invoices.data.items.map((invoice) => (
          <div key={invoice.id} className="rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{invoice.invoiceNumber}</p>
              <Badge variant="secondary">{invoice.invoiceStatus}</Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              Issued {invoice.issueDate}
              {invoice.dueDate ? ` · Due ${invoice.dueDate}` : ""}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <Info
                label="Total"
                value={`${invoice.currency} ${invoice.totalAmount}`}
              />
              <Info label="Paid" value={`${invoice.currency} ${invoice.amountPaid}`} />
              <Info label="Balance" value={`${invoice.currency} ${invoice.balanceDue}`} />
            </div>
          </div>
        ))}
        <Pagination
          page={invoices.data.page}
          totalPages={invoices.data.totalPages}
          onChange={setPage}
        />
      </CardContent>
    </Card>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
