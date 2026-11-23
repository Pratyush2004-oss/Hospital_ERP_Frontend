"use client";

import Link from "next/link";
import { Bell, CircleHelp, Menu, Moon, Search, Sun, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { featureFlags } from "@/config/features";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { getUnreadNotificationCount } from "@/lib/api/notification-service";
import { useAuthStore } from "@/stores/auth-store";
import { navigationGroups } from "./navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSidebar } from "./app-sidebar";
export function AppNavbar({ onToggleSidebar, mobileOpen, onMobileOpenChange }: { onToggleSidebar: () => void; mobileOpen: boolean; onMobileOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const tenantId = useAuthStore((state) => state.session?.activeTenant?.id);
  const unread = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: getUnreadNotificationCount,
    enabled: featureFlags.notifications && Boolean(tenantId),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });
  const unreadCount = unread.data ?? 0;
  const currentLabel = navigationGroups.flatMap((group) => group.items).find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? "Dashboard";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur sm:px-5">
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} aria-label="Toggle sidebar"><Menu /></Button>
        <Separator orientation="vertical" className="hidden h-6 sm:block" />
        <nav className="hidden min-w-0 items-center gap-2 text-sm sm:flex" aria-label="Breadcrumb">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Workspace</Link>
          <span className="text-muted-foreground">/</span>
          <span className="truncate font-medium">{currentLabel}</span>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {featureFlags.globalSearch ? (
            <Button
              variant="ghost"
              size="icon"
              disabled
              title="Global search is coming soon"
              aria-label="Global search (coming soon)"
            >
              <Search />
            </Button>
          ) : null}
          {featureFlags.notifications ? (
            <Link
              href="/notifications"
              aria-label={
                unreadCount > 0
                  ? `Notifications, ${unreadCount} unread`
                  : "Notifications"
              }
            >
              <Button variant="ghost" size="icon" className="relative">
                <Bell />
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Button>
            </Link>
          ) : null}
          {featureFlags.helpCenter ? (
            <Button
              variant="ghost"
              size="icon"
              disabled
              title="Help and support is coming soon"
              aria-label="Help and support (coming soon)"
            >
              <CircleHelp />
            </Button>
          ) : null}
          <UserMenu resolvedTheme={resolvedTheme} setTheme={setTheme} />
        </div>
      </header>
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-72 p-0 sm:max-w-xs">
          <SheetHeader className="sr-only"><SheetTitle>HospitalOS navigation</SheetTitle><SheetDescription>Primary application navigation</SheetDescription></SheetHeader>
          <div className="h-full">
            <AppSidebar collapsed={false} onCollapsedChange={() => undefined} onNavigate={() => onMobileOpenChange(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function UserMenu({ resolvedTheme, setTheme }: { resolvedTheme?: string; setTheme: (theme: string) => void }) {
  const { session, signOut } = useAuthStore();
  const user = session?.user;
  const initials = user?.fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() ?? "HO";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="gap-2 px-2" aria-label="Open user menu" />}>
        <Avatar className="size-8"><AvatarFallback>{initials}</AvatarFallback></Avatar>
        <span className="hidden text-left md:block"><span className="block text-xs font-medium">{user?.fullName ?? "HospitalOS user"}</span><span className="block max-w-36 truncate text-[11px] text-muted-foreground">{user?.email ?? "Authenticated account"}</span></span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{user?.email ?? "Authenticated account"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" />}><UserRound />Profile</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" />}>Account settings</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>{resolvedTheme === "dark" ? <Sun /> : <Moon />}Theme preferences</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { void signOut().catch((error) => toast.error(getApiErrorMessage(error, "Unable to sign out."))); }}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
