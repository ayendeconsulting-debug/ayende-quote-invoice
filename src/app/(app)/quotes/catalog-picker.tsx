"use client";

import { useState } from "react";
import { BookPlus } from "lucide-react";

// String-shaped so picked items drop straight into the editor's controlled inputs.
export interface CatalogOption {
  id: string;
  sectionKind: string;
  description: string;
  detail: string;
  hours: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

export function CatalogPicker({
  kind,
  options,
  onPick,
}: {
  kind: string;
  options: CatalogOption[];
  onPick: (o: CatalogOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const matches = options.filter((o) => o.sectionKind === kind);

  if (matches.length === 0) {
    return (
      <span className="text-xs text-[var(--color-ink-300)]">
        No saved items for this section yet — add some in Settings → Catalog.
      </span>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-accent-600)] hover:text-[var(--color-accent)]"
      >
        <BookPlus size={15} /> Insert from catalog
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 max-h-72 w-80 overflow-auto rounded-lg border border-[var(--color-line)] bg-white py-1 shadow-lg">
            {matches.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onPick(o)}
                className="block w-full px-3.5 py-2 text-left text-sm hover:bg-[var(--color-paper)]"
              >
                <span className="text-[var(--color-ink)]">{o.description}</span>
                {o.hours ? <span className="text-[var(--color-ink-300)]"> · {o.hours} hrs</span> : null}
                {!o.hours && Number(o.unitPrice) ? <span className="text-[var(--color-ink-300)]"> · {o.unitPrice}</span> : null}
                {o.detail ? <div className="truncate text-xs text-[var(--color-muted)]">{o.detail}</div> : null}
              </button>
            ))}
            <div className="border-t border-[var(--color-line)] px-3.5 py-1.5 text-right">
              <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                Done
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
