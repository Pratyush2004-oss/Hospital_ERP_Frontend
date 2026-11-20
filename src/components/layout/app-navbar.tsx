"use client";

import Link from "next/link";
import { Bell, CircleHelp, Menu, Moon, Search, Sun, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/stores/auth-store";
import { navigationGroups } from "./navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSidebar } from "./app-sidebar";
export function AppNavbar({ onToggleSidebar, mobileOpen, onMobileOpenChange }: { onToggleSidebar: () => void; mobileOpen: boolean; onMobileOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [search, setSearch] = useState("");
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
          <div className="relative hidden w-48 lg:block">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") toast.info(search ? `Search is a visual placeholder for “${search}”.` : "Enter a search term."); }} placeholder="Search..." className="h-9 pl-8" aria-label="Global search" />
          </div>
          <Button variant="ghost" size="icon" onClick={() => toast.info("Global search is a development placeholder.")} aria-label="Search"><Search /></Button>
          <Link href="/notifications" aria-label="Notifications"><Button variant="ghost" size="icon"><Bell /></Button></Link>
          <Button variant="ghost" size="icon" onClick={() => toast.info("Support center is a development placeholder.")} aria-label="Help and support"><CircleHelp /></Button>
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
