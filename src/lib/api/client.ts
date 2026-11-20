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

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  const csrfToken = getCookie("hos_csrf");
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
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const config = error.config as AuthRequestConfig | undefined;
    if (error.response?.status === 401 && config && !config.skipAuthRefresh && !config.authRetry && !isAuthEndpoint(config.url)) {
      try {
        await refreshSession();
        return apiClient.request({ ...config, authRetry: true } as AxiosRequestConfig);
      } catch {
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
