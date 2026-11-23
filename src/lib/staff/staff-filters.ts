import type { TenantStaffMember } from "@/types/management";

export type StaffMemberFilters = {
  search: string;
  roleId: string;
  branchId: string;
  status: string;
};

export const ALL_FILTER = "all";
export const HOSPITAL_WIDE_FILTER = "hospital-wide";
export const STAFF_PAGE_SIZE = 10;

export function filterStaffMembers(
  members: readonly TenantStaffMember[],
  filters: StaffMemberFilters,
): TenantStaffMember[] {
  const search = filters.search.trim().toLowerCase();

  return members.filter((member) => {
    if (
      search &&
      !`${member.fullName} ${member.email}`.toLowerCase().includes(search)
    ) {
      return false;
    }

    if (
      filters.roleId !== ALL_FILTER &&
      !member.roles.some((role) => role.id === filters.roleId)
    ) {
      return false;
    }

    if (filters.branchId === HOSPITAL_WIDE_FILTER) {
      if (member.branchIds.length > 0) return false;
    } else if (
      filters.branchId !== ALL_FILTER &&
      !member.branchIds.includes(filters.branchId)
    ) {
      return false;
    }

    if (filters.status !== ALL_FILTER && member.status !== filters.status) {
      return false;
    }

    return true;
  });
}

export type StaffPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function paginateStaff<T>(
  items: readonly T[],
  page: number,
  pageSize = STAFF_PAGE_SIZE,
): StaffPage<T> {
  const size = Math.max(1, Math.floor(pageSize));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (safePage - 1) * size;

  return {
    items: items.slice(start, start + size),
    page: safePage,
    pageSize: size,
    total,
    totalPages,
  };
}
