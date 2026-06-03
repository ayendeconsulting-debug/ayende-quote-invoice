"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Search, X } from "lucide-react";

export function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(value: string) {
    const q = value.trim();
    router.push(q ? `/clients?q=${encodeURIComponent(q)}` : "/clients");
  }

  return (
    <div className="relative w-full max-w-sm">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-300)]" />
      <input
        ref={inputRef}
        defaultValue={initialQuery}
        placeholder="Search name, company, or email…"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit((e.target as HTMLInputElement).value);
        }}
        className="w-full rounded-lg border border-[var(--color-line)] bg-white py-2 pl-9 pr-9 text-sm outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-100)]"
      />
      {initialQuery ? (
        <button
          aria-label="Clear search"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = "";
            submit("");
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-300)] hover:text-[var(--color-ink)]"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}
