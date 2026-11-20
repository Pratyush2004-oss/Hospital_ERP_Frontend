"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getApiErrorMessage, requestPasswordReset } from "@/lib/auth/auth-service";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";

const forgotSchema = z.object({ identifier: z.string().trim().min(3, "Enter your email or phone number.") });
type ForgotValues = z.infer<typeof forgotSchema>;

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { identifier: "" } });

  const onSubmit = async (values: ForgotValues) => {
    try {
      setMessage(await requestPasswordReset(values.identifier));
    } catch (error) {
      form.setError("root", { message: getApiErrorMessage(error) });
    }
  };

  if (message) return <div className="space-y-5 text-center"><p className="text-sm text-muted-foreground">{message}</p><Link href="/login" className="text-sm font-medium text-primary hover:underline">Return to sign in</Link></div>;

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {form.formState.errors.root?.message ? <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{form.formState.errors.root.message}</p> : null}
      <FormField id="identifier" label="Email or phone number" required error={form.formState.errors.identifier?.message}><Input id="identifier" autoComplete="username" placeholder="you@hospital.com" {...form.register("identifier")} /></FormField>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Sending..." : "Send reset instructions"}</Button>
      <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">Back to sign in</Link>
    </form>
  );
}
