import type { NextConfig } from "next";

/**
 * Split deployments expect the API on its own origin. Proxying it through this
 * Next.js deployment keeps browser API calls same-origin, so the HttpOnly auth
 * cookies are first-party. Cross-site `SameSite=None` cookies are dropped by
 * modern browsers, which shows up as a successful login followed by 401s on
 * every authenticated request.
 *
 * Set `API_PROXY_TARGET` to the API origin (for example
 * `https://hospitalos-api.vercel.app`) and point `NEXT_PUBLIC_API_URL` at the
 * same-origin base `/api/v1` to enable this. Leave both unset for the direct
 * local-development setup.
 */
function resolveApiProxyTarget(): string | undefined {
  const target = process.env.API_PROXY_TARGET?.trim().replace(/\/+$/, "");
  if (!target) return undefined;
  return target.endsWith("/api/v1") ? target : `${target}/api/v1`;
}

const apiProxyTarget = resolveApiProxyTarget();

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    if (!apiProxyTarget) return [];

    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
