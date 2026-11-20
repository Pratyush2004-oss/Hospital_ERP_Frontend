import type { ReactNode } from "react";
import Link from "next/link";
import { Hospital } from "lucide-react";

export function AuthCard({ children, title, description, widthClassName = "max-w-md" }: { children: ReactNode; title: string; description: string; widthClassName?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <section className={`w-full space-y-6 ${widthClassName}`}>
        <div className="text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight"><span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Hospital className="size-5" /></span>HospitalOS</Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">{children}</div>
      </section>
    </main>
  );
}
