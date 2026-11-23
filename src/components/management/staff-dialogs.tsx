"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { Branch, TenantStaffMember } from "@/types/management";
import type { PermissionSummary, StaffRole } from "@/types/staff";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/shared/combobox";
import { FormField } from "@/components/shared/form-field";
import { FormActions } from "@/components/shared/form-actions";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type InviteStaffValue = {
  email: string;
  fullName?: string;
  roleIds: string[];
  branchIds: string[];
};

const inviteStaffSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  fullName: z.string().trim().max(200, "Keep the name under 200 characters."),
  roleIds: z.array(z.string()).max(10, "Select up to 10 roles."),
  branchIds: z.array(z.string()),
});
type InviteStaffFormValues = z.infer<typeof inviteStaffSchema>;

export function InviteStaffDialog({
  open,
  onOpenChange,
  roles,
  branches,
  restrictedBranchIds,
  canReadBranches,
  canAssignRoles,
  scopeKnown,
  isPending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: StaffRole[];
  branches: Branch[];
  restrictedBranchIds: string[];
  canReadBranches: boolean;
  canAssignRoles: boolean;
  /** False until the caller's own membership (and branch scope) is loaded. */
  scopeKnown: boolean;
  isPending: boolean;
  onSubmit: (value: InviteStaffValue) => void;
}) {
  const form = useForm<InviteStaffFormValues>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { email: "", fullName: "", roleIds: [], branchIds: [] },
  });
  const roleIds = useWatch({ control: form.control, name: "roleIds" }) ?? [];
  const branchIds = useWatch({ control: form.control, name: "branchIds" }) ?? [];

  const branchRestricted = restrictedBranchIds.length > 0;
  const availableBranches = branchRestricted
    ? branches.filter((branch) => restrictedBranchIds.includes(branch.id))
    : branches;
  const branchSelectionBlocked =
    !scopeKnown || (canReadBranches && branchRestricted && availableBranches.length === 0);
  const selectionRequired = canReadBranches && branchRestricted && availableBranches.length > 0;

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
  }

  const submit = form.handleSubmit((values) => {
    if (selectionRequired && values.branchIds.length === 0) {
      form.setError("branchIds", {
        type: "manual",
        message: "Select at least one branch assigned to your membership.",
      });
      return;
    }
    onSubmit({
      email: values.email.trim(),
      fullName: values.fullName.trim() || undefined,
      roleIds: canAssignRoles ? values.roleIds : [],
      branchIds: canReadBranches ? values.branchIds : restrictedBranchIds,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Invite a staff member</DialogTitle>
          <DialogDescription>
            The invitation uses the existing email workflow. Access begins only after the
            recipient accepts.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit} noValidate>
          <FormField id="staff-email" label="Email" required error={form.formState.errors.email?.message}>
            <Input type="email" autoComplete="email" required {...form.register("email")} />
          </FormField>
          <FormField id="staff-name" label="Full name" description="Optional. If provided, it is used on the invitation and membership." error={form.formState.errors.fullName?.message}>
            <Input maxLength={200} {...form.register("fullName")} />
          </FormField>

          {canAssignRoles ? (
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Roles</legend>
              <p className="text-xs text-muted-foreground">
                Roles are granted when the invitation is accepted. Leave empty to invite without
                access.
              </p>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                {roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hospital roles are available.</p>
                ) : (
                  roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-start gap-2 text-sm"
                      htmlFor={`invite-role-${role.id}`}
                    >
                      <Checkbox
                        id={`invite-role-${role.id}`}
                        checked={roleIds.includes(role.id)}
                        disabled={roleIds.length >= 10 && !roleIds.includes(role.id)}
                        onCheckedChange={() =>
                          form.setValue("roleIds", toggle(roleIds, role.id), {
                            shouldDirty: true,
                          })
                        }
                      />
                      <span>
                        <span className="font-medium">{role.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {role.permissions.length} permissions
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">Select up to 10 roles.</p>
            </fieldset>
          ) : (
            <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              Your role can send invitations but cannot assign roles. A hospital administrator can
              assign access after the invitation is accepted.
            </p>
          )}

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Branch access</legend>
            {!scopeKnown ? (
              <p className="text-xs text-muted-foreground">
                Loading your membership branch scope before an invitation can be sent.
              </p>
            ) : !canReadBranches ? (
              <p className="text-xs text-muted-foreground">
                {branchRestricted
                  ? `The invitation will be limited to your ${restrictedBranchIds.length} assigned branch${restrictedBranchIds.length === 1 ? "" : "es"}.`
                  : "Branch details are not available to your role, so the invitation will be hospital-wide."}
              </p>
            ) : branchSelectionBlocked ? (
              <p className="text-xs text-destructive">
                Your membership has no accessible branch for this invitation. Ask an administrator
                to update your branch access.
              </p>
            ) : availableBranches.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active branches exist yet.</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {selectionRequired
                    ? "Select at least one branch you manage."
                    : "Leave all unchecked for hospital-wide access."}
                </p>
                <Combobox
                  id="invite-branches"
                  multiple
                  options={availableBranches.map((branch) => ({
                    value: branch.id,
                    label: branch.name,
                    description: branch.branchCode,
                  }))}
                  value={branchIds}
                  onValueChange={(value) =>
                    form.setValue(
                      "branchIds",
                      Array.isArray(value) ? value : [value],
                      { shouldDirty: true },
                    )
                  }
                  aria-invalid={Boolean(form.formState.errors.branchIds)}
                  aria-describedby={
                    form.formState.errors.branchIds
                      ? "invite-branches-error"
                      : undefined
                  }
                  aria-label="Branch access"
                  placeholder="Select branch access"
                  searchPlaceholder="Search branches..."
                  emptyMessage="No branches found."
                />
              </>
            )}
          </fieldset>

          {form.formState.errors.branchIds?.message ? (
            <p id="invite-branches-error" className="text-sm text-destructive" role="alert">
              {form.formState.errors.branchIds.message}
            </p>
          ) : null}

          <FormActions
            isPending={isPending}
            disabled={branchSelectionBlocked}
            onCancel={() => onOpenChange(false)}
            submitLabel="Send invitation"
            pendingLabel="Sending..."
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RoleAssignmentDialog({
  member,
  roles,
  isPending,
  onClose,
  onSubmit,
}: {
  member: TenantStaffMember;
  roles: StaffRole[];
  isPending: boolean;
  onClose: () => void;
  onSubmit: (roleIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(member.roles.map((role) => role.id));

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign roles</DialogTitle>
          <DialogDescription>
            Choose the roles for {member.fullName}. Saving replaces the member&apos;s current roles.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {roles.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              No hospital roles are available.
            </p>
          ) : (
            roles.map((role) => (
              <label
                key={role.id}
                className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                htmlFor={`assign-role-${role.id}`}
              >
                <Checkbox
                  id={`assign-role-${role.id}`}
                  checked={selected.includes(role.id)}
                  onCheckedChange={() => toggle(role.id)}
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{role.name}</span>
                    {role.isSystem ? <Badge variant="outline">System</Badge> : null}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {role.description ?? `${role.permissions.length} permissions`}
                  </span>
                </span>
              </label>
            ))
          )}
        </div>
        {selected.length === 0 ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Saving with no roles removes this member&apos;s hospital access until a role is assigned
            again.
          </p>
        ) : null}
        <FormActions
          isPending={isPending}
          onCancel={onClose}
          onSubmit={() => onSubmit(selected)}
          submitLabel="Save roles"
        />
      </DialogContent>
    </Dialog>
  );
}

export function BranchAssignmentDialog({
  member,
  branches,
  canAssignHospitalWide,
  isPending,
  onClose,
  onSubmit,
}: {
  member: TenantStaffMember;
  branches: Branch[];
  canAssignHospitalWide: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (branchIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(member.branchIds);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage branch access</DialogTitle>
          <DialogDescription>
            Choose which branches {member.fullName} can manage. This controls staff and
            invitation management scope; operational data access still requires RBAC.
          </DialogDescription>
        </DialogHeader>
        <FormField
          id="member-branches"
          label="Branches"
          description="Search and select every branch this member can manage."
        >
          <Combobox
            id="member-branches"
            multiple
            options={branches.map((branch) => ({
              value: branch.id,
              label: branch.name,
              description: `${branch.branchCode} · ${branch.timezone}`,
            }))}
            value={selected}
            onValueChange={(value) =>
              setSelected(Array.isArray(value) ? value : [value])
            }
            placeholder="Select branches"
            searchPlaceholder="Search branches..."
            emptyMessage="No branches are available in your scope."
          />
        </FormField>
        {selected.length === 0 ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {canAssignHospitalWide
              ? "No branches selected means hospital-wide access. Choose specific branches if this member should be restricted."
              : "Select at least one branch. Your own access is branch-restricted, so you cannot grant hospital-wide access."}
          </p>
        ) : null}
        <FormActions
          isPending={isPending}
          disabled={!canAssignHospitalWide && selected.length === 0}
          onCancel={onClose}
          onSubmit={() => onSubmit(selected)}
          submitLabel="Save branch access"
        />
      </DialogContent>
    </Dialog>
  );
}

export type MembershipLifecycleValue = {
  action: "suspend" | "reactivate" | "remove";
  reason: string;
};

const membershipLifecycleSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Enter a reason of at least 3 characters.")
    .max(500, "Keep the reason under 500 characters."),
});
type MembershipLifecycleFormValues = z.infer<typeof membershipLifecycleSchema>;

const roleFormSchema = z.object({
  name: z.string().trim().min(2, "Role name must be at least 2 characters.").max(100),
  description: z.string().trim().max(500),
  permissions: z.array(z.string()),
});
type RoleFormValues = z.infer<typeof roleFormSchema>;

export function MembershipLifecycleDialog({
  member,
  action,
  isPending,
  onClose,
  onSubmit,
}: {
  member: TenantStaffMember;
  action: MembershipLifecycleValue["action"];
  isPending: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const form = useForm<MembershipLifecycleFormValues>({
    resolver: zodResolver(membershipLifecycleSchema),
    defaultValues: { reason: "" },
  });
  const submit = form.handleSubmit((values) => onSubmit(values.reason));
  const title =
    action === "suspend"
      ? `Suspend ${member.fullName}?`
      : action === "reactivate"
        ? `Reactivate ${member.fullName}?`
        : `Remove ${member.fullName}?`;
  const description =
    action === "suspend"
      ? "Hospital access is blocked immediately. Their global account, historical records and assigned roles are preserved."
      : action === "reactivate"
        ? "The membership returns to ACTIVE. Their existing roles and branch assignments apply again."
        : "The membership becomes REMOVED and cannot be reactivated. Invite the person again if they return. Historical records are preserved.";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit} noValidate>
          <FormField
            id="membership-reason"
            label="Reason"
            required
            description="At least 3 characters. Recorded in the hospital audit log."
            error={form.formState.errors.reason?.message}
          >
            <Textarea
              placeholder="Explain why this membership is changing"
              maxLength={500}
              rows={4}
              {...form.register("reason")}
            />
          </FormField>
          <FormActions
            isPending={isPending}
            onCancel={onClose}
            submitVariant={action === "remove" ? "destructive" : "default"}
            submitLabel={action === "suspend" ? "Suspend membership" : action === "reactivate" ? "Reactivate membership" : "Remove membership"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type RoleFormValue = {
  name: string;
  description: string;
  permissions: string[];
};

export function RoleFormDialog({
  role,
  permissions,
  isPending,
  onClose,
  onSubmit,
}: {
  role: StaffRole | null;
  permissions: PermissionSummary[];
  isPending: boolean;
  onClose: () => void;
  onSubmit: (value: RoleFormValue) => void;
}) {
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: role?.name ?? "",
      description: role?.description ?? "",
      permissions: role?.permissions ?? [],
    },
  });
  const selected = useWatch({ control: form.control, name: "permissions" }) ?? [];
  const [permissionSearch, setPermissionSearch] = useState("");
  const submit = form.handleSubmit((values) =>
    onSubmit({ ...values, description: values.description.trim() }),
  );

  const grouped = useMemo(() => {
    const search = permissionSearch.trim().toLowerCase();
    const visible = permissions.filter(
      (permission) =>
        !search ||
        permission.key.toLowerCase().includes(search) ||
        permission.module.toLowerCase().includes(search) ||
        (permission.description ?? "").toLowerCase().includes(search),
    );
    const map = new Map<string, PermissionSummary[]>();
    for (const permission of visible) {
      const list = map.get(permission.module) ?? [];
      list.push(permission);
      map.set(permission.module, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissionSearch, permissions]);

  function toggle(key: string) {
    const current = form.getValues("permissions");
    form.setValue(
      "permissions",
      current.includes(key)
        ? current.filter((entry) => entry !== key)
        : [...current, key],
      { shouldDirty: true },
    );
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{role ? `Edit ${role.name}` : "Create a custom role"}</DialogTitle>
          <DialogDescription>
            Custom roles belong only to this hospital. Platform roles are never available here.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <FormField id="role-name" label="Role name" required error={form.formState.errors.name?.message}>
            <Input maxLength={100} {...form.register("name")} />
          </FormField>
          <FormField id="role-description" label="Description" description="Optional. Explain what this role is for." error={form.formState.errors.description?.message}>
            <Textarea maxLength={500} rows={3} {...form.register("description")} />
          </FormField>
          <fieldset className="grid gap-2">
            <legend className="flex w-full flex-wrap items-center justify-between gap-2 text-sm font-medium">
              <span>Permissions</span>
              <Badge variant="secondary">{selected.length} selected</Badge>
            </legend>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={permissionSearch}
                onChange={(event) => setPermissionSearch(event.target.value)}
                placeholder="Filter permissions..."
                className="pl-9"
                aria-label="Filter permissions"
              />
            </div>
            <div className="max-h-72 space-y-4 overflow-y-auto rounded-lg border p-3">
              {grouped.length === 0 ? (
                <p className="text-sm text-muted-foreground">No permissions match this filter.</p>
              ) : (
                grouped.map(([module, entries]) => (
                  <section key={module} className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {module}
                    </h4>
                    {entries.map((permission) => (
                      <label
                        key={permission.key}
                        className="flex items-start gap-2 text-sm"
                        htmlFor={`permission-${permission.key}`}
                      >
                        <Checkbox
                          id={`permission-${permission.key}`}
                          checked={selected.includes(permission.key)}
                          onCheckedChange={() => toggle(permission.key)}
                        />
                        <span>
                          <span className="font-mono text-xs">{permission.key}</span>
                          {permission.description ? (
                            <span className="block text-xs text-muted-foreground">
                              {permission.description}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </section>
                ))
              )}
            </div>
          </fieldset>

          <FormActions
            isPending={isPending}
            onCancel={onClose}
            submitLabel={role ? "Save role" : "Create role"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
