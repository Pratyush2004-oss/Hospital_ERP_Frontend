import type { TenantMembership } from "@/types/management";

/**
 * ONB-18 hospital selection rules.
 *
 * These are pure functions so the selection decisions can be unit tested
 * without a DOM or API. The backend remains authoritative: `POST /tenants/select`
 * re-validates that the hospital and the membership are ACTIVE before writing
 * the tenant to the server-side session.
 */

export type HospitalSelectionPlan =
  /** The server-side session already points at an active membership. */
  | { readonly kind: "restore"; readonly membership: TenantMembership }
  /** Exactly one hospital can be opened, so it is selected automatically. */
  | { readonly kind: "auto-select"; readonly membership: TenantMembership }
  /** More than one hospital can be opened; the user must choose. */
  | { readonly kind: "choose"; readonly memberships: readonly TenantMembership[] }
  /** No hospital can be opened; show the onboarding/approval guidance. */
  | { readonly kind: "none"; readonly memberships: readonly TenantMembership[] };

/** A membership can be entered only when both the hospital and it are ACTIVE. */
export function isActiveMembership(
  membership: Pick<TenantMembership, "status" | "tenantStatus">,
): boolean {
  return membership.status === "ACTIVE" && membership.tenantStatus === "ACTIVE";
}

export function listActiveMemberships(
  memberships: readonly TenantMembership[],
): TenantMembership[] {
  return memberships.filter(isActiveMembership);
}

/**
 * Decides what the hospital gate should do next.
 *
 * A valid server-side selection wins over the automatic path, but it is only
 * restored when the matching membership is still active. A stale selection
 * (removed, suspended or pending membership) is ignored and the normal
 * auto-select/chooser/empty-state rules apply instead.
 */
export function planHospitalSelection(input: {
  memberships: readonly TenantMembership[];
  activeTenantId?: string | null;
}): HospitalSelectionPlan {
  const active = listActiveMemberships(input.memberships);

  if (active.length === 0) {
    return { kind: "none", memberships: [...input.memberships] };
  }

  const restorable = input.activeTenantId
    ? active.find((membership) => membership.tenantId === input.activeTenantId)
    : undefined;

  if (restorable) {
    return { kind: "restore", membership: restorable };
  }

  if (active.length === 1) {
    return { kind: "auto-select", membership: active[0]! };
  }

  return { kind: "choose", memberships: active };
}

/**
 * Resolves the hospital behind a chooser click, rejecting anything that is not
 * an active membership of the signed-in account. The gate uses this before
 * calling `POST /tenants/select`, so an inactive or unknown hospital is never
 * sent to the API.
 */
export function resolveSelectableMembership(
  memberships: readonly TenantMembership[],
  tenantSlug: string,
): TenantMembership | undefined {
  const normalized = tenantSlug.trim().toLowerCase();
  if (!normalized) return undefined;

  return memberships.find(
    (membership) =>
      membership.tenantSlug.toLowerCase() === normalized &&
      isActiveMembership(membership),
  );
}

/** Human-readable reasons used by the empty state. */
export function describeMembershipState(
  membership: Pick<TenantMembership, "status" | "tenantStatus">,
): string {
  if (membership.tenantStatus === "PENDING") return "Awaiting hospital approval";
  if (membership.tenantStatus === "SUSPENDED") return "Hospital suspended";
  if (membership.tenantStatus === "INACTIVE") return "Hospital inactive";
  if (membership.status === "INVITED") return "Invitation not accepted";
  if (membership.status === "SUSPENDED") return "Membership suspended";
  if (membership.status === "REMOVED") return "Membership removed";
  return "Not available";
}
