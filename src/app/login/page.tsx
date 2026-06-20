import { Suspense } from "react";
import { LoginForm } from "./login-form";

// Render per-request so the embedded Server Action ID always matches the
// running deployment. A statically-prerendered login page can be served from
// the edge with a stale action ID after a redeploy, which surfaces as
// "Server Action was not found on the server" on submit.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden flex-col justify-between bg-[var(--color-ink)] p-12 text-white md:flex">
        <div className="font-display text-xl tracking-tight">
          Ayende <span className="text-[var(--color-accent)]">Books</span>
        </div>
        <div>
          <h1 className="font-display text-4xl leading-tight text-white">
            Quotes & invoices,
            <br />
            done properly.
          </h1>
          <p className="mt-4 max-w-sm text-[var(--color-ink-300)]">
            Draft polished quotes, convert them to invoices in a click, and track every payment — all in one place.
          </p>
        </div>
        <p className="text-sm text-[var(--color-ink-300)]">© {new Date().getFullYear()} Ayende Consulting Inc.</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center p-8">
        <div className="mb-8 w-full max-w-sm">
          <h2 className="font-display text-2xl">Welcome back</h2>
          <p className="mt-1 text-[var(--color-muted)]">Sign in to your workspace.</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
