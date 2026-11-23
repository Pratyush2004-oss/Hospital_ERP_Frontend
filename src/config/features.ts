/**
 * Central visibility policy for unfinished or environment-specific UI.
 *
 * Keep feature decisions here instead of scattering `NODE_ENV` checks through
 * components. Modules that are not implemented must stay disabled: enabling a
 * flag only makes sense when the advertised action exists.
 */
export type FeatureFlags = {
  /** Global search has no API or search page yet. */
  globalSearch: boolean;
  /** Help/support content and a support workflow do not exist yet. */
  helpCenter: boolean;
  /** Phase 20 notification inbox APIs are available. */
  notifications: boolean;
  /** Development-only sidebar note; never shown in production builds. */
  developmentWorkspace: boolean;
};

export function resolveFeatureFlags(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): FeatureFlags {
  return {
    globalSearch: false,
    helpCenter: false,
    notifications: true,
    developmentWorkspace: nodeEnv !== "production",
  };
}

export const featureFlags: Readonly<FeatureFlags> = Object.freeze(
  resolveFeatureFlags(),
);

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag];
}
