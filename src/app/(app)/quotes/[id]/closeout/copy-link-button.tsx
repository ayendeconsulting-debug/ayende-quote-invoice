"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard blocked; user can select manually */
        }
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-ink-500)] transition hover:border-[var(--color-ink)]"
    >
      {copied ? <Check size={15} className="text-[var(--color-teal)]" /> : <Copy size={15} />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
