import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function ResponsiveContainer({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("w-full overflow-x-auto", className)} {...props} />;
}
