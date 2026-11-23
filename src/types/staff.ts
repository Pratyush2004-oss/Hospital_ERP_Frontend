export type StaffRole = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
};

export type PermissionSummary = {
  key: string;
  module: string;
  description: string | null;
};

export type CreateRoleInput = {
  name: string;
  slug?: string;
  description?: string;
  permissions?: string[];
};

export type UpdateRoleInput = {
  name?: string;
  description?: string | null;
};

export type InviteStaffInput = {
  email: string;
  fullName?: string;
  roleIds: string[];
  departmentIds: string[];
  branchIds: string[];
};

export type StaffInvitationResult = {
  invitationId: string;
  email: string;
  expiresAt: string;
  membershipId: string | null;
  status: string;
};
