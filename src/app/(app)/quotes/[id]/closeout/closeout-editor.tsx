"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Field, Input, Textarea, SubmitButton, FormMessage } from "@/components/ui/form";
import { updateCloseout, type CloseoutState } from "./actions";

interface EditorItem { key: string; label: string; detail: string }
const uid = () => Math.random().toString(36).slice(2, 10);

export function CloseoutEditor({
  closeoutId,
  quoteId,
  initial,
}: {
  closeoutId: string;
  quoteId: string;
  initial: { title: string; introNote: string; items: { label: string; detail: string }[] };
}) {
  const [state, formAction] = useActionState<CloseoutState, FormData>(updateCloseout, {});
  const [title, setTitle] = useState(initial.title);
  const [introNote, setIntroNote] = useState(initial.introNote);
  const [items, setItems] = useState<EditorItem[]>(
    initial.items.length ? initial.items.map((i) => ({ key: uid(), ...i })) : [{ key: uid(), label: "", detail: "" }]
  );

  const update = (i: number, patch: Partial<EditorItem>) =>
    setItems((xs) => xs.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const add = () => setItems((xs) => [...xs, { key: uid(), label: "", detail: "" }]);
  const remove = (i: number) => setItems((xs) => (xs.length > 1 ? xs.filter((_, idx) => idx !== i) : xs));
  const move = (i: number, dir: -1 | 1) =>
    setItems((xs) => {
      const j = i + dir;
      if (j < 0 || j >= xs.length) return xs;
      const c = [...xs];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const payload = { title, introNote, items: items.map((i) => ({ label: i.label, detail: i.detail })) };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={closeoutId} />
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6">
        <Field label="Closeout title" htmlFor="title">
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project closeout" />
        </Field>
        <div className="mt-4">
          <Field label="Intro note (optional)" htmlFor="intro" hint="Shown to the client above the checklist.">
            <Textarea id="intro" value={introNote} onChange={(e) => setIntroNote(e.target.value)} placeholder="A short message to the client about signing off the project…" />
          </Field>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6">
        <h2 className="mb-3 font-display text-base text-[var(--color-ink)]">Deliverables checklist</h2>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={it.key} className="flex items-start gap-2 rounded-lg border border-[var(--color-line)] p-3">
              <div className="flex-1 space-y-2">
                <Input value={it.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Deliverable / item" />
                <Input value={it.detail} onChange={(e) => update(i, { detail: e.target.value })} placeholder="Detail (optional)" />
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 text-[var(--color-ink-300)] hover:text-[var(--color-ink)] disabled:opacity-30" aria-label="Move up"><ChevronUp size={15} /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="rounded p-0.5 text-[var(--color-ink-300)] hover:text-[var(--color-ink)] disabled:opacity-30" aria-label="Move down"><ChevronDown size={15} /></button>
                <button type="button" onClick={() => remove(i)} className="rounded p-0.5 text-[var(--color-ink-300)] hover:text-[var(--color-rose)]" aria-label="Remove"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={add} className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-accent-600)] hover:underline">
          <Plus size={15} /> Add item
        </button>
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton>Save checklist</SubmitButton>
        <Link href={`/quotes/${quoteId}`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">Back to quote</Link>
        {state.error ? <FormMessage type="error">{state.error}</FormMessage> : null}
      </div>
    </form>
  );
}
