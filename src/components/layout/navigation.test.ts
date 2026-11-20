import { describe, expect, it } from "vitest";
import { getVisibleNavigationGroups, hasNavigationPermission } from "./navigation";

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

  it("uses any-permission behavior for scheduling", () => {
    const scheduling = getVisibleNavigationGroups(["schedule.read"])
      .flatMap((group) => group.items)
      .find((item) => item.href === "/scheduling");

    expect(scheduling).toBeDefined();
  });
});
