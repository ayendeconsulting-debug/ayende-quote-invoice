"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Field, Input, Textarea, Select, SubmitButton, FormMessage } from "@/components/ui/form";
import { createRecurring, updateRecurring, type RecurringState } from "./actions";
import { computeTotals, lineAmount, formatMoney, type Currency } from "@/lib/money";
import type { InvoiceClient, InvoiceProfile, RecurringInitial } from "./data";

interface EditorLine {
  key: string;
  description: string;
  detail: string;
  hours: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const blankLine = (): EditorLine => ({ key: uid(), description: "", detail: "", hours: "", quantity: "1", unit: "", unitPrice: "" });

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RecurringEditor({
  clients,
  profile,
  initial,
}: {
  clients: InvoiceClient[];
  profile: InvoiceProfile;
  initial?: RecurringInitial;
}) {
  const isEdit = Boolean(initial);
  const action = isEdit ? updateRecurring : createRecurring;
  const [state, formAction] = useActionState<RecurringState, FormData>(action, {});

  const [clientId, setClientId] = useState(initial?.clientId ?? clients[0]?.id ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? profile.defaultCurrency ?? "CAD");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [taxEnabled, setTaxEnabled] = useState(initial?.taxEnabled ?? true);
  const [taxRate, setTaxRate] = useState(initial?.taxRate ?? profile.defaultTaxRate ?? "13");
  const [taxLabel, setTaxLabel] = useState(initial?.taxLabel ?? profile.taxLabel ?? "HST");
  const [discountType, setDiscountType] = useState(initial?.discountType ?? "");
  const [discountValue, setDiscountValue] = useState(initial?.discountValue ?? "0");

  const [intervalCount, setIntervalCount] = useState(initial?.intervalCount ?? "1");
  const [intervalUnit, setIntervalUnit] = useState(initial?.intervalUnit ?? "MONTH");
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayYmd());
  const [endMode, setEndMode] = useState(initial?.endMode ?? "NEVER");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [maxOccurrences, setMaxOccurrences] = useState(initial?.maxOccurrences ?? "");

  const [lines, setLines] = useState<EditorLine[]>(
    initial?.lines.length ? initial.lines.map((l) => ({ key: uid(), ...l })) : [blankLine()]
  );

  function setClient(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) setCurrency(c.currency);
  }
  function updateLine(i: number, patch: Partial<EditorLine>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((ls) => [...ls, blankLine()]);
  }
  function removeLine(i: number) {
    setLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls));
  }
  function moveLine(i: number, dir: -1 | 1) {
    setLines((ls) => {
      const j = i + dir;
      if (j < 0 || j >= ls.length) return ls;
      const copy = [...ls];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  const totals = useMemo(() => {
    const billable = lines.map((l) => ({
      hours: l.hours === "" ? null : Number(l.hours),
      quantity: l.quantity === "" ? 1 : Number(l.quantity),
      unitPrice: Number(l.unitPrice) || 0,
    }));
    return computeTotals({
      lines: billable,
      taxEnabled,
      taxRate: Number(taxRate) || 0,
      discountType: discountType === "PERCENT" || discountType === "FIXED" ? (discountType as "PERCENT" | "FIXED") : null,
      discountValue: Number(discountValue) || 0,
    });
  }, [lines, taxEnabled, taxRate, discountType, discountValue]);

  const payload = {
    id: initial?.id,
    clientId,
    currency,
    title,
    notes,
    taxEnabled,
    taxRate,
    taxLabel,
    discountType: discountType || null,
    discountValue,
    intervalUnit,
    intervalCount,
    startDate,
    endMode,
    endDate,
    maxOccurrences,
    lines: lines.map((l) => ({
      description: l.description,
      detail: l.detail,
      hours: l.hours,
      quantity: l.quantity,
      unit: l.unit,
      unitPrice: l.unitPrice,
    })),
  };

  if (clients.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-8 text-center">
        <p className="text-sm text-[var(--color-muted)]">
          Add a client first, then create a recurring schedule.
        </p>
        <Link href="/clients/new" className="mt-3 inline-block text-sm font-medium text-[var(--color-accent-600)]">
          Add a client →
        </Link>
      </div>
    );
  }

  const unitLabel = (u: string, n: number) =>
    `${u === "DAY" ? "day" : u === "WEEK" ? "week" : "month"}${n === 1 ? "" : "s"}`;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      {isEdit ? <input type="hidden" name="id" value={initial!.id} /> : null}

      {/* Schedule basics */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Client" htmlFor="client" required>
            <Select id="client" value={clientId} onChange={(e) => setClient(e.target.value)}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>
              ))}
            </Select>
          </Field>
          <Field label="Currency" htmlFor="currency">
            <Select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Title / description" htmlFor="title">
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly retainer" />
          </Field>
        </div>
      </div>

      {/* Cadence + end */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6">
        <h2 className="mb-4 font-display text-base text-[var(--color-ink)]">Schedule</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-ink-500)]">Every</label>
            <div className="flex items-center gap-2">
              <Input type="number" min="1" value={intervalCount} onChange={(e) => setIntervalCount(e.target.value)} className="w-20" />
              <Select value={intervalUnit} onChange={(e) => setIntervalUnit(e.target.value)} className="w-32">
                <option value="DAY">{unitLabel("DAY", Number(intervalCount) || 1)}</option>
                <option value="WEEK">{unitLabel("WEEK", Number(intervalCount) || 1)}</option>
                <option value="MONTH">{unitLabel("MONTH", Number(intervalCount) || 1)}</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-ink-500)]">Starts</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-sm font-medium text-[var(--color-ink-500)]">Ends</label>
          <div className="flex flex-wrap items-center gap-4">
            <Select value={endMode} onChange={(e) => setEndMode(e.target.value)} className="w-48">
              <option value="NEVER">Never (run until paused)</option>
              <option value="ON_DATE">On a date</option>
              <option value="AFTER_N">After N invoices</option>
            </Select>
            {endMode === "ON_DATE" && (
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            )}
            {endMode === "AFTER_N" && (
              <div className="flex items-center gap-2">
                <Input type="number" min="1" value={maxOccurrences} onChange={(e) => setMaxOccurrences(e.target.value)} className="w-24" placeholder="e.g. 12" />
                <span className="text-sm text-[var(--color-muted)]">invoices</span>
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--color-ink-300)]">
          On each run a <strong>Draft</strong> invoice is created for you to review and send — nothing is sent automatically.
        </p>
      </div>

      {/* Line items */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base text-[var(--color-ink)]">Line items</h2>
          <span className="text-sm text-[var(--color-muted)]">Each invoice ≈ <strong className="text-[var(--color-ink)]">{formatMoney(totals.total, currency as Currency)}</strong></span>
        </div>
        <div className="space-y-3">
          {lines.map((l, i) => (
            <div key={l.key} className="rounded-lg border border-[var(--color-line)] p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <Input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} placeholder="Description" />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Input value={l.hours} onChange={(e) => updateLine(i, { hours: e.target.value })} placeholder="Hours (opt.)" type="number" />
                    <Input value={l.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} placeholder="Qty" type="number" disabled={l.hours !== ""} />
                    <Input value={l.unit} onChange={(e) => updateLine(i, { unit: e.target.value })} placeholder="Unit" />
                    <Input value={l.unitPrice} onChange={(e) => updateLine(i, { unitPrice: e.target.value })} placeholder="Rate" type="number" />
                  </div>
                </div>
                <div className="flex flex-col gap-1 pt-1">
                  <button type="button" onClick={() => moveLine(i, -1)} disabled={i === 0} className="rounded p-0.5 text-[var(--color-ink-300)] hover:text-[var(--color-ink)] disabled:opacity-30" aria-label="Move up"><ChevronUp size={15} /></button>
                  <button type="button" onClick={() => moveLine(i, 1)} disabled={i === lines.length - 1} className="rounded p-0.5 text-[var(--color-ink-300)] hover:text-[var(--color-ink)] disabled:opacity-30" aria-label="Move down"><ChevronDown size={15} /></button>
                  <button type="button" onClick={() => removeLine(i)} className="rounded p-0.5 text-[var(--color-ink-300)] hover:text-[var(--color-rose)]" aria-label="Remove line"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addLine} className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-accent-600)] hover:underline">
          <Plus size={15} /> Add line
        </button>
      </div>

      {/* Tax + discount */}
      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[var(--color-ink-500)]">
              <input type="checkbox" checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} /> Charge tax
            </label>
            <div className="flex items-center gap-2">
              <Input value={taxLabel} onChange={(e) => setTaxLabel(e.target.value)} className="w-20" disabled={!taxEnabled} />
              <Input value={taxRate} onChange={(e) => setTaxRate(e.target.value)} type="number" className="w-20" disabled={!taxEnabled} />
              <span className="text-sm text-[var(--color-muted)]">%</span>
            </div>
          </div>
          <Field label="Discount" htmlFor="dtype">
            <Select id="dtype" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
              <option value="">None</option>
              <option value="PERCENT">Percent</option>
              <option value="FIXED">Fixed</option>
            </Select>
          </Field>
          {discountType ? (
            <Field label={discountType === "PERCENT" ? "Discount %" : "Discount amount"} htmlFor="dval">
              <Input id="dval" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} type="number" />
            </Field>
          ) : null}
        </div>
        <div className="mt-4">
          <Field label="Notes & terms" htmlFor="notes">
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Appears on every generated invoice…" />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton>{isEdit ? "Save schedule" : "Create schedule"}</SubmitButton>
        <Link href="/recurring" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">Cancel</Link>
        {state.error ? <FormMessage type="error">{state.error}</FormMessage> : null}
      </div>
    </form>
  );
}
