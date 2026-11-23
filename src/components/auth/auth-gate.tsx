"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { LoadingState } from "@/components/shared/states";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import { canAccessRoute } from "@/components/layout/navigation";

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, initialized, initialize } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const handleExpired = () => {
      useAuthStore.setState({ session: null, status: "unauthenticated", initialized: true });
    };
    window.addEventListener("hospitalos:auth-expired", handleExpired);
    return () => window.removeEventListener("hospitalos:auth-expired", handleExpired);
  }, []);

  useEffect(() => {
    if (initialized && status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [initialized, pathname, router, status]);

  const activeTenant = useAuthStore((state) => state.session?.activeTenant ?? null);
  const permissions = activeTenant?.permissions ?? EMPTY_PERMISSIONS;

  if (!initialized || status === "loading" || status === "unauthenticated") {
    return <LoadingState label="Checking your session..." />;
  }

  // Route permissions require an established hospital context. Until one is
  // selected the dashboard gate handles onboarding, so deep links are not
  // rejected with "not authorized" for a session that has no tenant yet.
  if (activeTenant && !canAccessRoute(pathname, permissions)) {
    return <div className="mx-auto max-w-xl p-6"><div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center"><p className="font-medium">You are not authorized to access this page.</p><p className="mt-1 text-sm text-muted-foreground">This page is restricted by your HospitalOS permissions.</p></div></div>;
  }

  return children;
}
