"use client";

import { Trash2 } from "lucide-react";
import { deleteRecurring } from "./actions";

export function DeleteRecurringButton({ id, label }: { id: string; label: string }) {
  return (
    <form
      action={deleteRecurring}
      onSubmit={(e) => {
        if (!confirm(`Delete the schedule for ${label}? Already-generated invoices are kept. This cannot be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded p-1 text-[var(--color-ink-300)] transition hover:text-[var(--color-rose)]"
        aria-label="Delete schedule"
        title="Delete schedule"
      >
        <Trash2 size={15} />
      </button>
    </form>
  );
}
