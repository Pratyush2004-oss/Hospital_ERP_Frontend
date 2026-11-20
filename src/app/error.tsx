"use client";

export default function GlobalError({
  reset,
}: Readonly<{ reset: () => void }>) {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <section className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground">
          The application could not render this page.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
