import { describe, expect, it } from "vitest";
import type { TenantStaffMember } from "@/types/management";
import {
  ALL_FILTER,
  filterStaffMembers,
  HOSPITAL_WIDE_FILTER,
  paginateStaff,
} from "./staff-filters";

function member(
  overrides: Partial<TenantStaffMember> & Pick<TenantStaffMember, "id" | "fullName" | "email">,
): TenantStaffMember {
  return {
    userId: `user-${overrides.id}`,
    phone: null,
    status: "ACTIVE",
    joinedAt: null,
    branchIds: [],
    departmentIds: [],
    roles: [],
    ...overrides,
  };
}

const members: TenantStaffMember[] = [
  member({
    id: "1",
    fullName: "Avery Johnson",
    email: "avery@example.test",
    branchIds: ["branch-a"],
    roles: [{ id: "role-doctor", slug: "doctor", name: "Doctor" }],
  }),
  member({
    id: "2",
    fullName: "Riley Patel",
    email: "riley@example.test",
    status: "INVITED",
    branchIds: ["branch-b"],
    roles: [{ id: "role-nurse", slug: "nurse", name: "Nurse" }],
  }),
  member({
    id: "3",
    fullName: "Morgan Chen",
    email: "morgan@example.test",
    status: "SUSPENDED",
  }),
];

const defaults = {
  search: "",
  roleId: ALL_FILTER,
  branchId: ALL_FILTER,
  status: ALL_FILTER,
};

describe("staff member filters", () => {
  it("searches name and email case-insensitively", () => {
    expect(filterStaffMembers(members, { ...defaults, search: "riley" }).map((m) => m.id)).toEqual([
      "2",
    ]);
    expect(
      filterStaffMembers(members, { ...defaults, search: "AVERY@EXAMPLE" }).map((m) => m.id),
    ).toEqual(["1"]);
    expect(filterStaffMembers(members, { ...defaults, search: "nobody" })).toHaveLength(0);
  });

  it("filters by role and membership status", () => {
    expect(
      filterStaffMembers(members, { ...defaults, roleId: "role-nurse" }).map((m) => m.id),
    ).toEqual(["2"]);
    expect(
      filterStaffMembers(members, { ...defaults, status: "SUSPENDED" }).map((m) => m.id),
    ).toEqual(["3"]);
  });

  it("filters by branch and distinguishes hospital-wide memberships", () => {
    expect(
      filterStaffMembers(members, { ...defaults, branchId: "branch-a" }).map((m) => m.id),
    ).toEqual(["1"]);
    expect(
      filterStaffMembers(members, { ...defaults, branchId: HOSPITAL_WIDE_FILTER }).map(
        (m) => m.id,
      ),
    ).toEqual(["3"]);
  });

  it("combines filters", () => {
    expect(
      filterStaffMembers(members, {
        search: "a",
        roleId: "role-doctor",
        branchId: "branch-a",
        status: "ACTIVE",
      }).map((m) => m.id),
    ).toEqual(["1"]);
  });
});

describe("staff pagination", () => {
  const items = Array.from({ length: 23 }, (_, index) => index + 1);

  it("returns the requested page and total page count", () => {
    expect(paginateStaff(items, 1, 10)).toMatchObject({
      items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      page: 1,
      pageSize: 10,
      total: 23,
      totalPages: 3,
    });
    expect(paginateStaff(items, 3, 10).items).toEqual([21, 22, 23]);
  });

  it("clamps out-of-range pages and always reports at least one page", () => {
    expect(paginateStaff(items, 99, 10).page).toBe(3);
    expect(paginateStaff(items, 0, 10).page).toBe(1);
    expect(paginateStaff([], 1, 10)).toMatchObject({
      items: [],
      page: 1,
      total: 0,
      totalPages: 1,
    });
  });
});
