import { describe, expect, it } from "vitest";
import {
  canAccessRoute,
  getVisibleNavigationGroups,
  hasNavigationPermission,
} from "./navigation";

describe("permission-aware navigation", () => {
  it("hides modules when the user lacks their required permission", () => {
    const groups = getVisibleNavigationGroups(["patient:read"]);
    const labels = groups.flatMap((group) => group.items.map((item) => item.label));

    expect(labels).toContain("Patients");
    expect(labels).not.toContain("Branches");
    expect(labels).not.toContain("Billing & Payments");
  });

  it("supports multiple-role effective permissions", () => {
    const permissions = ["appointment:read", "appointment:create", "payment:read"];

    expect(hasNavigationPermission({
      label: "Appointments",
      href: "/appointments",
      icon: getVisibleNavigationGroups(["appointment:read"])[0].items[0].icon,
      requiredPermissions: ["appointment:read"],
    }, permissions)).toBe(true);
  });

  it("only links Staff for members with staff:read", () => {
    const labelsFor = (permissions: string[]) =>
      getVisibleNavigationGroups(permissions)
        .flatMap((group) => group.items.map((item) => item.label));

    expect(labelsFor(["staff:read"])).toContain("Staff");
    expect(labelsFor(["patient:read"])).not.toContain("Staff");
  });

  it("uses any-permission behavior for scheduling", () => {
    const scheduling = getVisibleNavigationGroups(["schedule.read"])
      .flatMap((group) => group.items)
      .find((item) => item.href === "/scheduling");

    expect(scheduling).toBeDefined();
  });

  it("rejects deep links hidden from the sidebar for the same role", () => {
    expect(canAccessRoute("/settings", ["patient:read"])).toBe(false);
    expect(canAccessRoute("/settings/branding", ["tenant:read"])).toBe(true);
    expect(canAccessRoute("/patients/patient-1", ["patient:read"])).toBe(true);
  });

  it("allows scheduling with any supported scheduling permission", () => {
    expect(canAccessRoute("/scheduling", ["doctor.leave.read"])).toBe(true);
    expect(canAccessRoute("/scheduling", ["schedule.break.read"])).toBe(true);
    expect(canAccessRoute("/scheduling", ["appointment:read"])).toBe(false);
  });

  it("keeps notifications available to any authenticated hospital member", () => {
    expect(canAccessRoute("/notifications", [])).toBe(true);
  });
});
