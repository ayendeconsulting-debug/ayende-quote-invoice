"use client";

import { Trash2 } from "lucide-react";
import { deleteClient } from "./actions";

export function DeleteClientButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteClient}
      onSubmit={(e) => {
        if (!confirm(`Delete ${name}? This cannot be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-3.5 py-2 text-sm text-[var(--color-rose)] transition hover:border-[var(--color-rose)] hover:bg-[#fdecea]"
      >
        <Trash2 size={16} />
        Delete
      </button>
    </form>
  );
}
