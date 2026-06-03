"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Field, Input, Textarea, Select, SubmitButton, FormMessage } from "@/components/ui/form";
import { createInvoice, type InvoiceState } from "./actions";
import { computeTotals, lineAmount, round2, type Currency } from "@/lib/money";
import { InvoicePreview, type InvoiceView, type InvoiceLine } from "@/components/invoice-preview";

interface EditorLine {
  key: string;
  description: string;
  detail: string;
  hours: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

export interface InvoiceClient {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  currency: string;
  addressLines: string[];
}
export interface InvoiceProfile {
  businessName: string;
  addressLines: string[];
  email: string | null;
  phone: string | null;
  website: string | null;
  defaultCurrency: string;
  defaultTaxRate: string;
  taxLabel: string;
  etransferEmail: string | null;
  bankDetails: string | null;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const blankLine = (): EditorLine => ({ key: uid(), description: "", detail: "", hours: "", quantity: "1", unit: "", unitPrice: "" });

function fmtDate(d: string): string | null {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}
function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function InvoiceEditor({ clients, profile }: { clients: InvoiceClient[]; profile: InvoiceProfile }) {
  const [state, formAction] = useActionState<InvoiceState, FormData>(createInvoice, {});

  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [currency, setCurrency] = useState(clients[0]?.currency ?? profile.defaultCurrency ?? "CAD");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(todayPlus(15));
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(profile.defaultTaxRate || "13");
  const [taxLabel] = useState(profile.taxLabel || "HST");
  const [discountType, setDiscountType] = useState("");
  const [discountValue, setDiscountValue] = useState("0");
  const [lines, setLines] = useState<EditorLine[]>([blankLine()]);

  const selectedClient = clients.find((c) => c.id === clientId);

  function onSelectClient(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) setCurrency(c.currency);
  }

  const updateLine = (li: number, patch: Partial<EditorLine>) =>
    setLines((prev) => prev.map((it, j) => (j === li ? { ...it, ...patch } : it)));
  const addLine = () => setLines((prev) => [...prev, blankLine()]);
  const removeLine = (li: number) => setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, j) => j !== li)));
  const moveLine = (li: number, dir: -1 | 1) =>
    setLines((prev) => {
      const j = li + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[li], next[j]] = [next[j], next[li]];
      return next;
    });

  const view: InvoiceView = useMemo(() => {
    const priced = lines.map((it) => ({
      hours: it.hours.trim() === "" ? null : Number(it.hours),
      quantity: it.quantity.trim() === "" ? 1 : Number(it.quantity),
      unitPrice: Number(it.unitPrice) || 0,
    }));
    const totals = computeTotals({
      lines: priced,
      taxEnabled,
      taxRate: Number(taxRate) || 0,
      discountType: discountType === "PERCENT" || discountType === "FIXED" ? discountType : null,
      discountValue: Number(discountValue) || 0,
    });
    const previewLines: InvoiceLine[] = lines
      .filter((it) => it.description.trim().length || it.unitPrice.trim().length || it.hours.trim().length)
      .map((it) => {
        const hours = it.hours.trim() === "" ? null : Number(it.hours);
        const quantity = it.quantity.trim() === "" ? 1 : Number(it.quantity);
        const unitPrice = Number(it.unitPrice) || 0;
        return {
          description: it.description,
          detail: it.detail || null,
          hours,
          quantity,
          unit: it.unit || null,
          unitPrice,
          amount: round2(lineAmount({ hours, quantity, unitPrice })),
        };
      });
    return {
      number: null,
      status: "DRAFT",
      currency: (currency === "USD" ? "USD" : "CAD") as Currency,
      businessName: profile.businessName,
      businessAddressLines: profile.addressLines,
      businessEmail: profile.email,
      businessPhone: profile.phone,
      businessWebsite: profile.website,
      clientName: selectedClient?.name ?? "",
      clientCompany: selectedClient?.company ?? null,
      clientAddressLines: selectedClient?.addressLines ?? [],
      clientEmail: selectedClient?.email ?? null,
      title,
      notes,
      issueDate: fmtDate(issueDate),
      dueDate: fmtDate(dueDate),
      taxEnabled,
      taxRate: Number(taxRate) || 0,
      taxLabel,
      discountType: discountType === "PERCENT" || discountType === "FIXED" ? discountType : null,
      discountValue: Number(discountValue) || 0,
      lines: previewLines,
      totals,
      amountPaid: 0,
      balanceDue: totals.total,
      payEtransferEmail: profile.etransferEmail,
      payBankDetails: profile.bankDetails,
      sourceQuoteNumber: null,
    };
  }, [lines, taxEnabled, taxRate, discountType, discountValue, currency, title, notes, issueDate, dueDate, taxLabel, selectedClient, profile]);

  const payload = {
    clientId,
    currency,
    title,
    notes,
    issueDate,
    dueDate,
    taxEnabled,
    taxRate,
    taxLabel,
    discountType: discountType || null,
    discountValue,
    lines: lines.map((it) => ({
      description: it.description,
      detail: it.detail,
      hours: it.hours,
      quantity: it.quantity,
      unit: it.unit,
      unitPrice: it.unitPrice,
    })),
  };

  if (clients.length === 0) return null;

  const cell = "w-full rounded-md border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]";

  return (
    <form action={formAction} className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div className="space-y-6">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Client" htmlFor="clientId" required>
              <Select id="clientId" value={clientId} onChange={(e) => onSelectClient(e.target.value)}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>
                ))}
              </Select>
            </Field>
            <Field label="Currency" htmlFor="currency" hint="Defaults to the client's currency.">
              <Select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
              </Select>
            </Field>
            <Field label="Title" htmlFor="title">
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Web platform — Phase 1" />
            </Field>
            <div className="hidden sm:block" />
            <Field label="Issue date" htmlFor="issueDate">
              <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </Field>
            <Field label="Due date" htmlFor="dueDate" hint="Defaults to Net 15.">
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-5">
          <h3 className="mb-3 font-display text-lg">Line items</h3>
          <div className="space-y-2">
            {lines.map((it, li) => {
              const usesHours = it.hours.trim() !== "";
              return (
                <div key={it.key} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)]/40 p-2.5">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-1.5">
                      <input className={cell} placeholder="Description" value={it.description} onChange={(e) => updateLine(li, { description: e.target.value })} />
                      <input className={cell} placeholder="Detail (optional)" value={it.detail} onChange={(e) => updateLine(li, { detail: e.target.value })} />
                      <div className="flex flex-wrap gap-1.5">
                        <input className={`${cell} w-20`} type="number" min="0" step="0.25" placeholder="Hours" value={it.hours} onChange={(e) => updateLine(li, { hours: e.target.value })} title="Hours — when set, line = hours × rate" />
                        <input className={`${cell} w-16`} type="number" min="0" step="1" placeholder="Qty" value={it.quantity} onChange={(e) => updateLine(li, { quantity: e.target.value })} disabled={usesHours} title="Quantity (ignored when Hours is set)" />
                        <input className={`${cell} w-16`} placeholder="Unit" value={it.unit} onChange={(e) => updateLine(li, { unit: e.target.value })} title="Unit, e.g. ea / mo" />
                        <input className={`${cell} w-28`} type="number" min="0" step="0.01" placeholder={usesHours ? "Rate" : "Unit price"} value={it.unitPrice} onChange={(e) => updateLine(li, { unitPrice: e.target.value })} title="Unit price / hourly rate" />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 pt-0.5">
                      <button type="button" onClick={() => moveLine(li, -1)} disabled={li === 0} className="rounded p-0.5 text-[var(--color-ink-300)] hover:text-[var(--color-ink)] disabled:opacity-30" aria-label="Move up"><ChevronUp size={15} /></button>
                      <button type="button" onClick={() => moveLine(li, 1)} disabled={li === lines.length - 1} className="rounded p-0.5 text-[var(--color-ink-300)] hover:text-[var(--color-ink)] disabled:opacity-30" aria-label="Move down"><ChevronDown size={15} /></button>
                      <button type="button" onClick={() => removeLine(li)} className="rounded p-0.5 text-[var(--color-ink-300)] hover:text-[var(--color-rose)]" aria-label="Remove line"><Trash2 size={15} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={addLine} className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-accent-600)] hover:text-[var(--color-accent)]">
            <Plus size={15} /> Add line
          </button>
        </div>

        {/* Tax & discount */}
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6">
          <h3 className="mb-4 font-display text-lg">Tax & discount</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Discount" htmlFor="discountType">
              <Select id="discountType" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                <option value="">None</option>
                <option value="PERCENT">Percentage (%)</option>
                <option value="FIXED">Fixed amount</option>
              </Select>
            </Field>
            <Field label="Discount value" htmlFor="discountValue">
              <Input id="discountValue" type="number" min="0" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} disabled={discountType === ""} />
            </Field>
            <Field label={`Tax (${taxLabel})`} htmlFor="taxEnabled">
              <label className="flex items-center gap-2 py-2.5 text-sm">
                <input type="checkbox" checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
                Apply {taxLabel}
              </label>
            </Field>
            <Field label="Tax rate (%)" htmlFor="taxRate">
              <Input id="taxRate" type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} disabled={!taxEnabled} />
            </Field>
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6">
          <Field label="Notes & terms" htmlFor="notes">
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, PO number, thank-you note…" />
          </Field>
        </div>

        <div className="flex items-center gap-4">
          <SubmitButton>Create invoice</SubmitButton>
          <Link href="/invoices" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">Cancel</Link>
          {state.error ? <FormMessage type="error">{state.error}</FormMessage> : null}
        </div>
      </div>

      <div className="xl:sticky xl:top-8 xl:self-start">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Live preview</div>
        <InvoicePreview view={view} />
      </div>
    </form>
  );
}
