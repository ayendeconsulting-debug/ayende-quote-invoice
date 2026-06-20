"use client";

import { useFormStatus } from "react-dom";
import { BellRing } from "lucide-react";
import { sendReminder } from "./actions";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-600)] disabled:opacity-60"
    >
      <BellRing size={14} /> {pending ? "Sending…" : "Send"}
    </button>
  );
}

export function SendReminderButton({ id, from = "/reminders" }: { id: string; from?: string }) {
  return (
    <form action={sendReminder}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="from" value={from} />
      <Btn />
    </form>
  );
}
