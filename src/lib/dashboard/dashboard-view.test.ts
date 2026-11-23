import { describe, expect, it } from "vitest";
import {
  appointmentStatusSeries,
  dashboardBranchFilter,
  dashboardPermissionFlags,
  dashboardRangeDays,
  dashboardRangePresets,
  defaultDashboardRange,
  formatDashboardAmounts,
  hasAppointmentData,
  isPresetActive,
  isSetupIncomplete,
  nextSetupStep,
  validateDashboardRange,
} from "./dashboard-view";
import { ALL_BRANCHES } from "@/stores/branch-context-store";
import type { SetupReadiness, SetupStep } from "@/types/setup";

function step(overrides: Partial<SetupStep> & Pick<SetupStep, "key">): SetupStep {
  return {
    key: overrides.key,
    title: overrides.title ?? "Step",
    description: "Description",
    required: overrides.required ?? true,
    complete: overrides.complete ?? false,
    status: overrides.status ?? "incomplete",
    detail: "Detail",
    actionPath: overrides.actionPath ?? "/branches",
    actionLabel: overrides.actionLabel ?? "Open",
    canAct: true,
    prerequisites: [],
  };
}

function readiness(overrides: Partial<SetupReadiness>): SetupReadiness {
  return {
    tenantId: "tenant-1",
    tenantName: "Riverside",
    tenantSlug: "riverside",
    generatedAt: "2026-11-22T00:00:00.000Z",
    scope: null,
    steps: [],
    progress: {
      requiredCompleted: 0,
      requiredTotal: 0,
      optionalCompleted: 0,
      optionalTotal: 0,
      completed: 0,
      total: 0,
      percent: 0,
    },
    nextStepKey: null,
    ...overrides,
  };
}

describe("dashboard range helpers", () => {
  it("defaults to the last 30 local days inclusive", () => {
    const range = defaultDashboardRange(new Date(2026, 10, 22));
    expect(range).toEqual({ fromDate: "2026-10-24", toDate: "2026-11-22" });
    expect(dashboardRangeDays(range)).toBe(30);
  });

  it("builds presets that end today", () => {
    const now = new Date(2026, 10, 22);
    const presets = dashboardRangePresets(now);
    expect(presets.map((preset) => preset.key)).toEqual([
      "today",
      "last-7",
      "last-30",
      "this-month",
    ]);
    expect(presets[0]).toMatchObject({ fromDate: "2026-11-22", toDate: "2026-11-22" });
    expect(presets[1]).toMatchObject({ fromDate: "2026-11-16", toDate: "2026-11-22" });
    expect(presets[3]).toMatchObject({ fromDate: "2026-11-01", toDate: "2026-11-22" });
    expect(isPresetActive(presets[0], { fromDate: "2026-11-22", toDate: "2026-11-22" })).toBe(
      true,
    );
  });

  it("rejects missing, reversed and oversized ranges like the API", () => {
    expect(validateDashboardRange({ fromDate: "", toDate: "2026-11-22" }).valid).toBe(false);
    expect(
      validateDashboardRange({ fromDate: "2026-11-22", toDate: "2026-11-01" }),
    ).toMatchObject({ valid: false });
    expect(
      validateDashboardRange({ fromDate: "2025-01-01", toDate: "2026-11-22" }),
    ).toMatchObject({ valid: false });
    expect(
      validateDashboardRange({ fromDate: "2026-01-01", toDate: "2026-11-22" }),
    ).toEqual({ valid: true });
  });
});

describe("dashboard branch and permission helpers", () => {
  it("omits branchId for the all-branches view only", () => {
    expect(dashboardBranchFilter(ALL_BRANCHES)).toBeUndefined();
    expect(dashboardBranchFilter("")).toBeUndefined();
    expect(dashboardBranchFilter("branch-a")).toBe("branch-a");
  });

  it("maps effective permissions to backend section guards", () => {
    expect(
      dashboardPermissionFlags([
        "reports:read",
        "appointment:read",
        "patient:read",
        "payment:read",
      ]),
    ).toEqual({
      reports: true,
      appointments: true,
      patients: true,
      doctors: false,
      financial: true,
    });

    expect(dashboardPermissionFlags([])).toEqual({
      reports: false,
      appointments: false,
      patients: false,
      doctors: false,
      financial: false,
    });
  });
});

describe("dashboard onboarding helpers", () => {
  it("treats only incomplete required steps as an incomplete setup", () => {
    expect(isSetupIncomplete(null)).toBe(false);
    expect(
      isSetupIncomplete(
        readiness({
          steps: [step({ key: "branch", complete: true }), step({ key: "staff", complete: true })],
        }),
      ),
    ).toBe(false);
    expect(
      isSetupIncomplete(
        readiness({
          steps: [
            step({ key: "branch", complete: true }),
            step({ key: "doctor", complete: false }),
            step({ key: "schedule", required: false, complete: false }),
          ],
        }),
      ),
    ).toBe(true);
  });

  it("prefers the recommended next step then the first incomplete required step", () => {
    const doctor = step({ key: "doctor", title: "Add a doctor", complete: false });
    const staff = step({ key: "staff", title: "Invite staff", complete: false });
    const setup = readiness({
      steps: [staff, doctor],
      nextStepKey: "doctor",
    });

    expect(nextSetupStep(setup)?.key).toBe("doctor");
    expect(nextSetupStep(readiness({ steps: [staff, doctor], nextStepKey: null }))?.key).toBe(
      "staff",
    );
    expect(
      nextSetupStep(
        readiness({ steps: [step({ key: "branch", complete: true })], nextStepKey: null }),
      ),
    ).toBeNull();
  });
});

describe("dashboard formatting helpers", () => {
  it("formats decimal currency strings without float conversion", () => {
    expect(
      formatDashboardAmounts([
        { currency: "USD", amount: "1500.00" },
        { currency: "INR", amount: "1234567.5" },
      ]),
    ).toBe("USD 1,500.00 · INR 1,234,567.5");
    expect(formatDashboardAmounts([])).toBe("—");
    expect(formatDashboardAmounts(undefined)).toBe("—");
  });

  it("builds the real appointment status series and emptiness check", () => {
    const stats = {
      total: 10,
      completed: 6,
      cancelled: 1,
      upcoming: 2,
      noShows: 1,
    };
    expect(appointmentStatusSeries(stats)).toEqual([
      { key: "completed", label: "Completed", count: 6 },
      { key: "upcoming", label: "Upcoming", count: 2 },
      { key: "cancelled", label: "Cancelled", count: 1 },
      { key: "noShows", label: "No-show", count: 1 },
    ]);
    expect(hasAppointmentData(stats)).toBe(true);
    expect(
      hasAppointmentData({ total: 0, completed: 0, cancelled: 0, upcoming: 0, noShows: 0 }),
    ).toBe(false);
    expect(hasAppointmentData(undefined)).toBe(false);
  });
});
