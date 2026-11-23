"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { FormFooter, useUnsavedChanges } from "@/components/shared/form-actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  useUnsavedChanges(open && form.formState.isDirty);
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
            <FormField id="branch-name" label="Branch name" required error={form.formState.errors.name?.message}><Input {...form.register("name")} /></FormField>
            <FormField id="branch-code" label="Branch code" required description="Letters, numbers and hyphens. The code is fixed after creation." error={form.formState.errors.branchCode?.message}><Input disabled={Boolean(branch)} {...form.register("branchCode")} /></FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="branch-email" label="Contact email" error={form.formState.errors.contactEmail?.message}><Input type="email" autoComplete="email" {...form.register("contactEmail")} /></FormField>
            <FormField id="branch-phone" label="Contact phone" error={form.formState.errors.contactPhone?.message}><Input type="tel" autoComplete="tel" {...form.register("contactPhone")} /></FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="branch-address-1" label="Address line 1" error={form.formState.errors.addressLine1?.message}><Input autoComplete="address-line1" {...form.register("addressLine1")} /></FormField>
            <FormField id="branch-address-2" label="Address line 2" error={form.formState.errors.addressLine2?.message}><Input autoComplete="address-line2" {...form.register("addressLine2")} /></FormField>
            <FormField id="branch-city" label="City" error={form.formState.errors.city?.message}><Input autoComplete="address-level2" {...form.register("city")} /></FormField>
            <FormField id="branch-state" label="State" error={form.formState.errors.state?.message}><Input autoComplete="address-level1" {...form.register("state")} /></FormField>
            <FormField id="branch-postal" label="Postal code" error={form.formState.errors.postalCode?.message}><Input autoComplete="postal-code" {...form.register("postalCode")} /></FormField>
            <FormField id="branch-country" label="Country code" description="Two-letter ISO country code." error={form.formState.errors.country?.message}><Input maxLength={2} autoComplete="country" {...form.register("country")} /></FormField>
          </div>
          <FormField id="branch-timezone" label="Timezone" required description="IANA timezone used for schedules and appointment times." error={form.formState.errors.timezone?.message}><Input autoComplete="off" {...form.register("timezone")} /></FormField>
          <FormFooter isPending={isPending} onCancel={() => onOpenChange(false)} submitLabel={branch ? "Save changes" : "Create branch"} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

