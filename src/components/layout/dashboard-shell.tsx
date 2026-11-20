"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AppNavbar } from "./app-navbar";
import { AppSidebar } from "./app-sidebar";
import { TenantContext } from "./tenant-context";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden shrink-0 md:block">
        <AppSidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppNavbar onToggleSidebar={() => {
          if (window.matchMedia("(max-width: 767px)").matches) setMobileOpen(true);
          else setCollapsed((current) => !current);
        }} mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen} />
        <div className="border-b bg-card md:hidden"><TenantContext /></div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
