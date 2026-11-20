"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { LoadingState } from "@/components/shared/states";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import { routePermissionRequirements } from "@/components/layout/navigation";

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

  const permissions = useAuthStore((state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS);

  if (!initialized || status === "loading" || status === "unauthenticated") {
    return <LoadingState label="Checking your session..." />;
  }

  const matchedRoute = Object.keys(routePermissionRequirements).find((route) =>
    pathname === route || pathname.startsWith(`${route}/`),
  );
  if (matchedRoute) {
    const requirements = routePermissionRequirements[matchedRoute];
    const isScheduling = matchedRoute === "/scheduling";
    const authorized = isScheduling
      ? requirements.some((permission) => permissions.includes(permission))
      : requirements.every((permission) => permissions.includes(permission));
    if (!authorized) {
      return <div className="mx-auto max-w-xl p-6"><div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center"><p className="font-medium">You are not authorized to access this page.</p><p className="mt-1 text-sm text-muted-foreground">This page is restricted by your HospitalOS permissions.</p></div></div>;
    }
  }

  return children;
}
