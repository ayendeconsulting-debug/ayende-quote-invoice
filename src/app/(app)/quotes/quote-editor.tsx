"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, ChevronUp, Plus, Sparkles, Trash2 } from "lucide-react";
import { Field, Input, Textarea, Select, FormMessage } from "@/components/ui/form";
import { createQuote, updateQuote, type QuoteState } from "./actions";
import { computeTotals, lineAmount, type Currency } from "@/lib/money";
import {
  DETAILED_SKELETON,
  SECTION_KINDS,
  contributesToTotal,
  sectionMeta,
  type SectionKind,
} from "@/lib/quote-template";
import { QuotePreview, type QuoteView, type PreviewSection } from "@/components/quote-preview";
import { CatalogPicker, type CatalogOption } from "./catalog-picker";
import { AYENDE_DEFAULT_PRESET } from "@/lib/ayende-default";

// ---- editor state types (everything a string for controlled inputs) --------
interface EditorLine {
  key: string;
  description: string;
  detail: string;
  hours: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}
interface EditorSection {
  key: string;
  kind: string;
  title: string;
  items: EditorLine[];
}

export interface ClientOption {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  currency: string;
  addressLines: string[];
}
export interface ProfileInfo {
  businessName: string;
  addressLines: string[];
  email: string | null;
  phone: string | null;
  website: string | null;
}
export interface QuoteInitial {
  id?: string;
  number?: string;
  status?: string;
  clientId: string;
  template: string;
  currency: string;
  title: string;
  introText: string;
  notes: string;
  issueDate: string; // yyyy-mm-dd
  validUntil: string; // yyyy-mm-dd or ""
  taxEnabled: boolean;
  taxRate: string;
  taxLabel: string;
  discountType: string; // "" | "PERCENT" | "FIXED"
  discountValue: string;
  sections: { kind: string; title: string; items: Omit<EditorLine, "key">[] }[];
}

const uid = () => Math.random().toString(36).slice(2, 10);
const blankLine = (): EditorLine => ({ key: uid(), description: "", detail: "", hours: "", quantity: "1", unit: "", unitPrice: "" });

function skeletonSections(): EditorSection[] {
  return DETAILED_SKELETON.map((s) => ({ key: uid(), kind: s.kind, title: s.title, items: [blankLine()] }));
}

function fmtDate(d: string): string | null {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

export function QuoteEditor({
  clients,
  profile,
  catalog,
  initial,
}: {
  clients: ClientOption[];
  profile: ProfileInfo;
  catalog: CatalogOption[];
  initial?: QuoteInitial;
}) {
  const isEdit = Boolean(initial?.id);
  const action = isEdit ? updateQuote : createQuote;
  const [state, formAction] = useActionState<QuoteState, FormData>(action, {});

  const [clientId, setClientId] = useState(initial?.clientId ?? (clients[0]?.id ?? ""));
  const [template, setTemplate] = useState(initial?.template ?? "DETAILED");
  const [currency, setCurrency] = useState(initial?.currency ?? (clients[0]?.currency ?? "CAD"));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [introText, setIntroText] = useState(initial?.introText ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [taxEnabled, setTaxEnabled] = useState(initial?.taxEnabled ?? true);
  const [taxRate, setTaxRate] = useState(initial?.taxRate ?? "13");
  const [taxLabel] = useState(initial?.taxLabel ?? "HST");
  const [discountType, setDiscountType] = useState(initial?.discountType ?? "");
  const [discountValue, setDiscountValue] = useState(initial?.discountValue ?? "0");

  const [sections, setSections] = useState<EditorSection[]>(() => {
    if (initial?.sections?.length) {
      return initial.sections.map((s) => ({
        key: uid(),
        kind: s.kind,
        title: s.title,
        items: s.items.map((it) => ({ ...it, key: uid() })),
      }));
    }
    return (initial?.template ?? "DETAILED") === "SIMPLE"
      ? [{ key: uid(), kind: "GENERIC", title: "Line Items", items: [blankLine()] }]
      : skeletonSections();
  });

  const selectedClient = clients.find((c) => c.id === clientId);

  function onSelectClient(id: string) {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    if (c) setCurrency(c.currency); // client currency wins (overridable below)
  }

  function switchTemplate(next: string) {
    if (next === template) return;
    const hasData = sections.some((s) => s.items.some((it) => it.description.trim().length));
    if (hasData && !confirm("Switch template? Your current sections will be reorganized into the new layout.")) return;

    const carried = sections.flatMap((s) => s.items);
    if (next === "SIMPLE") {
      setSections([{ key: uid(), kind: "GENERIC", title: "Line Items", items: carried.length ? carried : [blankLine()] }]);
    } else {
      const skel = skeletonSections();
      if (carried.length) skel[0].items = carried; // drop existing work into Scope
      setSections(skel);
    }
    setTemplate(next);
  }

  // ---- section / item mutation helpers -------------------------------------
  const updateSection = (si: number, patch: Partial<EditorSection>) =>
    setSections((prev) => prev.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  const updateLine = (si: number, li: number, patch: Partial<EditorLine>) =>
    setSections((prev) =>
      prev.map((s, i) => (i === si ? { ...s, items: s.items.map((it, j) => (j === li ? { ...it, ...patch } : it)) } : s)),
    );
  const addLine = (si: number) =>
    setSections((prev) => prev.map((s, i) => (i === si ? { ...s, items: [...s.items, blankLine()] } : s)));
  const removeLine = (si: number, li: number) =>
    setSections((prev) => prev.map((s, i) => (i === si ? { ...s, items: s.items.filter((_, j) => j !== li) } : s)));
  const moveLine = (si: number, li: number, dir: -1 | 1) =>
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== si) return s;
        const j = li + dir;
        if (j < 0 || j >= s.items.length) return s;
        const items = [...s.items];
        [items[li], items[j]] = [items[j], items[li]];
        return { ...s, items };
      }),
    );
  const addSection = (kind: SectionKind) =>
    setSections((prev) => [...prev, { key: uid(), kind, title: sectionMeta(kind).label, items: [blankLine()] }]);
  const removeSection = (si: number) => setSections((prev) => prev.filter((_, i) => i !== si));
  const moveSection = (si: number, dir: -1 | 1) =>
    setSections((prev) => {
      const j = si + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[si], next[j]] = [next[j], next[si]];
      return next;
    });

  function insertFromCatalog(si: number, o: CatalogOption) {
    const line: EditorLine = {
      key: uid(),
      description: o.description,
      detail: o.detail,
      hours: o.hours,
      quantity: o.quantity || "1",
      unit: o.unit,
      unitPrice: o.unitPrice,
    };
    setSections((prev) => prev.map((s, i) => (i === si ? { ...s, items: [...s.items, line] } : s)));
  }

  function loadAyendeDefault() {
    const hasData = sections.some((s) => s.items.some((it) => it.description.trim().length));
    if (hasData && !confirm("Load the Ayende Default? Your current sections will be replaced.")) return;
    setTemplate("DETAILED");
    setSections(
      AYENDE_DEFAULT_PRESET.map((s) => ({
        key: uid(),
        kind: s.kind,
        title: s.title,
        items:
          s.items.length === 0
            ? [blankLine()]
            : s.items.map((it) => ({
                key: uid(),
                description: it.description,
                detail: it.detail ?? "",
                hours: it.hours === undefined ? "" : String(it.hours),
                quantity: it.quantity === undefined ? "1" : String(it.quantity),
                unit: it.unit ?? "",
                unitPrice: it.unitPrice === undefined ? "" : String(it.unitPrice),
              })),
      })),
    );
  }

  // ---- live totals + preview view ------------------------------------------
  const view: QuoteView = useMemo(() => {
    const billable = sections
      .filter((s) => contributesToTotal(s.kind))
      .flatMap((s) => s.items)
      .map((it) => ({
        hours: it.hours.trim() === "" ? null : Number(it.hours),
        quantity: it.quantity.trim() === "" ? 1 : Number(it.quantity),
        unitPrice: Number(it.unitPrice) || 0,
      }));
    const totals = computeTotals({
      lines: billable,
      taxEnabled,
      taxRate: Number(taxRate) || 0,
      discountType: discountType === "PERCENT" || discountType === "FIXED" ? discountType : null,
      discountValue: Number(discountValue) || 0,
    });

    const previewSections: PreviewSection[] = sections.map((s) => ({
      kind: s.kind,
      title: s.title,
      items: s.items
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
            amount: lineAmount({ hours, quantity, unitPrice }),
          };
        }),
    }));

    const tcoSection = sections.find((s) => s.kind === "TCO");
    const tcoTotal = tcoSection
      ? tcoSection.items.reduce(
          (sum, it) =>
            sum + lineAmount({ hours: it.hours.trim() === "" ? null : Number(it.hours), quantity: Number(it.quantity) || 1, unitPrice: Number(it.unitPrice) || 0 }),
          0,
        )
      : undefined;

    return {
      number: initial?.number ?? null,
      status: initial?.status ?? "DRAFT",
      template: template === "SIMPLE" ? "SIMPLE" : "DETAILED",
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
      introText,
      notes,
      issueDate: fmtDate(issueDate),
      validUntil: fmtDate(validUntil),
      taxEnabled,
      taxRate: Number(taxRate) || 0,
      taxLabel,
      discountType: discountType === "PERCENT" || discountType === "FIXED" ? discountType : null,
      discountValue: Number(discountValue) || 0,
      sections: previewSections,
      totals,
      tcoTotal,
    };
  }, [sections, taxEnabled, taxRate, discountType, discountValue, template, currency, title, introText, notes, issueDate, validUntil, taxLabel, selectedClient, profile, initial]);

  const payload = {
    id: initial?.id,
    clientId,
    template,
    currency,
    title,
    introText,
    notes,
    issueDate,
    validUntil,
    taxEnabled,
    taxRate,
    taxLabel,
    discountType: discountType || null,
    discountValue,
    sections: sections.map((s) => ({
      kind: s.kind,
      title: s.title,
      items: s.items.map((it) => ({
        description: it.description,
        detail: it.detail,
        hours: it.hours,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
      })),
    })),
  };

  if (clients.length === 0) return null; // page handles the empty-clients case

  const isSimple = template === "SIMPLE";

  return (
    <form action={formAction} className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      {isEdit ? <input type="hidden" name="id" value={initial!.id} /> : null}

      {/* ---------------- LEFT: form ---------------- */}
      <div className="space-y-6">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Client" htmlFor="clientId" required>
              <Select id="clientId" value={clientId} onChange={(e) => onSelectClient(e.target.value)}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.company ? ` — ${c.company}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Template" htmlFor="template">
              <Select id="template" value={template} onChange={(e) => switchTemplate(e.target.value)}>
                <option value="DETAILED">Detailed (KSQ-style)</option>
                <option value="SIMPLE">Simple itemized</option>
              </Select>
            </Field>
            <Field label="Currency" htmlFor="currency" hint="Defaults to the client's currency.">
              <Select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
              </Select>
            </Field>
            <Field label="Title" htmlFor="title">
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Custom Software Build" />
            </Field>
            <Field label="Issue date" htmlFor="issueDate">
              <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </Field>
            <Field label="Valid until" htmlFor="validUntil">
              <Input id="validUntil" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Intro text" htmlFor="introText">
                <Textarea id="introText" value={introText} onChange={(e) => setIntroText(e.target.value)} placeholder="A short summary the client reads first." />
              </Field>
            </div>
          </div>
        </div>

        {/* Template starter */}
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--color-line)] bg-white px-4 py-3">
          <button
            type="button"
            onClick={loadAyendeDefault}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-ink)] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-ink-700)]"
          >
            <Sparkles size={15} /> Start from Ayende Default
          </button>
          <span className="text-xs text-[var(--color-ink-300)]">Loads the standard structure with the $40/hr rate on scope lines. Set any discount per quote.</span>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((s, si) => {
            const meta = sectionMeta(s.kind);
            return (
              <div key={s.key} className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-5">
                <div className="mb-1 flex items-center gap-2">
                  {isSimple ? (
                    <h3 className="font-display text-lg">Line items</h3>
                  ) : (
                    <>
                      <input
                        value={s.title}
                        onChange={(e) => updateSection(si, { title: e.target.value })}
                        className="flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 font-display text-lg text-[var(--color-ink)] outline-none hover:border-[var(--color-line)] focus:border-[var(--color-accent)]"
                      />
                      <span className="rounded-full bg-[var(--color-paper)] px-2 py-0.5 text-[11px] uppercase tracking-wide text-[var(--color-ink-300)]">
                        {s.kind}
                      </span>
                      <button type="button" onClick={() => moveSection(si, -1)} disabled={si === 0} className="rounded p-1 text-[var(--color-ink-300)] hover:text-[var(--color-ink)] disabled:opacity-30" aria-label="Move section up"><ChevronUp size={16} /></button>
                      <button type="button" onClick={() => moveSection(si, 1)} disabled={si === sections.length - 1} className="rounded p-1 text-[var(--color-ink-300)] hover:text-[var(--color-ink)] disabled:opacity-30" aria-label="Move section down"><ChevronDown size={16} /></button>
                      <button type="button" onClick={() => removeSection(si)} className="rounded p-1 text-[var(--color-ink-300)] hover:text-[var(--color-rose)]" aria-label="Remove section"><Trash2 size={16} /></button>
                    </>
                  )}
                </div>
                {meta.hint ? <p className="mb-3 text-xs text-[var(--color-ink-300)]">{meta.hint}</p> : <div className="mb-2" />}

                <div className="space-y-2">
                  {s.items.map((it, li) => (
                    <LineRow
                      key={it.key}
                      line={it}
                      priced={meta.priced}
                      canMoveUp={li > 0}
                      canMoveDown={li < s.items.length - 1}
                      onChange={(patch) => updateLine(si, li, patch)}
                      onRemove={() => removeLine(si, li)}
                      onMoveUp={() => moveLine(si, li, -1)}
                      onMoveDown={() => moveLine(si, li, 1)}
                    />
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => addLine(si)}
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--color-accent-600)] hover:text-[var(--color-accent)]"
                  >
                    <Plus size={15} /> Add {meta.priced ? "line" : "item"}
                  </button>
                  <CatalogPicker kind={s.kind} options={catalog} onPick={(o) => insertFromCatalog(si, o)} />
                </div>
              </div>
            );
          })}

          {!isSimple ? <AddSectionMenu onAdd={addSection} /> : null}
        </div>

        {/* Pricing controls */}
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
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, milestones, assumptions…" />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <SaveButtons isEdit={isEdit} />
          <Link href={isEdit ? `/quotes/${initial!.id}` : "/quotes"} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
            Cancel
          </Link>
          {state.error ? <FormMessage type="error">{state.error}</FormMessage> : null}
        </div>
      </div>

      {/* ---------------- RIGHT: live preview ---------------- */}
      <div className="xl:sticky xl:top-8 xl:self-start">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Live preview</div>
        <QuotePreview view={view} />
      </div>
    </form>
  );
}

function LineRow({
  line,
  priced,
  canMoveUp,
  canMoveDown,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  line: EditorLine;
  priced: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (patch: Partial<EditorLine>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const cell = "w-full rounded-md border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]";
  const usesHours = line.hours.trim() !== "";
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)]/40 p-2.5">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-1.5">
          <input className={cell} placeholder="Description" value={line.description} onChange={(e) => onChange({ description: e.target.value })} />
          <input className={cell} placeholder="Detail (optional)" value={line.detail} onChange={(e) => onChange({ detail: e.target.value })} />
          {priced ? (
            <div className="flex flex-wrap gap-1.5">
              <input className={`${cell} w-20`} type="number" min="0" step="0.25" placeholder="Hours" value={line.hours} onChange={(e) => onChange({ hours: e.target.value })} title="Hours — when set, line = hours × rate" />
              <input className={`${cell} w-16`} type="number" min="0" step="1" placeholder="Qty" value={line.quantity} onChange={(e) => onChange({ quantity: e.target.value })} disabled={usesHours} title="Quantity (ignored when Hours is set)" />
              <input className={`${cell} w-16`} placeholder="Unit" value={line.unit} onChange={(e) => onChange({ unit: e.target.value })} title="Unit, e.g. ea / mo" />
              <input className={`${cell} w-28`} type="number" min="0" step="0.01" placeholder={usesHours ? "Rate" : "Unit price"} value={line.unitPrice} onChange={(e) => onChange({ unitPrice: e.target.value })} title="Unit price / hourly rate" />
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-center gap-0.5 pt-0.5">
          <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className="rounded p-0.5 text-[var(--color-ink-300)] hover:text-[var(--color-ink)] disabled:opacity-30" aria-label="Move up"><ChevronUp size={15} /></button>
          <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className="rounded p-0.5 text-[var(--color-ink-300)] hover:text-[var(--color-ink)] disabled:opacity-30" aria-label="Move down"><ChevronDown size={15} /></button>
          <button type="button" onClick={onRemove} className="rounded p-0.5 text-[var(--color-ink-300)] hover:text-[var(--color-rose)]" aria-label="Remove line"><Trash2 size={15} /></button>
        </div>
      </div>
    </div>
  );
}

function AddSectionMenu({ onAdd }: { onAdd: (kind: SectionKind) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--color-line)] px-3.5 py-2 text-sm text-[var(--color-ink-500)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent-600)]"
      >
        <Plus size={15} /> Add section
      </button>
      {open ? (
        <div className="absolute z-10 mt-1 w-64 overflow-hidden rounded-lg border border-[var(--color-line)] bg-white shadow-lg">
          {SECTION_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => { onAdd(k); setOpen(false); }}
              className="block w-full px-3.5 py-2 text-left text-sm hover:bg-[var(--color-paper)]"
            >
              {sectionMeta(k).label} <span className="text-[var(--color-ink-300)]">· {k}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Two-way save: primary (full validation) + "Save as draft" (relaxed). The
// clicked button's name/value rides along in the FormData so the server action
// knows which path to take. Both disable while the action is pending.
function SaveButtons({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex items-center gap-2">
      <button
        type="submit"
        name="intent"
        value="full"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-600)] disabled:opacity-60"
      >
        {pending ? "Saving…" : isEdit ? "Save changes" : "Create quote"}
      </button>
      <button
        type="submit"
        name="intent"
        value="draft"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-lg border border-[var(--color-line)] px-4 py-2.5 text-sm font-medium text-[var(--color-ink-500)] transition hover:border-[var(--color-accent)] disabled:opacity-60"
      >
        Save as draft
      </button>
    </div>
  );
}
