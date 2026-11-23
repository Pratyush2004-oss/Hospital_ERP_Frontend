import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { HospitalGate } from "@/components/layout/hospital-gate";

export const instant = false;

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthGate>
      <HospitalGate>
        <DashboardShell>{children}</DashboardShell>
      </HospitalGate>
    </AuthGate>
  );
}
