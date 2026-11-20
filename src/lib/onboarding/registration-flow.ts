import type { RegisterAccountInput } from "@/lib/auth/auth-service";
import type { RegisterTenantInput, TenantMembership } from "@/types/management";

/**
 * Public hospital registration orchestration.
 *
 * The backend deliberately separates account creation from tenant creation:
 * - `POST /auth/register` creates the global account (no session, no role);
 * - `POST /auth/login` establishes the cookie session;
 * - `POST /tenants/register` requires that session and grants the creator a
 *   tenant-scoped `hospital_admin` membership on the server.
 *
 * No role or tenant id is accepted from this flow.
 */

export type RegistrationStage = "account" | "sign-in" | "hospital";

export interface RegistrationProgress {
  readonly accountCreated: boolean;
  readonly signedIn: boolean;
}

export interface HospitalRegistrationInput {
  readonly account: RegisterAccountInput;
  readonly hospital: RegisterTenantInput;
}

export interface RegistrationDependencies {
  readonly registerAccount: (input: RegisterAccountInput) => Promise<unknown>;
  readonly signIn: (email: string, password: string) => Promise<unknown>;
  readonly registerTenant: (input: RegisterTenantInput) => Promise<TenantMembership>;
}

/** Carries the failed step and completed work so the UI can resume safely. */
export class RegistrationStepError extends Error {
  readonly stage: RegistrationStage;
  readonly progress: RegistrationProgress;
  readonly cause: unknown;

  constructor(
    stage: RegistrationStage,
    progress: RegistrationProgress,
    cause: unknown,
  ) {
    super(`Hospital registration failed during ${stage}`, { cause });
    this.name = "RegistrationStepError";
    this.stage = stage;
    this.progress = progress;
    this.cause = cause;
  }
}

/**
 * Runs only the steps that have not completed yet. A retry after a failed
 * hospital submission therefore does not create a second account or session.
 */
export async function submitHospitalRegistration(
  input: HospitalRegistrationInput,
  dependencies: RegistrationDependencies,
  completed: Partial<RegistrationProgress> = {},
): Promise<{ readonly tenant: TenantMembership; readonly progress: RegistrationProgress }> {
  const progress = {
    accountCreated: completed.accountCreated ?? false,
    signedIn: completed.signedIn ?? false,
  };

  if (!progress.accountCreated) {
    try {
      await dependencies.registerAccount(input.account);
      progress.accountCreated = true;
    } catch (error) {
      throw new RegistrationStepError("account", { ...progress }, error);
    }
  }

  if (!progress.signedIn) {
    try {
      await dependencies.signIn(input.account.email, input.account.password);
      progress.signedIn = true;
    } catch (error) {
      throw new RegistrationStepError("sign-in", { ...progress }, error);
    }
  }

  try {
    const tenant = await dependencies.registerTenant(input.hospital);
    return { tenant, progress: { ...progress } };
  } catch (error) {
    throw new RegistrationStepError("hospital", { ...progress }, error);
  }
}

export type RegisterIntent = "hospital" | "invitation";

/** `?intent=invitation` deep-links to the invitation panel. */
export function getRegisterIntent(value: string | null | undefined): RegisterIntent {
  return value === "invitation" ? "invitation" : "hospital";
}

/**
 * Invitation acceptance is intentionally not implemented in ONB-01.
 *
 * The backend has no invitation table, token, acceptance endpoint, or mail
 * delivery, so the UI must not collect a password or pretend to activate an
 * account. This flag keeps the limitation explicit and testable.
 */
export const INVITATION_ACCEPTANCE = {
  available: false,
  reason:
    "Staff invitations are not available in this build yet. No invitation token or activation endpoint exists, so there is nothing safe to submit here.",
  guidance:
    "Ask your hospital administrator to have your account created, then sign in. Invitation emails and activation links will be added with the staff invitation feature.",
} as const;
