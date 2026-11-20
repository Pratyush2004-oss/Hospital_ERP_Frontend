"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getApiErrorMessage, resetPassword } from "@/lib/auth/auth-service";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long.");
const resetSchema = z.object({ token: z.string().min(20, "Reset token is invalid."), password: passwordSchema, confirmPassword: z.string() }).refine((values) => values.password === values.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });
type ResetValues = z.infer<typeof resetSchema>;

export function ResetPasswordForm() {
  return <Suspense fallback={<div className="h-48" />}><ResetPasswordFormContent /></Suspense>;
}

function ResetPasswordFormContent() {
  const params = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { token: params.get("token") ?? "", password: "", confirmPassword: "" } });

  const onSubmit = async (values: ResetValues) => {
    try {
      setMessage(await resetPassword(values.token, values.password));
    } catch (error) {
      form.setError("root", { message: getApiErrorMessage(error, "Unable to reset your password.") });
    }
  };

  if (message) return <div className="space-y-5 text-center"><p className="text-sm text-muted-foreground">{message}</p><Link href="/login" className="text-sm font-medium text-primary hover:underline">Return to sign in</Link></div>;

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {form.formState.errors.root?.message ? <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{form.formState.errors.root.message}</p> : null}
      <FormField id="token" label="Reset token" required error={form.formState.errors.token?.message}><Input id="token" {...form.register("token")} /></FormField>
      <FormField id="password" label="New password" required error={form.formState.errors.password?.message}><Input id="password" type="password" autoComplete="new-password" {...form.register("password")} /></FormField>
      <FormField id="confirmPassword" label="Confirm new password" required error={form.formState.errors.confirmPassword?.message}><Input id="confirmPassword" type="password" autoComplete="new-password" {...form.register("confirmPassword")} /></FormField>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Resetting..." : "Reset password"}</Button>
    </form>
  );
}
