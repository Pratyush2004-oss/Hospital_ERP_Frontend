"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { getApiErrorMessage, reactivateAccount } from "@/lib/auth/auth-service";
import { useAuthStore } from "@/stores/auth-store";
import { FormField } from "@/components/shared/form-field";
import { FormActions, FormError } from "@/components/shared/form-actions";
import { Input } from "@/components/ui/input";

export function ReactivateAccountForm() {
  const router = useRouter();
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await reactivateAccount({ identifier, password });
      await refreshSession();
      router.replace("/dashboard");
    } catch (cause) {
      setError(getApiErrorMessage(cause, "This account could not be reactivated."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <ShieldCheck className="size-4" aria-hidden="true" /> Password required
        </p>
        <p className="mt-1">
          Reactivation restores this global account only. Hospital membership status is
          unchanged and may still require an administrator.
        </p>
      </div>
      <FormField id="reactivate-identifier" label="Email or phone number" required>
        <Input
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          autoComplete="username"
          required
        />
      </FormField>
      <FormField id="reactivate-password" label="Password" required>
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </FormField>
      <FormError>{error}</FormError>
      <FormActions
        isPending={pending}
        disabled={!identifier.trim() || !password}
        submitLabel="Reactivate account"
        pendingLabel="Reactivating..."
      />
      <p className="text-center text-sm text-muted-foreground">
        Already active?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
