import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileBarChart,
  Hospital,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  placeholder?: boolean;
  requiredPermissions?: readonly string[];
  anyPermission?: readonly string[];
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export function hasNavigationPermission(
  item: NavigationItem,
  permissions: readonly string[],
): boolean {
  if (!item.requiredPermissions?.length && !item.anyPermission?.length) return true;
  if (item.requiredPermissions?.length) {
    return item.requiredPermissions.every((permission) => permissions.includes(permission));
  }
  return item.anyPermission?.some((permission) => permissions.includes(permission)) ?? false;
}

export function getVisibleNavigationGroups(
  permissions: readonly string[],
): NavigationGroup[] {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasNavigationPermission(item, permissions)),
    }))
    .filter((group) => group.items.length > 0);
}

export const routePermissionRequirements: Readonly<Record<string, readonly string[]>> = {
  "/hospitals": ["tenant:read"],
  "/branches": ["branch:read"],
  "/departments": ["department:read"],
  "/doctors": ["doctor:read"],
  "/patients": ["patient:read"],
  "/appointments": ["appointment:read"],
  "/scheduling": ["schedule.read", "doctor.leave.read", "schedule.break.read"],
  "/billing": ["payment:read"],
  "/financial-analytics": ["reports:read"],
  "/settings": ["tenant:read"],
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Hospital Operations",
    items: [
      { label: "Hospitals", href: "/hospitals", icon: Hospital, requiredPermissions: ["tenant:read"] },
      { label: "Branches", href: "/branches", icon: Workflow, requiredPermissions: ["branch:read"] },
      { label: "Departments", href: "/departments", icon: ClipboardList, requiredPermissions: ["department:read"] },
      { label: "Doctors", href: "/doctors", icon: Stethoscope, requiredPermissions: ["doctor:read"] },
    ],
  },
  {
    label: "Patient Management",
    items: [{ label: "Patients", href: "/patients", icon: Users, requiredPermissions: ["patient:read"] }],
  },
  {
    label: "Appointments",
    items: [
      { label: "Appointments", href: "/appointments", icon: CalendarDays, requiredPermissions: ["appointment:read"] },
      { label: "Scheduling", href: "/scheduling", icon: ClipboardList, anyPermission: ["schedule.read", "doctor.leave.read", "schedule.break.read"] },
    ],
  },
  {
    label: "Billing & Finance",
    items: [
      { label: "Billing & Payments", href: "/billing", icon: CreditCard, requiredPermissions: ["payment:read"] },
      { label: "Financial Reports", href: "/financial-analytics", icon: FileBarChart, requiredPermissions: ["reports:read"] },
    ],
  },
  {
    label: "Communication",
    items: [],
  },
  {
    label: "Administration",
    items: [
      { label: "Profile", href: "/profile", icon: ShieldCheck },
      { label: "Settings", href: "/settings", icon: Settings, requiredPermissions: ["tenant:read"] },
    ],
  },
];

export const mockUser = {
  name: "Alex Morgan",
  role: "Platform administrator",
  initials: "AM",
};

export const mockTenants = ["Riverside Health Network", "Northstar Medical Group"];
export const mockBranches = ["Central Hospital", "Westside Clinic", "Lakeside Center"];
