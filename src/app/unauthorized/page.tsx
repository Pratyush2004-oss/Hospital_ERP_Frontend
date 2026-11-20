import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="max-w-md space-y-4 text-center">
        <ShieldAlert className="mx-auto size-10 text-destructive" />
        <h1 className="text-2xl font-semibold">Access unavailable</h1>
        <p className="text-muted-foreground">Your account is not authorized to access this resource. The backend remains the source of truth for permissions.</p>
        <Button nativeButton={false} render={<Link href="/dashboard" />}>Return to dashboard</Button>
      </section>
    </main>
  );
}
