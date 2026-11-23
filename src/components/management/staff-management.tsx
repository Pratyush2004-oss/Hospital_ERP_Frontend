"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitBranch, MailPlus, PauseCircle, Pencil, PlayCircle, Plus, RefreshCw, Send, ShieldCheck, Trash2, UserCog, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  assignMembershipBranches,
  assignMembershipRoles,
  changeMembershipLifecycle,
  createStaffRole,
  deleteStaffRole,
  inviteStaff,
  listPermissions,
  listStaffInvitations,
  listStaffRoles,
  listTenantStaff,
  resendStaffInvitation,
  revokeStaffInvitation,
  setStaffRolePermissions,
  updateStaffRole,
} from "@/lib/api/staff-service";
import { listBranches } from "@/lib/api/management-service";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import {
  ALL_FILTER,
  filterStaffMembers,
  HOSPITAL_WIDE_FILTER,
  paginateStaff,
  STAFF_PAGE_SIZE,
} from "@/lib/staff/staff-filters";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import { ALL_BRANCHES, useBranchContextStore } from "@/stores/branch-context-store";
import type { Branch, StaffInvitation, TenantStaffMember } from "@/types/management";
import type { StaffRole } from "@/types/staff";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BranchAssignmentDialog,
  InviteStaffDialog,
  MembershipLifecycleDialog,
  RoleAssignmentDialog,
  RoleFormDialog,
  type InviteStaffValue,
  type MembershipLifecycleValue,
  type RoleFormValue,
} from "./staff-dialogs";

const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INVITED: "Invitation pending",
  SUSPENDED: "Suspended",
  REMOVED: "Removed",
};

const INVITATION_STATUS_VARIANTS = {
  ACCEPTED: "success",
  INVITED: "warning",
  EXPIRED: "neutral",
  REVOKED: "neutral",
} as const;

const PAGE_SIZE = STAFF_PAGE_SIZE;

export function StaffManagement() {
  const permissions = useAuthStore(
    (state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS,
  );
  const currentUserId = useAuthStore((state) => state.session?.user.id);
  const canRead = permissions.includes("staff:read");
  const canInvite = permissions.includes("staff:create");
  const canUpdateMembership = permissions.includes("staff:update");
  const canRemoveMembership = permissions.includes("staff:delete");
  const canAssignRoles = permissions.includes("staff:assign_role");
  const canReadBranches = permissions.includes("branch:read");

  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"members" | "invitations" | "roles">("members");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleMember, setRoleMember] = useState<TenantStaffMember | null>(null);
  const [branchMember, setBranchMember] = useState<TenantStaffMember | null>(null);
  const [lifecycle, setLifecycle] = useState<{
    member: TenantStaffMember;
    action: MembershipLifecycleValue["action"];
  } | null>(null);
  const [roleForm, setRoleForm] = useState<{ role: StaffRole | null } | null>(null);

  const membersQuery = useQuery({
    queryKey: ["staff", "memberships"],
    queryFn: listTenantStaff,
    enabled: canRead,
  });
  const invitationsQuery = useQuery({
    queryKey: ["staff", "invitations"],
    queryFn: listStaffInvitations,
    enabled: canRead,
  });
  const rolesQuery = useQuery({
    queryKey: ["staff", "roles"],
    queryFn: listStaffRoles,
    enabled: canRead,
  });
  const branchesQuery = useQuery({
    queryKey: ["staff", "branches"],
    queryFn: () =>
      listBranches({ page: 1, pageSize: 100, sortBy: "name", sortOrder: "asc" }),
    enabled: canReadBranches,
  });
  const permissionsQuery = useQuery({
    queryKey: ["staff", "permissions"],
    queryFn: listPermissions,
    enabled: canAssignRoles,
  });

  async function invalidateStaffData() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["staff"] }),
      queryClient.invalidateQueries({ queryKey: ["tenant-staff"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-invitations"] }),
    ]);
  }

  const inviteMutation = useMutation({
    mutationFn: inviteStaff,
    onSuccess: async (result) => {
      await invalidateStaffData();
      setInviteOpen(false);
      toast.success(`Invitation sent to ${result.email}.`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const resendMutation = useMutation({
    mutationFn: resendStaffInvitation,
    onSuccess: async () => {
      await invalidateStaffData();
      toast.success("Invitation resent with a fresh link.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeStaffInvitation,
    onSuccess: async () => {
      await invalidateStaffData();
      toast.success("Invitation revoked.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const assignBranchesMutation = useMutation({
    mutationFn: ({ membershipId, branchIds }: { membershipId: string; branchIds: string[] }) =>
      assignMembershipBranches(membershipId, branchIds),
    onSuccess: async () => {
      await invalidateStaffData();
      setBranchMember(null);
      toast.success("Branch access updated.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const assignRolesMutation = useMutation({
    mutationFn: ({ membershipId, roleIds }: { membershipId: string; roleIds: string[] }) =>
      assignMembershipRoles(membershipId, roleIds),
    onSuccess: async () => {
      await invalidateStaffData();
      setRoleMember(null);
      toast.success("Roles updated.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({
      membershipId,
      action,
      reason,
    }: {
      membershipId: string;
      action: MembershipLifecycleValue["action"];
      reason: string;
    }) => changeMembershipLifecycle(membershipId, action, reason),
    onSuccess: async (membership) => {
      await invalidateStaffData();
      setLifecycle(null);
      toast.success(`Membership changed to ${membership.status}.`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const roleSaveMutation = useMutation({
    mutationFn: async ({ role, value }: { role: StaffRole | null; value: RoleFormValue }) => {
      if (role) {
        await updateStaffRole(role.id, {
          name: value.name,
          description: value.description || null,
        });
        await setStaffRolePermissions(role.id, value.permissions);
        return;
      }
      await createStaffRole({
        name: value.name,
        description: value.description || undefined,
        permissions: value.permissions,
      });
    },
    onSuccess: async () => {
      await invalidateStaffData();
      setRoleForm(null);
      toast.success("Role saved.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: deleteStaffRole,
    onSuccess: async () => {
      await invalidateStaffData();
      toast.success("Role deleted.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  if (!canRead) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Administration" title="Staff" />
        <ErrorState title="You are not authorized to view staff memberships." />
      </PageContainer>
    );
  }

  const members = membersQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const branches = branchesQuery.data?.branches ?? [];
  const self = members.find((member) => member.userId === currentUserId);
  const restrictedBranchIds = self?.branchIds ?? [];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Administration"
        title="Staff"
        description="Manage hospital memberships, invitations, roles and branch access for the currently selected hospital."
        actions={
          canInvite ? (
            <Button onClick={() => setInviteOpen(true)}>
              <MailPlus className="size-4" />
              Invite staff
            </Button>
          ) : null
        }
      />

      {!canInvite && !canAssignRoles ? (
        <Alert>
          <ShieldCheck className="size-4 text-primary" />
          <AlertTitle>Read-only staff view</AlertTitle>
          <AlertDescription>
            Your role can review memberships and invitations but cannot invite staff or assign
            roles.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "members" | "invitations" | "roles")}
      >
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="members">
            Members
            <Badge variant="secondary">{members.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations
            <Badge variant="secondary">
              {invitations.filter((invitation) => invitation.status === "INVITED").length}
            </Badge>
          </TabsTrigger>
          {canAssignRoles ? (
            <TabsTrigger value="roles">
              Roles
              <Badge variant="secondary">{roles.length}</Badge>
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="members">
          <MembersPanel
            members={members}
            roles={roles}
            branches={branches}
            canReadBranches={canReadBranches}
            canAssignRoles={canAssignRoles}
            canUpdateMembership={canUpdateMembership}
            canRemoveMembership={canRemoveMembership}
            currentUserId={currentUserId}
            onManageBranches={setBranchMember}
            onLifecycle={(member, action) => setLifecycle({ member, action })}
            isLoading={membersQuery.isLoading}
            isError={membersQuery.isError}
            onRetry={() => void membersQuery.refetch()}
            onAssignRoles={setRoleMember}
            onInvite={canInvite ? () => setInviteOpen(true) : undefined}
          />
        </TabsContent>

        <TabsContent value="invitations">
          <InvitationsPanel
            invitations={invitations}
            isLoading={invitationsQuery.isLoading}
            isError={invitationsQuery.isError}
            onRetry={() => void invitationsQuery.refetch()}
            canInvite={canInvite}
            busyId={
              resendMutation.isPending
                ? resendMutation.variables
                : revokeMutation.isPending
                  ? revokeMutation.variables
                  : null
            }
            onResend={(invitationId) => resendMutation.mutate(invitationId)}
            onRevoke={(invitationId) => revokeMutation.mutate(invitationId)}
            onInvite={() => setInviteOpen(true)}
          />
        </TabsContent>

        {canAssignRoles ? (
          <TabsContent value="roles">
            <RolesPanel
              roles={roles}
              members={members}
              isLoading={rolesQuery.isLoading}
              isError={rolesQuery.isError}
              permissionsLoading={permissionsQuery.isLoading}
              permissionsError={permissionsQuery.isError}
              onRetry={() => {
                void rolesQuery.refetch();
                void permissionsQuery.refetch();
              }}
              isDeleting={deleteRoleMutation.isPending}
              onCreate={() => setRoleForm({ role: null })}
              onEdit={(role) => setRoleForm({ role })}
              onDelete={(roleId) => deleteRoleMutation.mutate(roleId)}
            />
          </TabsContent>
        ) : null}
      </Tabs>

      {inviteOpen ? (
        <InviteStaffDialog
          open
          onOpenChange={(open) => { if (!open) setInviteOpen(false); }}
          roles={roles}
          branches={branches}
          restrictedBranchIds={restrictedBranchIds}
          canReadBranches={canReadBranches}
          canAssignRoles={canAssignRoles}
          scopeKnown={membersQuery.isSuccess}
          isPending={inviteMutation.isPending}
          onSubmit={(value: InviteStaffValue) =>
            inviteMutation.mutate({
              email: value.email,
              fullName: value.fullName,
              roleIds: value.roleIds,
              departmentIds: [],
              branchIds: value.branchIds,
            })
          }
        />
      ) : null}

      {branchMember ? (
        <BranchAssignmentDialog
          member={branchMember}
          branches={branches}
          canAssignHospitalWide={restrictedBranchIds.length === 0}
          isPending={assignBranchesMutation.isPending}
          onClose={() => setBranchMember(null)}
          onSubmit={(branchIds) =>
            assignBranchesMutation.mutate({ membershipId: branchMember.id, branchIds })
          }
        />
      ) : null}

      {roleMember ? (
        <RoleAssignmentDialog
          member={roleMember}
          roles={roles}
          isPending={assignRolesMutation.isPending}
          onClose={() => setRoleMember(null)}
          onSubmit={(roleIds) =>
            assignRolesMutation.mutate({ membershipId: roleMember.id, roleIds })
          }
        />
      ) : null}

      {lifecycle ? (
        <MembershipLifecycleDialog
          member={lifecycle.member}
          action={lifecycle.action}
          isPending={lifecycleMutation.isPending}
          onClose={() => setLifecycle(null)}
          onSubmit={(reason) =>
            lifecycleMutation.mutate({
              membershipId: lifecycle.member.id,
              action: lifecycle.action,
              reason,
            })
          }
        />
      ) : null}

      {roleForm ? (
        <RoleFormDialog
          key={roleForm.role?.id ?? "new-role"}
          role={roleForm.role}
          permissions={permissionsQuery.data ?? []}
          isPending={roleSaveMutation.isPending}
          onClose={() => setRoleForm(null)}
          onSubmit={(value) => roleSaveMutation.mutate({ role: roleForm.role, value })}
        />
      ) : null}
    </PageContainer>
  );
}

function MembersPanel({
  members,
  roles,
  branches,
  canReadBranches,
  canAssignRoles,
  canUpdateMembership,
  canRemoveMembership,
  currentUserId,
  isLoading,
  isError,
  onRetry,
  onAssignRoles,
  onManageBranches,
  onLifecycle,
  onInvite,
}: {
  members: TenantStaffMember[];
  roles: StaffRole[];
  branches: Branch[];
  canReadBranches: boolean;
  canAssignRoles: boolean;
  canUpdateMembership: boolean;
  canRemoveMembership: boolean;
  currentUserId: string | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onAssignRoles: (member: TenantStaffMember) => void;
  onManageBranches: (member: TenantStaffMember) => void;
  onLifecycle: (
    member: TenantStaffMember,
    action: MembershipLifecycleValue["action"],
  ) => void;
  onInvite?: () => void;
}) {
  const contextBranchId = useBranchContextStore((state) => state.selectedBranchId);
  const setSelectedBranch = useBranchContextStore((state) => state.setSelectedBranch);
  const branchFilter =
    contextBranchId === ALL_BRANCHES ? ALL_FILTER : contextBranchId;
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(ALL_FILTER);
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER);
  const [page, setPage] = useState(1);

  const branchNames = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  );

  const filtered = useMemo(
    () =>
      filterStaffMembers(members, {
        search,
        roleId: roleFilter,
        branchId: branchFilter,
        status: statusFilter,
      }),
    [branchFilter, members, roleFilter, search, statusFilter],
  );
  const pageData = paginateStaff(filtered, page, PAGE_SIZE);
  const hasFilters =
    search.trim() !== "" ||
    roleFilter !== ALL_FILTER ||
    branchFilter !== ALL_FILTER ||
    statusFilter !== ALL_FILTER;

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_180px_180px_auto]">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            resetPage();
          }}
          placeholder="Search staff name or email..."
          aria-label="Search staff"
        />
        <Select
          value={roleFilter}
          onValueChange={(value) => {
            setRoleFilter(value ?? ALL_FILTER);
            resetPage();
          }}
        >
          <SelectTrigger aria-label="Filter by role"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={branchFilter}
          onValueChange={(value) => {
            const next = value ?? ALL_FILTER;
            const branch = branches.find((item) => item.id === next);
            setSelectedBranch(next === ALL_FILTER ? ALL_BRANCHES : next, branch?.name ?? null);
            resetPage();
          }}
        >
          <SelectTrigger aria-label="Filter by branch"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All branches</SelectItem>
            <SelectItem value={HOSPITAL_WIDE_FILTER}>Hospital-wide</SelectItem>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value ?? ALL_FILTER);
            resetPage();
          }}
        >
          <SelectTrigger aria-label="Filter by membership status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INVITED">Invitation pending</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="REMOVED">Removed</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters ? (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setRoleFilter(ALL_FILTER);
              setSelectedBranch(ALL_BRANCHES, null);
              setStatusFilter(ALL_FILTER);
              resetPage();
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {isLoading ? <LoadingState label="Loading staff memberships..." /> : null}
      {isError ? <ErrorState title="Unable to load staff memberships" onRetry={onRetry} /> : null}

      {!isLoading && !isError ? (
        filtered.length === 0 ? (
          <EmptyState
            title={members.length === 0 ? "No staff members yet" : "No staff match these filters"}
            description={
              members.length === 0
                ? "Invite a staff member to create the first hospital membership."
                : "Adjust the search or filters to find a membership."
            }
          />
        ) : (
          <>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Branch access</TableHead>
                    {canAssignRoles || canUpdateMembership || canRemoveMembership ? (
                      <TableHead className="text-right">Actions</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.items.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <p className="font-medium">{member.fullName}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={
                            member.status === "ACTIVE"
                              ? "success"
                              : member.status === "INVITED"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {MEMBERSHIP_STATUS_LABELS[member.status] ?? member.status}
                        </StatusBadge>
                        {member.updatedAt ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Updated {new Date(member.updatedAt).toLocaleDateString()}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.roles.length > 0 ? (
                            member.roles.map((role) => (
                              <Badge key={role.id} variant="outline">{role.name}</Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No roles</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <BranchContext
                          branchIds={member.branchIds}
                          branchNames={branchNames}
                          canReadBranches={canReadBranches}
                        />
                      </TableCell>
                      {canAssignRoles || canUpdateMembership || canRemoveMembership ? (
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            {canAssignRoles ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onAssignRoles(member)}
                                >
                                  <UserCog className="size-4" />
                                  Manage roles
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onManageBranches(member)}
                                >
                                  <GitBranch className="size-4" />
                                  Branches
                                </Button>
                              </>
                            ) : null}
                            {member.userId !== currentUserId && canUpdateMembership && member.status === "ACTIVE" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onLifecycle(member, "suspend")}
                              >
                                <PauseCircle className="size-4" />
                                Suspend
                              </Button>
                            ) : null}
                            {member.userId !== currentUserId && canUpdateMembership && member.status === "SUSPENDED" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onLifecycle(member, "reactivate")}
                              >
                                <PlayCircle className="size-4" />
                                Reactivate
                              </Button>
                            ) : null}
                            {member.userId !== currentUserId && canRemoveMembership && (member.status === "ACTIVE" || member.status === "SUSPENDED") ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onLifecycle(member, "remove")}
                              >
                                <Trash2 className="size-4" />
                                Remove
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationFooter
              page={pageData.page}
              pageSize={PAGE_SIZE}
              total={pageData.total}
              totalPages={pageData.totalPages}
              label="members"
              onPrevious={() => setPage(Math.max(1, pageData.page - 1))}
              onNext={() => setPage(Math.min(pageData.totalPages, pageData.page + 1))}
            />
          </>
        )
      ) : null}

      {onInvite && members.length === 0 && !isLoading && !isError ? (
        <Button variant="outline" onClick={onInvite}>
          <Plus className="size-4" />
          Invite the first staff member
        </Button>
      ) : null}
    </div>
  );
}

function BranchContext({
  branchIds,
  branchNames,
  canReadBranches,
}: {
  branchIds: string[];
  branchNames: Map<string, string>;
  canReadBranches: boolean;
}) {
  if (branchIds.length === 0) {
    return <span className="text-xs text-muted-foreground">Hospital-wide</span>;
  }
  if (!canReadBranches) {
    return (
      <span className="text-xs text-muted-foreground">
        {branchIds.length} branch{branchIds.length === 1 ? "" : "es"} assigned
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {branchIds.map((branchId) => (
        <Badge key={branchId} variant="secondary">
          {branchNames.get(branchId) ?? "Unavailable branch"}
        </Badge>
      ))}
    </div>
  );
}

function InvitationsPanel({
  invitations,
  isLoading,
  isError,
  onRetry,
  canInvite,
  busyId,
  onResend,
  onRevoke,
  onInvite,
}: {
  invitations: StaffInvitation[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  canInvite: boolean;
  busyId: string | null;
  onResend: (invitationId: string) => void;
  onRevoke: (invitationId: string) => void;
  onInvite: () => void;
}) {
  const contextBranchId = useBranchContextStore((state) => state.selectedBranchId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL_FILTER);
  const [page, setPage] = useState(1);

  const filtered = invitations.filter((invitation) => {
    if (
      contextBranchId !== ALL_BRANCHES &&
      !invitation.branchIds.includes(contextBranchId)
    ) {
      return false;
    }
    const query = search.trim().toLowerCase();
    if (
      query &&
      !`${invitation.fullName ?? ""} ${invitation.email}`.toLowerCase().includes(query)
    ) {
      return false;
    }
    return status === ALL_FILTER || invitation.status === status;
  });
  const pageData = paginateStaff(filtered, page, PAGE_SIZE);

  return (
    <div className="space-y-4 pt-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(200px,1fr)_180px]">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search invitations by name or email..."
          aria-label="Search invitations"
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value ?? ALL_FILTER);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter invitations by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All invitation states</SelectItem>
            <SelectItem value="INVITED">Pending</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="REVOKED">Revoked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <LoadingState label="Loading invitations..." /> : null}
      {isError ? <ErrorState title="Unable to load invitations" onRetry={onRetry} /> : null}

      {!isLoading && !isError ? (
        filtered.length === 0 ? (
          <EmptyState
            title={invitations.length === 0 ? "No invitations yet" : "No invitations match these filters"}
            description={
              invitations.length === 0
                ? "Send an invitation to bring a staff member into this hospital."
                : "Adjust the search or status filter."
            }
          />
        ) : (
          <>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invitee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Branches</TableHead>
                    <TableHead>Expires</TableHead>
                    {canInvite ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.items.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <p className="font-medium">{invitation.fullName ?? invitation.email}</p>
                        <p className="text-xs text-muted-foreground">{invitation.email}</p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={INVITATION_STATUS_VARIANTS[invitation.status]}>
                          {invitation.status}
                        </StatusBadge>
                        {invitation.membershipStatus ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Membership: {invitation.membershipStatus}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {invitation.roles.length > 0 ? (
                            invitation.roles.map((role) => (
                              <Badge key={role.id} variant="outline">{role.name}</Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No roles</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {invitation.branches.length > 0 ? (
                            invitation.branches.map((branch) => (
                              <Badge key={branch.id} variant="secondary">{branch.name}</Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Hospital-wide</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </TableCell>
                      {canInvite ? (
                        <TableCell className="text-right">
                          {invitation.status === "INVITED" ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busyId === invitation.id}
                                onClick={() => onResend(invitation.id)}
                              >
                                <RefreshCw className="size-4" />
                                Resend
                              </Button>
                              <ConfirmDialog
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    disabled={busyId === invitation.id}
                                    aria-label={`Revoke invitation for ${invitation.email}`}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                }
                                title="Revoke this invitation?"
                                description="The invitation link stops working immediately. The membership is removed and a new invitation can be sent later."
                                onConfirm={() => onRevoke(invitation.id)}
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No action</span>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationFooter
              page={pageData.page}
              pageSize={PAGE_SIZE}
              total={pageData.total}
              totalPages={pageData.totalPages}
              label="invitations"
              onPrevious={() => setPage(Math.max(1, pageData.page - 1))}
              onNext={() => setPage(Math.min(pageData.totalPages, pageData.page + 1))}
            />
          </>
        )
      ) : null}

      {invitations.length === 0 && canInvite && !isLoading && !isError ? (
        <Button onClick={onInvite}>
          <Send className="size-4" />
          Send the first invitation
        </Button>
      ) : null}
    </div>
  );
}

function RolesPanel({
  roles,
  members,
  isLoading,
  isError,
  permissionsLoading,
  permissionsError,
  onRetry,
  isDeleting,
  onCreate,
  onEdit,
  onDelete,
}: {
  roles: StaffRole[];
  members: TenantStaffMember[];
  isLoading: boolean;
  isError: boolean;
  permissionsLoading: boolean;
  permissionsError: boolean;
  onRetry: () => void;
  isDeleting: boolean;
  onCreate: () => void;
  onEdit: (role: StaffRole) => void;
  onDelete: (roleId: string) => void;
}) {
  const memberCount = (roleId: string) =>
    members.filter((member) => member.roles.some((role) => role.id === roleId)).length;

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Hospital roles</h2>
          <p className="text-sm text-muted-foreground">
            Platform roles are never shown or editable here.
          </p>
        </div>
        <Button onClick={onCreate} disabled={permissionsLoading || permissionsError}>
          <Plus className="size-4" />
          Create role
        </Button>
      </div>

      {isLoading || permissionsLoading ? <LoadingState label="Loading hospital roles..." /> : null}
      {isError || permissionsError ? (
        <ErrorState title="Unable to load hospital roles or permissions" onRetry={onRetry} />
      ) : null}

      {!isLoading && !isError && !permissionsLoading && !permissionsError ? (
        roles.length === 0 ? (
          <EmptyState
            title="No hospital roles yet"
            description="Create a custom role to group permissions for this hospital."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                      {role.name}
                      {role.isSystem ? (
                        <Badge variant="outline">System</Badge>
                      ) : (
                        <Badge variant="secondary">Custom</Badge>
                      )}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {role.description ?? "No description."}
                    </p>
                  </div>
                  {!role.isSystem ? (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(role)}
                        aria-label={`Edit ${role.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={isDeleting}
                            aria-label={`Delete ${role.name}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        }
                        title={`Delete ${role.name}?`}
                        description="The backend will reject deletion while the role is still assigned to a membership."
                        onConfirm={() => onDelete(role.id)}
                      />
                    </div>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="size-3.5" />
                      {role.permissions.length} permissions
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {memberCount(role.id)} members
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 4).map((permission) => (
                      <Badge key={permission} variant="outline" className="font-mono text-[10px]">
                        {permission}
                      </Badge>
                    ))}
                    {role.permissions.length > 4 ? (
                      <Badge variant="secondary">+{role.permissions.length - 4} more</Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

function PaginationFooter({
  page,
  pageSize,
  total,
  totalPages,
  label,
  onPrevious,
  onNext,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  label: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {start}–{end} of {total} {label}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrevious}>
          Previous
        </Button>
        <span className="px-2 tabular-nums">Page {page} of {totalPages}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
