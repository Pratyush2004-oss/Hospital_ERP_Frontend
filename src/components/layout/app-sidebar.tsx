"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronsLeft, ChevronsRight, Hospital, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getVisibleNavigationGroups, navigationGroups, type NavigationGroup } from "./navigation";
import { EMPTY_PERMISSIONS, useAuthStore } from "@/stores/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TenantContext } from "./tenant-context";

type AppSidebarProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onNavigate?: () => void;
};

const storageKey = "hospitalos.sidebar.groups";

export function AppSidebar({ collapsed, onCollapsedChange, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const permissions = useAuthStore((state) => state.session?.activeTenant?.permissions ?? EMPTY_PERMISSIONS);
  const visibleGroups = getVisibleNavigationGroups(permissions);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        try {
          setOpenGroups(JSON.parse(saved) as Record<string, boolean>);
        } catch {
          setOpenGroups(Object.fromEntries(navigationGroups.map((group) => [group.label, true])));
        }
      } else {
        setOpenGroups(Object.fromEntries(navigationGroups.map((group) => [group.label, true])));
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (Object.keys(openGroups).length > 0) {
      window.localStorage.setItem(storageKey, JSON.stringify(openGroups));
    }
  }, [openGroups]);

  return (
    <aside className={cn("flex h-full flex-col border-r bg-card transition-[width] duration-200 md:max-lg:w-16", collapsed ? "w-16" : "w-64")}>
      <div className={cn("flex h-16 items-center border-b px-3 md:max-lg:justify-center", collapsed ? "justify-center" : "justify-between")}>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={onNavigate}>
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Hospital className="size-5" /></span>
          {!collapsed ? <span className="tracking-tight md:max-lg:hidden">HospitalOS</span> : null}
        </Link>
        {!collapsed ? (
          <Button variant="ghost" size="icon-sm" className="md:max-lg:hidden" onClick={() => onCollapsedChange(true)} aria-label="Collapse sidebar"><ChevronsLeft /></Button>
        ) : (
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon-sm" className="absolute left-12 z-10 hidden bg-card shadow-sm lg:flex" aria-label="Expand sidebar" />}>
              <ChevronsRight onClick={() => onCollapsedChange(false)} />
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        )}
      </div>
      {!collapsed ? <div className="md:max-lg:hidden"><TenantContext /></div> : null}
      <nav className="flex-1 space-y-3 overflow-y-auto p-2" aria-label="Main navigation">
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label} group={group} collapsed={collapsed} pathname={pathname} onNavigate={onNavigate} open={openGroups[group.label] ?? true} onOpenChange={(open) => setOpenGroups((current) => ({ ...current, [group.label]: open }))} />
        ))}
      </nav>
      {!collapsed ? (
        <div className="m-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground md:max-lg:hidden">
          <div className="mb-1 flex items-center gap-2 font-medium text-foreground"><LockKeyhole className="size-3.5 text-primary" />Development workspace</div>
          Tenant and branch access are validated by the backend.
        </div>
      ) : null}
    </aside>
  );
}

function SidebarGroup({ group, collapsed, pathname, onNavigate, open, onOpenChange }: { group: NavigationGroup; collapsed: boolean; pathname: string; onNavigate?: () => void; open: boolean; onOpenChange: (open: boolean) => void }) {
  const groupHasActiveItem = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (collapsed) {
    return (
      <div className="space-y-1">
        {group.items.map((item) => <SidebarLink key={item.href} item={item} collapsed pathname={pathname} onNavigate={onNavigate} />)}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className={cn("flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted md:max-lg:justify-center", groupHasActiveItem && "text-primary")}>
        <span className="md:max-lg:hidden">{group.label}</span><ChevronDown className={cn("size-3.5 transition-transform md:max-lg:hidden", !open && "-rotate-90")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 pt-1">
        {group.items.map((item) => <SidebarLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />)}
      </CollapsibleContent>
    </Collapsible>
  );
}

function SidebarLink({ item, collapsed, pathname, onNavigate }: { item: NavigationGroup["items"][number]; collapsed?: boolean; pathname: string; onNavigate?: () => void }) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const link = (
    <Link href={item.href} onClick={onNavigate} className={cn("group flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors md:max-lg:justify-center", collapsed ? "justify-center" : "justify-between", active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")} aria-current={active ? "page" : undefined}>
      <span className="flex min-w-0 items-center gap-2"><item.icon className="size-4 shrink-0" /><span className={cn("truncate md:max-lg:hidden", collapsed && "sr-only")}>{item.label}</span></span>
      {!collapsed && item.placeholder ? <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal md:max-lg:hidden">Soon</Badge> : null}
    </Link>
  );

  return collapsed ? <Tooltip><TooltipTrigger render={link} /><TooltipContent side="right">{item.label}{item.placeholder ? " (development)" : ""}</TooltipContent></Tooltip> : link;
}
