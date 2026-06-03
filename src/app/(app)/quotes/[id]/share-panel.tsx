"use client";

import { useActionState, useState } from "react";
import { Copy, Check, Mail, Send } from "lucide-react";
import { emailQuote, type EmailState } from "../actions";

export function SharePanel({ id, url, clientEmail }: { id: string; url: string; clientEmail: string | null }) {
  const [copied, setCopied] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [state, formAction, sending] = useActionState<EmailState, FormData>(emailQuote, {});

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked; the link is visible to copy manually */
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Public share link</div>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink-500)] outline-none"
          />
          <button
            onClick={copy}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--color-line)] px-3.5 py-2 text-sm transition hover:border-[var(--color-accent)]"
          >
            {copied ? <Check size={16} className="text-[var(--color-teal)]" /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-1 text-xs text-[var(--color-ink-300)]">
          Anyone with this link can view the quote, download the PDF, and accept or decline.
        </p>
      </div>

      {!showEmail ? (
        <button
          onClick={() => setShowEmail(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-3.5 py-2 text-sm transition hover:border-[var(--color-accent)]"
        >
          <Mail size={16} /> Email this link to the client
        </button>
      ) : (
        <form action={formAction} className="space-y-3 border-t border-[var(--color-line)] pt-4">
          <input type="hidden" name="id" value={id} />
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
            Email to {clientEmail ? <span className="text-[var(--color-ink-500)]">{clientEmail}</span> : "client"}
          </div>
          {!clientEmail ? (
            <p className="rounded-lg bg-[#fdf3e7] px-3 py-2 text-sm text-[var(--color-amber)]">
              This client has no email on file. Add one to the client record, or copy the link above and send it manually.
            </p>
          ) : (
            <textarea
              name="message"
              rows={3}
              placeholder="Optional personal note (leave blank to use the default message)…"
              className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-100)]"
            />
          )}
          {state.message ? (
            <p className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-[#e7f4ef] text-[var(--color-teal)]" : "bg-[#fdecea] text-[var(--color-rose)]"}`}>
              {state.message}
            </p>
          ) : null}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={sending || !clientEmail}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-600)] disabled:opacity-60"
            >
              <Send size={16} /> {sending ? "Sending…" : "Send email"}
            </button>
            <button type="button" onClick={() => setShowEmail(false)} className="rounded-lg px-3 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
