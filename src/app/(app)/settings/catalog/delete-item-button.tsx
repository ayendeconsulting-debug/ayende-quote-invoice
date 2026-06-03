"use client";

import { Trash2 } from "lucide-react";
import { deleteCatalogItem } from "./actions";

export function DeleteItemButton({ id, label }: { id: string; label: string }) {
  return (
    <form
      action={deleteCatalogItem}
      onSubmit={(e) => {
        if (!confirm(`Delete "${label}" from the catalog? This won't affect existing quotes.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded p-1 text-[var(--color-ink-300)] transition hover:text-[var(--color-rose)]" aria-label="Delete item">
        <Trash2 size={16} />
      </button>
    </form>
  );
}
