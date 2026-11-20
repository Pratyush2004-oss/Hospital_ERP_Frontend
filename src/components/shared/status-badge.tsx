import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

const statusVariants = {
  success: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  warning: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  error: "border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  info: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  neutral: "border-transparent bg-muted text-muted-foreground",
} as const;

export function StatusBadge({
  status,
  children,
}: {
  status: keyof typeof statusVariants;
  children: ReactNode;
}) {
  return <Badge className={statusVariants[status]}>{children}</Badge>;
}
