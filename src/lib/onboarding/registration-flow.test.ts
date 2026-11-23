import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRegisterIntent,
  INVITATION_ACCEPTANCE,
  onboardingStatusPath,
  RegistrationStepError,
  submitHospitalRegistration,
  type RegistrationDependencies,
} from "./registration-flow";
import type { TenantMembership } from "@/types/management";

const input = {
  account: {
    fullName: "Ada Lovelace",
    email: "ada@example.test",
    password: "correct-horse-battery",
  },
  hospital: {
    name: "Riverside Care Hospital",
    slug: "riverside-care",
    timezone: "Asia/Kolkata",
  },
};

const tenant: TenantMembership = {
  id: "membership-1",
  tenantId: "tenant-1",
  tenantName: "Riverside Care Hospital",
  tenantSlug: "riverside-care",
  tenantStatus: "PENDING",
  status: "ACTIVE",
  joinedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function dependencies(): RegistrationDependencies {
  return {
    registerAccount: vi.fn().mockResolvedValue({ id: "user-1" }),
    signIn: vi.fn().mockResolvedValue(undefined),
    registerTenant: vi.fn().mockResolvedValue(tenant),
  };
}

describe("hospital registration flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates the account, signs in, then registers the hospital", async () => {
    const deps = dependencies();

    const result = await submitHospitalRegistration(input, deps);

    expect(result.tenant).toEqual(tenant);
    expect(result.progress).toEqual({ accountCreated: true, signedIn: true });
    expect(deps.registerAccount).toHaveBeenCalledWith(input.account);
    expect(deps.signIn).toHaveBeenCalledWith(input.account.email, input.account.password);
    expect(deps.registerTenant).toHaveBeenCalledWith(input.hospital);
    expect(vi.mocked(deps.registerAccount).mock.invocationCallOrder[0]!).toBeLessThan(
      vi.mocked(deps.signIn).mock.invocationCallOrder[0]!,
    );
    expect(vi.mocked(deps.signIn).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(deps.registerTenant).mock.invocationCallOrder[0]!,
    );
  });

  it("sends successful registrations to the onboarding status route", () => {
    expect(onboardingStatusPath()).toBe("/onboarding/status");
    expect(onboardingStatusPath({ submitted: true })).toBe("/onboarding/status?submitted=1");
  });

  it("reports a duplicate account without signing in or creating a hospital", async () => {
    const duplicate = Object.assign(new Error("Conflict"), {
      response: {
        status: 409,
        data: { error: { message: "An account with this email already exists." } },
      },
    });
    const deps = dependencies();
    vi.mocked(deps.registerAccount).mockRejectedValue(duplicate);

    const error = await submitHospitalRegistration(input, deps).catch((caught) => caught);

    expect(error).toBeInstanceOf(RegistrationStepError);
    expect((error as RegistrationStepError).stage).toBe("account");
    expect((error as RegistrationStepError).progress).toEqual({
      accountCreated: false,
      signedIn: false,
    });
    expect(deps.signIn).not.toHaveBeenCalled();
    expect(deps.registerTenant).not.toHaveBeenCalled();
  });

  it("resumes after hospital failure without creating a second account or session", async () => {
    const deps = dependencies();
    vi.mocked(deps.registerTenant).mockRejectedValueOnce(new Error("Network down"));

    const first = await submitHospitalRegistration(input, deps).catch((caught) => caught);
    expect(first).toBeInstanceOf(RegistrationStepError);
    expect((first as RegistrationStepError).stage).toBe("hospital");
    expect((first as RegistrationStepError).progress).toEqual({
      accountCreated: true,
      signedIn: true,
    });

    vi.mocked(deps.registerTenant).mockResolvedValueOnce(tenant);
    const retry = await submitHospitalRegistration(
      input,
      deps,
      (first as RegistrationStepError).progress,
    );

    expect(retry.tenant).toEqual(tenant);
    expect(deps.registerAccount).toHaveBeenCalledTimes(1);
    expect(deps.signIn).toHaveBeenCalledTimes(1);
    expect(deps.registerTenant).toHaveBeenCalledTimes(2);
  });

  it("retries sign-in without recreating the account", async () => {
    const deps = dependencies();
    vi.mocked(deps.signIn).mockRejectedValueOnce(new Error("Session unavailable"));

    const first = await submitHospitalRegistration(input, deps).catch((caught) => caught);
    expect((first as RegistrationStepError).stage).toBe("sign-in");
    expect((first as RegistrationStepError).progress).toEqual({
      accountCreated: true,
      signedIn: false,
    });

    vi.mocked(deps.signIn).mockResolvedValueOnce(undefined);
    await submitHospitalRegistration(input, deps, (first as RegistrationStepError).progress);

    expect(deps.registerAccount).toHaveBeenCalledTimes(1);
    expect(deps.signIn).toHaveBeenCalledTimes(2);
    expect(deps.registerTenant).toHaveBeenCalledTimes(1);
  });
});

describe("registration intent and invitation entry", () => {
  it("defaults to hospital registration and recognizes the invitation deep link", () => {
    expect(getRegisterIntent(null)).toBe("hospital");
    expect(getRegisterIntent("hospital")).toBe("hospital");
    expect(getRegisterIntent("invitation")).toBe("invitation");
    expect(getRegisterIntent("something-else")).toBe("hospital");
  });

  it("points invitation entry at the dedicated acceptance route", () => {
    expect(INVITATION_ACCEPTANCE.available).toBe(true);
    expect(INVITATION_ACCEPTANCE.path).toBe("/accept-invitation");
    expect(INVITATION_ACCEPTANCE.reason).toMatch(/single-use/i);
    expect(INVITATION_ACCEPTANCE.guidance).toMatch(/resend/i);
  });
});
