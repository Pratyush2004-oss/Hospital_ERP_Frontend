import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/client";
import {
  assignMembershipBranches,
  assignMembershipRoles,
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
} from "./staff-service";

vi.mock("@/lib/api/client", () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

describe("staff service", () => {
  beforeEach(() => mockedApiRequest.mockReset());

  it("loads tenant-scoped memberships and invitations", async () => {
    mockedApiRequest
      .mockResolvedValueOnce({ data: { memberships: [] } })
      .mockResolvedValueOnce({ data: { invitations: [] } });

    await listTenantStaff();
    await listStaffInvitations();

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, {
      method: "GET",
      url: "/tenant/memberships",
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, {
      method: "GET",
      url: "/tenant/staff/invitations",
    });
  });

  it("uses the existing invitation lifecycle contracts", async () => {
    mockedApiRequest.mockResolvedValue({
      data: { invitation: { invitationId: "invitation-1" } },
    });

    await inviteStaff({
      email: "person@example.test",
      fullName: "New Person",
      roleIds: ["role-1"],
      departmentIds: [],
      branchIds: ["branch-1"],
    });
    await resendStaffInvitation("invitation-1");
    await revokeStaffInvitation("invitation-1");

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, {
      method: "POST",
      url: "/tenant/staff/invitations",
      data: {
        email: "person@example.test",
        fullName: "New Person",
        roleIds: ["role-1"],
        departmentIds: [],
        branchIds: ["branch-1"],
      },
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, {
      method: "POST",
      url: "/tenant/staff/invitations/invitation-1/resend",
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(3, {
      method: "POST",
      url: "/tenant/staff/invitations/invitation-1/revoke",
    });
  });

  it("replaces membership roles through the existing RBAC endpoint", async () => {
    mockedApiRequest.mockResolvedValue({ data: { membership: {} } });

    await assignMembershipRoles("membership-1", ["role-1", "role-2"]);

    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "PUT",
      url: "/tenant/memberships/membership-1/roles",
      data: { roleIds: ["role-1", "role-2"] },
    });
  });

  it("replaces membership branch assignments through the tenant endpoint", async () => {
    mockedApiRequest.mockResolvedValue({
      data: { membership: { id: "membership-1", branchIds: ["branch-1"] } },
    });

    const membership = await assignMembershipBranches("membership-1", ["branch-1"]);

    expect(membership.branchIds).toEqual(["branch-1"]);
    expect(mockedApiRequest).toHaveBeenCalledWith({
      method: "PUT",
      url: "/tenant/memberships/membership-1/branches",
      data: { branchIds: ["branch-1"] },
    });
  });

  it("uses hospital role and permission catalogue endpoints", async () => {
    mockedApiRequest
      .mockResolvedValueOnce({ data: { roles: [] } })
      .mockResolvedValueOnce({ data: { permissions: [] } });

    await listStaffRoles();
    await listPermissions();

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, {
      method: "GET",
      url: "/tenant/roles",
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, {
      method: "GET",
      url: "/tenant/permissions",
    });
  });

  it("creates, edits, re-permissions and deletes custom roles", async () => {
    mockedApiRequest.mockResolvedValue({ data: { role: { id: "role-1" } } });

    await createStaffRole({
      name: "Front desk",
      description: "Reception",
      permissions: ["patient:read"],
    });
    await updateStaffRole("role-1", { name: "Reception", description: null });
    await setStaffRolePermissions("role-1", ["patient:read", "patient:create"]);
    await deleteStaffRole("role-1");

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, {
      method: "POST",
      url: "/tenant/roles",
      data: {
        name: "Front desk",
        description: "Reception",
        permissions: ["patient:read"],
      },
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, {
      method: "PATCH",
      url: "/tenant/roles/role-1",
      data: { name: "Reception", description: null },
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(3, {
      method: "PUT",
      url: "/tenant/roles/role-1/permissions",
      data: { permissions: ["patient:read", "patient:create"] },
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(4, {
      method: "DELETE",
      url: "/tenant/roles/role-1",
    });
  });
});
