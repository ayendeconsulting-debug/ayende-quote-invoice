"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Field, Input, SubmitButton, FormMessage } from "@/components/ui/form";
import { signCloseout, type SignState } from "./actions";

interface Item { id: string; label: string; detail: string | null }

export function CloseoutSignForm({ token, items }: { token: string; items: Item[] }) {
  const [state, formAction] = useActionState<SignState, FormData>(signCloseout, {});
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((i) => [i.id, false]))
  );

  const checkedIds = useMemo(() => items.filter((i) => checked[i.id]).map((i) => i.id), [items, checked]);
  const allDone = items.length > 0 && checkedIds.length === items.length;

  if (state.ok) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[#e7f4ef] p-6 text-center">
        <CheckCircle2 className="mx-auto mb-2 text-[var(--color-teal)]" size={28} />
        <p className="font-display text-lg text-[var(--color-ink)]">Thank you — closeout signed.</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">A record of your sign-off has been saved.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="checkedIds" value={JSON.stringify(checkedIds)} />

      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base text-[var(--color-ink)]">Deliverables</h2>
          <span className="text-sm text-[var(--color-muted)]">{checkedIds.length} of {items.length} complete</span>
        </div>
        <ul className="space-y-2">
          {items.map((it) => {
            const on = !!checked[it.id];
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => setChecked((c) => ({ ...c, [it.id]: !c[it.id] }))}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${on ? "border-[var(--color-teal)] bg-[#e7f4ef]" : "border-[var(--color-line)] hover:border-[var(--color-ink-300)]"}`}
                >
                  {on ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--color-teal)]" /> : <Circle size={18} className="mt-0.5 shrink-0 text-[var(--color-ink-300)]" />}
                  <span>
                    <span className="text-sm text-[var(--color-ink)]">{it.label}</span>
                    {it.detail ? <span className="block text-xs text-[var(--color-muted)]">{it.detail}</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-5 sm:p-6">
        <h2 className="mb-4 font-display text-base text-[var(--color-ink)]">Sign off</h2>
        {!allDone ? (
          <p className="mb-4 rounded-lg bg-[#fdf3e7] px-3 py-2 text-xs text-[var(--color-amber)]">
            {checkedIds.length === 0 ? "Tick the items you confirm are complete before signing." : "Some items aren't ticked. You can still sign off — only the ticked items will be recorded as complete."}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your full name" htmlFor="name" required>
            <Input id="name" name="name" placeholder="Jane Smith" required />
          </Field>
          <Field label="Email" htmlFor="email" required>
            <Input id="email" name="email" type="email" placeholder="jane@company.com" required />
          </Field>
        </div>
        <label className="mt-4 flex items-start gap-2.5 text-sm text-[var(--color-ink-500)]">
          <input type="checkbox" name="agree" className="mt-0.5" />
          <span>I confirm the ticked deliverables are complete and I am authorised to sign off this project.</span>
        </label>
        <div className="mt-5 flex items-center gap-4">
          <SubmitButton>Sign off project</SubmitButton>
          {state.error ? <FormMessage type="error">{state.error}</FormMessage> : null}
        </div>
      </div>
    </form>
  );
}
