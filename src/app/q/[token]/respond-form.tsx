"use client";

import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";
import { acceptQuote, declineQuote, type RespondState } from "./actions";

export function RespondForm({ token }: { token: string }) {
  const [mode, setMode] = useState<"choose" | "accept" | "decline">("choose");
  const [acceptState, acceptAction, accepting] = useActionState<RespondState, FormData>(acceptQuote, {});
  const [declineState, declineAction, declining] = useActionState<RespondState, FormData>(declineQuote, {});

  const field =
    "w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-100)]";

  if (mode === "choose") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => setMode("accept")}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-3 font-medium text-white transition hover:bg-[var(--color-accent-600)]"
        >
          <Check size={18} /> Accept this quote
        </button>
        <button
          onClick={() => setMode("decline")}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--color-line)] px-4 py-3 font-medium text-[var(--color-ink-500)] transition hover:border-[var(--color-rose)] hover:text-[var(--color-rose)]"
        >
          <X size={18} /> Decline
        </button>
      </div>
    );
  }

  if (mode === "accept") {
    return (
      <form action={acceptAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <h3 className="font-display text-lg text-[var(--color-ink)]">Accept quote</h3>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-ink-500)]">Full name</label>
          <input name="name" required autoComplete="name" className={field} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-ink-500)]">Email</label>
          <input name="email" type="email" required autoComplete="email" className={field} />
        </div>
        <label className="flex items-start gap-2.5 text-sm text-[var(--color-ink-500)]">
          <input name="agree" type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
          <span>I confirm that I have reviewed this quote and accept it on behalf of the client. Typing my name acts as my electronic signature.</span>
        </label>
        {acceptState.error ? (
          <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm text-[var(--color-rose)]">{acceptState.error}</p>
        ) : null}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={accepting}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 font-medium text-white transition hover:bg-[var(--color-accent-600)] disabled:opacity-60"
          >
            <Check size={16} /> {accepting ? "Submitting…" : "Confirm acceptance"}
          </button>
          <button type="button" onClick={() => setMode("choose")} className="rounded-lg px-4 py-2.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
            Back
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={declineAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <h3 className="font-display text-lg text-[var(--color-ink)]">Decline quote</h3>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[var(--color-ink-500)]">Reason (optional)</label>
        <textarea name="reason" rows={3} className={`${field} resize-y`} placeholder="Let us know if there's anything we can adjust." />
      </div>
      {declineState.error ? (
        <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm text-[var(--color-rose)]">{declineState.error}</p>
      ) : null}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={declining}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-rose)] px-4 py-2.5 font-medium text-[var(--color-rose)] transition hover:bg-[#fdecea] disabled:opacity-60"
        >
          <X size={16} /> {declining ? "Submitting…" : "Confirm decline"}
        </button>
        <button type="button" onClick={() => setMode("choose")} className="rounded-lg px-4 py-2.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          Back
        </button>
      </div>
    </form>
  );
}
