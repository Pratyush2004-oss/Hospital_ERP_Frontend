import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function PageContainer({ className, ...props }: ComponentProps<"main">) {
  return <main className={cn("mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8", className)} {...props} />;
}
