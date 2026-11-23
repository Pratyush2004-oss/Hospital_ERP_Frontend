import Link from "next/link";
import { Hospital } from "lucide-react";
import type { ReactNode } from "react";

export function OnboardingShell({
  title,
  description,
  children,
  widthClassName = "max-w-2xl",
}: {
  title: string;
  description: string;
  children: ReactNode;
  widthClassName?: string;
}) {
  return (
    <main className="flex min-h-screen items-start justify-center bg-muted/30 p-4 sm:items-center">
      <section className={`w-full space-y-6 py-6 ${widthClassName}`}>
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hospital className="size-5" />
            </span>
            HospitalOS
          </Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">{children}</div>
      </section>
    </main>
  );
}
