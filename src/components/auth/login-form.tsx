"use client";

import Link from "next/link";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getApiErrorMessage } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your email or phone number."),
  password: z.string().min(1, "Password is required."),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  return <Suspense fallback={<div className="h-48" />}><LoginFormContent /></Suspense>;
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, status } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: "", password: "" } });

  const requestedNext = searchParams.get("next");
  const safeNext =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard";

  useEffect(() => {
    if (status === "authenticated") router.replace(safeNext);
  }, [router, safeNext, status]);

  const onSubmit = async (values: LoginValues) => {
    try {
      await signIn(values.identifier, values.password);
      router.replace(safeNext);
    } catch (error) {
      form.setError("root", { message: getApiErrorMessage(error, "Unable to sign in with those credentials.") });
    }
  };

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      {form.formState.errors.root?.message ? <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{form.formState.errors.root.message}</p> : null}
      <FormField id="identifier" label="Email or phone number" required error={form.formState.errors.identifier?.message}>
        <Input id="identifier" autoComplete="username" placeholder="you@hospital.com" aria-invalid={Boolean(form.formState.errors.identifier)} {...form.register("identifier")} />
      </FormField>
      <FormField id="password" label="Password" required error={form.formState.errors.password?.message}>
        <div className="relative">
          <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" aria-invalid={Boolean(form.formState.errors.password)} className="pr-10" {...form.register("password")} />
          <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</Button>
        </div>
      </FormField>
      <div className="flex justify-end"><Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link></div>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <LoaderCircle className="animate-spin" /> : null}{form.formState.isSubmitting ? "Signing in..." : "Sign in"}</Button>
      <p className="text-center text-xs text-muted-foreground">Session cookies are secured by the HospitalOS API.</p>
      <div className="space-y-2 border-t pt-4 text-center text-sm text-muted-foreground">
        <p>
          New to HospitalOS?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create a hospital
          </Link>
        </p>
        <p>
          Received an invitation?{" "}
          <Link href="/accept-invitation" className="font-medium text-primary hover:underline">
            Accept it
          </Link>
        </p>
        <p>
          A patient?{" "}
          <Link href="/register/patient" className="font-medium text-primary hover:underline">
            Create a patient portal account
          </Link>{" "}
          or{" "}
          <Link href="/login?next=%2Fportal" className="font-medium text-primary hover:underline">
            open your portal
          </Link>
        </p>
      </div>
    </form>
  );
}
