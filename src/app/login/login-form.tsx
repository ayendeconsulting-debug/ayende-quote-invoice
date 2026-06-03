"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "./actions";

export function LoginForm() {
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
