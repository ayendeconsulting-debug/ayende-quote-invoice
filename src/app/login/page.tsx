"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { login, type LoginState } from "./actions";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="w-full max-w-sm">
      <input type="hidden" name="next" value={next} />

      <label className="mb-1.5 block text-sm font-medium text-[var(--color-ink-500)]">Email</label>
      <input
        name="email"
        type="email"
        autoComplete="username"
        required
        className="mb-4 w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-100)]"
      />

      <label className="mb-1.5 block text-sm font-medium text-[var(--color-ink-500)]">Password</label>
      <input
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="mb-5 w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-100)]"
      />

      {state.error ? (
        <p className="mb-4 rounded-lg bg-[#fdecea] px-3 py-2 text-sm text-[var(--color-rose)]">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white transition hover:bg-[var(--color-accent-600)] disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden flex-col justify-between bg-[var(--color-ink)] p-12 text-white md:flex">
        <div className="font-display text-xl tracking-tight">
          Ayende <span className="text-[var(--color-accent)]">Consulting</span>
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
