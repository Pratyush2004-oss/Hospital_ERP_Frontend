"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { listTenantMemberships, registerTenant } from "@/lib/api/management-service";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RegisterTenantInput } from "@/types/management";

const tenantFormSchema = z.object({
  name: z.string().trim().min(2, "Hospital name is required").max(200),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens").optional().or(z.literal("")),
  legalName: z.string().trim().max(255).optional(),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional(),
  timezone: z.string().trim().max(64).optional(),
});
type TenantFormValues = z.infer<typeof tenantFormSchema>;

const statusMap = {
  ACTIVE: "success",
  PENDING: "warning",
  SUSPENDED: "error",
  INACTIVE: "neutral",
} as const;

export function HospitalManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const memberships = useQuery({ queryKey: ["tenant-memberships"], queryFn: listTenantMemberships });
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: { name: "", slug: "", legalName: "", email: "", phone: "", timezone: "UTC" },
  });
  const createMutation = useMutation({
    mutationFn: (values: RegisterTenantInput) => registerTenant(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tenant-memberships"] });
      form.reset();
      setDialogOpen(false);
      toast.success("Hospital registration submitted.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const submit = form.handleSubmit((values) => {
    const input = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== "")) as RegisterTenantInput;
    createMutation.mutate(input);
  });

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Hospital administration"
        title="Hospitals"
        description="Hospitals available to your authenticated account."
        actions={<Button onClick={() => setDialogOpen(true)}><Plus className="size-4" />Register hospital</Button>}
      />
      <div className="mt-6">
        {memberships.isLoading ? <LoadingState label="Loading hospitals..." /> : null}
        {memberships.isError ? <ErrorState onRetry={() => void memberships.refetch()} /> : null}
        {memberships.data?.length === 0 ? <EmptyState title="No hospitals available" description="Your account is not associated with a hospital yet." /> : null}
        {memberships.data && memberships.data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {memberships.data.map((membership) => (
              <a key={membership.id} href={`/hospitals/${membership.tenantSlug}`} className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/50">
                <div className="flex items-start justify-between gap-3">
                  <Building2 className="size-5 text-primary" />
                  <StatusBadge status={statusMap[membership.tenantStatus]}>{membership.tenantStatus}</StatusBadge>
                </div>
                <h2 className="mt-4 font-semibold">{membership.tenantName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{membership.tenantSlug}</p>
                <p className="mt-4 text-xs text-muted-foreground">Membership: {membership.status}</p>
              </a>
            ))}
          </div>
        ) : null}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register a hospital</DialogTitle>
            <DialogDescription>The backend creates the hospital in pending status and assigns the registering user as administrator.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <Field label="Hospital name" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></Field>
            <Field label="Slug" error={form.formState.errors.slug?.message}><Input {...form.register("slug")} placeholder="riverside-care" /></Field>
            <Field label="Legal name" error={form.formState.errors.legalName?.message}><Input {...form.register("legalName")} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" error={form.formState.errors.email?.message}><Input type="email" {...form.register("email")} /></Field>
              <Field label="Phone" error={form.formState.errors.phone?.message}><Input {...form.register("phone")} /></Field>
            </div>
            <Field label="Timezone" error={form.formState.errors.timezone?.message}><Input {...form.register("timezone")} /></Field>
            <DialogFooter><Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Submitting..." : "Submit registration"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}{error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}</div>;
}
