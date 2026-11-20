"use client";

import { FormProvider, type FieldValues, type UseFormReturn } from "react-hook-form";
import type { ComponentProps, ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Form<TFieldValues extends FieldValues>({
  form,
  children,
}: {
  form: UseFormReturn<TFieldValues>;
  children: ReactNode;
}) {
  return <FormProvider {...form}>{children}</FormProvider>;
}

export function FormItem({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function FormLabel(props: ComponentProps<typeof Label>) {
  return <Label {...props} />;
}

export function FormControl({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export function FormDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function FormMessage({ children }: { children?: ReactNode }) {
  return children ? <p className="text-sm text-destructive" role="alert">{children}</p> : null;
}
