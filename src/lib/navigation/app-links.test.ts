import { describe, expect, it } from "vitest";
import { buildScheduleHref, canViewSchedule, readScheduleQuery } from "./app-links";

describe("functional app navigation", () => {
  it("links View schedule to the scheduling page with date and branch filters", () => {
    expect(buildScheduleHref({ fromDate: "2026-11-22", branchId: "branch-1" })).toBe(
      "/scheduling?date=2026-11-22&branchId=branch-1",
    );
    expect(buildScheduleHref({ fromDate: "not-a-date", branchId: null })).toBe("/scheduling");
  });

  it("only shows View schedule to roles that can open scheduling", () => {
    expect(canViewSchedule(["schedule.read"])).toBe(true);
    expect(canViewSchedule(["doctor.leave.read"])).toBe(true);
    expect(canViewSchedule(["appointment:read"])).toBe(false);
  });

  it("accepts only valid schedule query filters", () => {
    expect(readScheduleQuery("?date=2026-11-22&branchId=branch-1&ignored=1")).toEqual({
      date: "2026-11-22",
      branchId: "branch-1",
    });
    expect(readScheduleQuery("?date=invalid")).toEqual({});
  });
});
