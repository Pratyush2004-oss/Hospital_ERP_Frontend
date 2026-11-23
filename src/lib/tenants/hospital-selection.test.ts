import { describe, expect, it } from "vitest";
import type { TenantMembership } from "@/types/management";
import {
  describeMembershipState,
  isActiveMembership,
  listActiveMemberships,
  planHospitalSelection,
  resolveSelectableMembership,
} from "./hospital-selection";

function membership(
  tenantId: string,
  overrides: Partial<TenantMembership> = {},
): TenantMembership {
  return {
    id: `membership-${tenantId}`,
    tenantId,
    tenantName: `Hospital ${tenantId}`,
    tenantSlug: `hospital-${tenantId}`,
    tenantStatus: "ACTIVE",
    status: "ACTIVE",
    joinedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("hospital selection", () => {
  it("auto-selects the only active membership after login", () => {
    const active = membership("riverside");
    const pending = membership("northstar", { tenantStatus: "PENDING" });

    const plan = planHospitalSelection({
      memberships: [active, pending],
      activeTenantId: null,
    });

    expect(plan).toEqual({ kind: "auto-select", membership: active });
  });

  it("shows the chooser when several active memberships exist", () => {
    const first = membership("riverside");
    const second = membership("northstar");
    const suspended = membership("lakeside", { status: "SUSPENDED" });

    const plan = planHospitalSelection({
      memberships: [first, second, suspended],
      activeTenantId: null,
    });

    expect(plan.kind).toBe("choose");
    if (plan.kind !== "choose") return;
    expect(plan.memberships).toEqual([first, second]);
  });

  it("restores the server-side selection when that membership is still active", () => {
    const first = membership("riverside");
    const second = membership("northstar");

    const plan = planHospitalSelection({
      memberships: [first, second],
      activeTenantId: second.tenantId,
    });

    expect(plan).toEqual({ kind: "restore", membership: second });
  });

  it("ignores a stale server-side selection for an inactive membership", () => {
    const first = membership("riverside");
    const suspended = membership("northstar", { status: "SUSPENDED" });

    const plan = planHospitalSelection({
      memberships: [first, suspended],
      activeTenantId: suspended.tenantId,
    });

    // The stale selection is not restored; the single remaining active
    // hospital is selected automatically instead.
    expect(plan).toEqual({ kind: "auto-select", membership: first });
  });

  it("falls back to the chooser when a stale selection leaves several active hospitals", () => {
    const first = membership("riverside");
    const second = membership("northstar");
    const removed = membership("lakeside", { status: "REMOVED" });

    const plan = planHospitalSelection({
      memberships: [first, second, removed],
      activeTenantId: removed.tenantId,
    });

    expect(plan.kind).toBe("choose");
  });

  it("reports no active membership with the inactive memberships for context", () => {
    const pending = membership("riverside", { tenantStatus: "PENDING" });
    const suspended = membership("northstar", { status: "SUSPENDED" });

    const plan = planHospitalSelection({
      memberships: [pending, suspended],
      activeTenantId: pending.tenantId,
    });

    expect(plan).toEqual({ kind: "none", memberships: [pending, suspended] });
  });

  it("rejects an invalid membership selection before it reaches the API", () => {
    const active = membership("riverside");
    const pending = membership("northstar", { tenantStatus: "PENDING" });

    expect(resolveSelectableMembership([active, pending], "hospital-riverside")).toBe(
      active,
    );
    expect(resolveSelectableMembership([active, pending], "HOSPITAL-RIVERSIDE")).toBe(
      active,
    );
    expect(resolveSelectableMembership([active, pending], "hospital-northstar")).toBeUndefined();
    expect(resolveSelectableMembership([active], "unknown-hospital")).toBeUndefined();
    expect(resolveSelectableMembership([active], "   ")).toBeUndefined();
  });

  it("only treats ACTIVE hospitals with ACTIVE memberships as selectable", () => {
    expect(isActiveMembership({ tenantStatus: "ACTIVE", status: "ACTIVE" })).toBe(true);
    expect(isActiveMembership({ tenantStatus: "ACTIVE", status: "INVITED" })).toBe(false);
    expect(isActiveMembership({ tenantStatus: "PENDING", status: "ACTIVE" })).toBe(false);
    expect(
      listActiveMemberships([
        membership("riverside"),
        membership("northstar", { status: "SUSPENDED" }),
      ]).map((item) => item.tenantId),
    ).toEqual(["riverside"]);
  });

  it("describes why a membership cannot be opened", () => {
    expect(describeMembershipState({ tenantStatus: "PENDING", status: "ACTIVE" })).toBe(
      "Awaiting hospital approval",
    );
    expect(describeMembershipState({ tenantStatus: "ACTIVE", status: "INVITED" })).toBe(
      "Invitation not accepted",
    );
    expect(describeMembershipState({ tenantStatus: "ACTIVE", status: "SUSPENDED" })).toBe(
      "Membership suspended",
    );
    expect(describeMembershipState({ tenantStatus: "ACTIVE", status: "REMOVED" })).toBe(
      "Membership removed",
    );
  });
});
