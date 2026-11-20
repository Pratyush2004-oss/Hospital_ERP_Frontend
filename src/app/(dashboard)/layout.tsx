import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export const instant = false;

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AuthGate><DashboardShell>{children}</DashboardShell></AuthGate>;
}
