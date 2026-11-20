"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { ReactNode } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Branch, BranchInput, UpdateBranchInput } from "@/types/management";

const branchFormSchema = z.object({
  name: z.string().trim().min(2, "Branch name is required").max(200),
  branchCode: z.string().trim().min(2, "Branch code is required").max(50).regex(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/, "Use letters, numbers and hyphens"),
  contactEmail: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  contactPhone: z.string().trim().max(32).optional(),
  addressLine1: z.string().trim().max(255).optional(),
  addressLine2: z.string().trim().max(255).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().length(2, "Use a 2-letter country code").optional(),
  timezone: z.string().trim().min(1, "Timezone is required").max(64),
});
type BranchFormValues = z.infer<typeof branchFormSchema>;

export function BranchForm({
  branch,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  branch: Branch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: BranchInput | UpdateBranchInput) => void;
  isPending: boolean;
}) {
  const form = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    values: {
      name: branch?.name ?? "",
      branchCode: branch?.branchCode ?? "",
      contactEmail: branch?.contactEmail ?? "",
      contactPhone: branch?.contactPhone ?? "",
      addressLine1: branch?.addressLine1 ?? "",
      addressLine2: branch?.addressLine2 ?? "",
      city: branch?.city ?? "",
      state: branch?.state ?? "",
      postalCode: branch?.postalCode ?? "",
      country: branch?.country ?? "",
      timezone: branch?.timezone ?? "UTC",
    },
  });
  const submit = form.handleSubmit((values) => {
    const input = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== ""),
    ) as Partial<BranchFormValues>;
    if (branch) {
      onSubmit({
        name: values.name,
        contactEmail: values.contactEmail || null,
        contactPhone: values.contactPhone || null,
        addressLine1: values.addressLine1 || null,
        addressLine2: values.addressLine2 || null,
        city: values.city || null,
        state: values.state || null,
        postalCode: values.postalCode || null,
        country: values.country || null,
        timezone: values.timezone,
      });
    } else {
      onSubmit({
        name: input.name ?? "",
        branchCode: input.branchCode ?? "",
        ...input,
      } as BranchInput);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{branch ? "Edit branch" : "Create branch"}</DialogTitle><DialogDescription>{branch ? "Update the branch details supported by the hospital API." : "Create a branch for the active hospital tenant."}</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Branch name" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></Field>
            <Field label="Branch code" error={form.formState.errors.branchCode?.message}><Input disabled={Boolean(branch)} {...form.register("branchCode")} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact email" error={form.formState.errors.contactEmail?.message}><Input type="email" {...form.register("contactEmail")} /></Field>
            <Field label="Contact phone" error={form.formState.errors.contactPhone?.message}><Input {...form.register("contactPhone")} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address line 1" error={form.formState.errors.addressLine1?.message}><Input {...form.register("addressLine1")} /></Field>
            <Field label="Address line 2" error={form.formState.errors.addressLine2?.message}><Input {...form.register("addressLine2")} /></Field>
            <Field label="City" error={form.formState.errors.city?.message}><Input {...form.register("city")} /></Field>
            <Field label="State" error={form.formState.errors.state?.message}><Input {...form.register("state")} /></Field>
            <Field label="Postal code" error={form.formState.errors.postalCode?.message}><Input {...form.register("postalCode")} /></Field>
            <Field label="Country code" error={form.formState.errors.country?.message}><Input maxLength={2} {...form.register("country")} /></Field>
          </div>
          <Field label="Timezone" error={form.formState.errors.timezone?.message}><Input {...form.register("timezone")} /></Field>
          <DialogFooter><Button type="submit" disabled={isPending}>{isPending ? "Saving..." : branch ? "Save changes" : "Create branch"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}{error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}</div>;
}
