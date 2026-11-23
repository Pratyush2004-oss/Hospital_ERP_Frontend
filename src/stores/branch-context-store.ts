"use client";

import { create } from "zustand";

export const ALL_BRANCHES = "__all_branches__";

type BranchContextState = {
  selectedBranchId: string;
  selectedBranchName: string | null;
  setSelectedBranch: (branchId: string, branchName: string | null) => void;
  clear: () => void;
};

/**
 * Selected operational branch filter. This is a data filter, not an
 * authorization boundary; backend permissions and tenant scope still apply.
 */
export const useBranchContextStore = create<BranchContextState>((set) => ({
  selectedBranchId: ALL_BRANCHES,
  selectedBranchName: null,
  setSelectedBranch: (branchId, branchName) =>
    set({ selectedBranchId: branchId, selectedBranchName: branchName }),
  clear: () => set({ selectedBranchId: ALL_BRANCHES, selectedBranchName: null }),
}));
