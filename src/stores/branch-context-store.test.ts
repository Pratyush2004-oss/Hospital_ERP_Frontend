import { beforeEach, describe, expect, it } from "vitest";
import {
  ALL_BRANCHES,
  useBranchContextStore,
} from "./branch-context-store";

describe("branch context store", () => {
  beforeEach(() => {
    useBranchContextStore.getState().clear();
  });

  it("starts with all branches as an explicit filter value", () => {
    expect(useBranchContextStore.getState().selectedBranchId).toBe(ALL_BRANCHES);
    expect(useBranchContextStore.getState().selectedBranchName).toBeNull();
  });

  it("tracks a selected branch and can return to the all-branch view", () => {
    useBranchContextStore.getState().setSelectedBranch("branch-a", "Central");

    expect(useBranchContextStore.getState().selectedBranchId).toBe("branch-a");
    expect(useBranchContextStore.getState().selectedBranchName).toBe("Central");

    useBranchContextStore.getState().clear();

    expect(useBranchContextStore.getState().selectedBranchId).toBe(ALL_BRANCHES);
    expect(useBranchContextStore.getState().selectedBranchName).toBeNull();
  });
});
