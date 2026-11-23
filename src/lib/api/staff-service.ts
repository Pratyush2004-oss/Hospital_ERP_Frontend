import { apiRequest } from "@/lib/api/client";
import type { StaffInvitation, TenantStaffMember } from "@/types/management";
import type {
  CreateRoleInput,
  InviteStaffInput,
  PermissionSummary,
  StaffInvitationResult,
  StaffRole,
  UpdateRoleInput,
} from "@/types/staff";

/** Staff membership and invitation APIs. Tenant and branch scope are server-side. */

export async function listTenantStaff(): Promise<TenantStaffMember[]> {
  const response = await apiRequest<{ memberships: TenantStaffMember[] }>({
    method: "GET",
    url: "/tenant/memberships",
  });
  return response.data.memberships;
}

export async function listStaffInvitations(): Promise<StaffInvitation[]> {
  const response = await apiRequest<{ invitations: StaffInvitation[] }>({
    method: "GET",
    url: "/tenant/staff/invitations",
  });
  return response.data.invitations;
}

export async function inviteStaff(input: InviteStaffInput): Promise<StaffInvitationResult> {
  const response = await apiRequest<{ invitation: StaffInvitationResult }>({
    method: "POST",
    url: "/tenant/staff/invitations",
    data: input,
  });
  return response.data.invitation;
}

export async function resendStaffInvitation(invitationId: string): Promise<StaffInvitationResult> {
  const response = await apiRequest<{ invitation: StaffInvitationResult }>({
    method: "POST",
    url: `/tenant/staff/invitations/${invitationId}/resend`,
  });
  return response.data.invitation;
}

export async function revokeStaffInvitation(invitationId: string): Promise<void> {
  await apiRequest<undefined>({
    method: "POST",
    url: `/tenant/staff/invitations/${invitationId}/revoke`,
  });
}

export async function listStaffRoles(): Promise<StaffRole[]> {
  const response = await apiRequest<{ roles: StaffRole[] }>({
    method: "GET",
    url: "/tenant/roles",
  });
  return response.data.roles;
}

export async function listPermissions(): Promise<PermissionSummary[]> {
  const response = await apiRequest<{ permissions: PermissionSummary[] }>({
    method: "GET",
    url: "/tenant/permissions",
  });
  return response.data.permissions;
}

export async function assignMembershipRoles(
  membershipId: string,
  roleIds: string[],
): Promise<void> {
  await apiRequest<unknown>({
    method: "PUT",
    url: `/tenant/memberships/${membershipId}/roles`,
    data: { roleIds },
  });
}

/** Empty branchIds means hospital-wide access; the backend authorizes the scope. */
export async function assignMembershipBranches(
  membershipId: string,
  branchIds: string[],
): Promise<TenantStaffMember> {
  const response = await apiRequest<{ membership: TenantStaffMember }>({
    method: "PUT",
    url: `/tenant/memberships/${membershipId}/branches`,
    data: { branchIds },
  });
  return response.data.membership;
}

export type MembershipLifecycleAction = "suspend" | "reactivate" | "remove";

export async function changeMembershipLifecycle(
  membershipId: string,
  action: MembershipLifecycleAction,
  reason: string,
): Promise<TenantStaffMember> {
  const response = await apiRequest<{ membership: TenantStaffMember }>({
    method: "POST",
    url: `/tenant/memberships/${membershipId}/${action}`,
    data: { reason },
  });
  return response.data.membership;
}

export async function createStaffRole(input: CreateRoleInput): Promise<StaffRole> {
  const response = await apiRequest<{ role: StaffRole }>({
    method: "POST",
    url: "/tenant/roles",
    data: input,
  });
  return response.data.role;
}

export async function updateStaffRole(
  roleId: string,
  input: UpdateRoleInput,
): Promise<StaffRole> {
  const response = await apiRequest<{ role: StaffRole }>({
    method: "PATCH",
    url: `/tenant/roles/${roleId}`,
    data: input,
  });
  return response.data.role;
}

export async function setStaffRolePermissions(
  roleId: string,
  permissions: string[],
): Promise<StaffRole> {
  const response = await apiRequest<{ role: StaffRole }>({
    method: "PUT",
    url: `/tenant/roles/${roleId}/permissions`,
    data: { permissions },
  });
  return response.data.role;
}

export async function deleteStaffRole(roleId: string): Promise<void> {
  await apiRequest<undefined>({
    method: "DELETE",
    url: `/tenant/roles/${roleId}`,
  });
}
