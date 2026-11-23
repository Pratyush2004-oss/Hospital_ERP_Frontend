import { describe, expect, it } from "vitest";
import { resolveFeatureFlags } from "./features";

describe("feature visibility", () => {
  it("hides unimplemented search and help everywhere", () => {
    for (const nodeEnv of ["production", "development", "test"]) {
      const flags = resolveFeatureFlags(nodeEnv);
      expect(flags.globalSearch).toBe(false);
      expect(flags.helpCenter).toBe(false);
    }
  });

  it("shows the development workspace note only outside production", () => {
    expect(resolveFeatureFlags("production").developmentWorkspace).toBe(false);
    expect(resolveFeatureFlags("development").developmentWorkspace).toBe(true);
  });

  it("enables notifications because the Phase 20 API is implemented", () => {
    expect(resolveFeatureFlags("production").notifications).toBe(true);
  });
});
