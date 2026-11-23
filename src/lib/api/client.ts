import axios, {
  AxiosError,
  type AxiosRequestConfig,
} from "axios";
import { env } from "@/config/env";
import type { ApiErrorResponse, ApiResponse } from "@/types/api";

type AuthRequestConfig = AxiosRequestConfig & {
  skipAuthRefresh?: boolean;
  authRetry?: boolean;
};

export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const value = document.cookie.split("; ").find((cookie) => cookie.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}

/**
 * Fallback copy of the double-submit token.
 *
 * `hos_csrf` is scoped to the API origin. When the frontend and API are
 * deployed on different sites (for example two `*.vercel.app` projects), the
 * cookie is sent with requests but `document.cookie` on the frontend origin
 * cannot read it, so the `x-csrf-token` header would be missing and every
 * mutation would fail with `403 CSRF token missing or invalid`. Login, refresh
 * and other session endpoints return the same token in their response body,
 * so we remember it and use it when the cookie is not readable.
 */
let fallbackCsrfToken: string | null = null;

function readResponseCsrfToken(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const payload = (data as { data?: unknown }).data;
  if (typeof payload !== "object" || payload === null) return null;
  const token = (payload as { csrfToken?: unknown }).csrfToken;
  return typeof token === "string" && token.length > 0 ? token : null;
}

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  const csrfToken = getCookie("hos_csrf") ?? fallbackCsrfToken;
  if (csrfToken && method && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    config.headers.set("x-csrf-token", csrfToken);
  }
  return config;
});

let refreshPromise: Promise<void> | null = null;

function isAuthEndpoint(url?: string): boolean {
  return ["/auth/login", "/auth/refresh", "/auth/logout", "/auth/register", "/auth/forgot-password", "/auth/reset-password"].some((path) => url?.includes(path) ?? false);
}

async function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = apiClient.post("/auth/refresh", undefined, { skipAuthRefresh: true } as AxiosRequestConfig).then(() => undefined).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => {
    if (response.config.url?.includes("/auth/logout")) {
      fallbackCsrfToken = null;
    } else {
      const nextToken = readResponseCsrfToken(response.data);
      if (nextToken) fallbackCsrfToken = nextToken;
    }
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const config = error.config as AuthRequestConfig | undefined;
    if (error.response?.status === 401 && config && !config.skipAuthRefresh && !config.authRetry && !isAuthEndpoint(config.url)) {
      try {
        await refreshSession();
        return apiClient.request({ ...config, authRetry: true } as AxiosRequestConfig);
      } catch {
        fallbackCsrfToken = null;
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("hospitalos:auth-expired"));
        }
      }
    }

    return Promise.reject(error);
  },
);

export async function apiRequest<T>(
  config: AuthRequestConfig,
): Promise<ApiResponse<T>> {
  const response = await apiClient.request<ApiResponse<T>>(config);
  return response.data;
}
