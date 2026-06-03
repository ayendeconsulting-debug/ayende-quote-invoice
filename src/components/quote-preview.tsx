import { formatMoney, type Currency } from "@/lib/money";
import { sectionMeta } from "@/lib/quote-template";
import { StatusBadge } from "@/components/ui/status-badge";
import { Check, X } from "lucide-react";

export interface PreviewLine {
  description: string;
  detail?: string | null;
  hours?: number | null;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  amount: number;
}

export interface PreviewSection {
  kind: string;
  title: string;
  items: PreviewLine[];
}

export interface QuoteView {
  number?: string | null;
  status: string;
  template: "DETAILED" | "SIMPLE";
  currency: Currency;

  businessName: string;
  businessAddressLines: string[];
  businessEmail?: string | null;
  businessPhone?: string | null;
  businessWebsite?: string | null;

  clientName: string;
  clientCompany?: string | null;
  clientAddressLines: string[];
  clientEmail?: string | null;

  title?: string | null;
  introText?: string | null;
  notes?: string | null;
  issueDate?: string | null; // pre-formatted
  validUntil?: string | null; // pre-formatted

  taxEnabled: boolean;
  taxRate: number;
  taxLabel: string;
  discountType?: "PERCENT" | "FIXED" | null;
  discountValue: number;

  sections: PreviewSection[];
  totals: { subtotal: number; discountAmount: number; taxAmount: number; total: number };
  tcoTotal?: number;

  // Acceptance / decline (populated on the detail + public views; pre-formatted dates)
  acceptedByName?: string | null;
  acceptedByEmail?: string | null;
  acceptedAt?: string | null;
  declinedAt?: string | null;
  declineReason?: string | null;
}

function PricedTable({ section, currency }: { section: PreviewSection; currency: Currency }) {
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
          <th className="py-1.5 pr-3 font-medium">Description</th>
          <th className="py-1.5 px-2 text-right font-medium">Hrs / Qty</th>
          <th className="py-1.5 px-2 text-right font-medium">Rate</th>
          <th className="py-1.5 pl-2 text-right font-medium">Amount</th>
        </tr>
      </thead>
      <tbody>
        {section.items.map((it, i) => {
          const usesHours = it.hours !== null && it.hours !== undefined;
          return (
            <tr key={i} className="border-b border-[var(--color-line)] align-top last:border-0">
              <td className="py-2 pr-3">
                <div className="text-[var(--color-ink)]">{it.description || <span className="text-[var(--color-ink-300)]">—</span>}</div>
                {it.detail ? <div className="mt-0.5 text-xs text-[var(--color-muted)]">{it.detail}</div> : null}
              </td>
              <td className="py-2 px-2 text-right tabular-nums text-[var(--color-ink-500)]">
                {usesHours ? `${Number(it.hours)} hrs` : `${Number(it.quantity)}${it.unit ? ` ${it.unit}` : ""}`}
              </td>
              <td className="py-2 px-2 text-right tabular-nums text-[var(--color-ink-500)]">{formatMoney(it.unitPrice, currency)}</td>
              <td className="py-2 pl-2 text-right tabular-nums text-[var(--color-ink)]">{formatMoney(it.amount, currency)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ChecklistTable({ section, kind }: { section: PreviewSection; kind: string }) {
  const included = kind === "INCLUDED";
  return (
    <ul className="space-y-1.5 text-[13px]">
      {section.items.map((it, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className={`mt-0.5 ${included ? "text-[var(--color-teal)]" : "text-[var(--color-rose)]"}`}>
            {included ? <Check size={15} /> : <X size={15} />}
          </span>
          <span className="text-[var(--color-ink)]">
            {it.description || <span className="text-[var(--color-ink-300)]">—</span>}
            {it.detail ? <span className="text-[var(--color-muted)]"> — {it.detail}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function QuotePreview({ view }: { view: QuoteView }) {
  const c = view.currency;
  const discountLabel =
    view.discountType === "PERCENT"
      ? `Discount (${Number(view.discountValue)}%)`
      : view.discountType === "FIXED"
        ? "Discount"
        : null;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-8 text-[var(--color-ink)] shadow-sm">
      {/* Letterhead */}
      <div className="flex items-start justify-between gap-6 border-b border-[var(--color-line)] pb-5">
        <div>
          <div className="font-display text-xl leading-tight text-[var(--color-ink)]">{view.businessName}</div>
          {view.businessAddressLines.map((l, i) => (
            <div key={i} className="text-xs text-[var(--color-muted)]">{l}</div>
          ))}
          <div className="mt-1 text-xs text-[var(--color-muted)]">
            {[view.businessEmail, view.businessPhone, view.businessWebsite].filter(Boolean).join("  ·  ")}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl tracking-tight text-[var(--color-accent-600)]">QUOTE</div>
          <div className="mt-1 text-sm tabular-nums text-[var(--color-ink-500)]">{view.number ?? "— not yet saved —"}</div>
          <div className="mt-1"><StatusBadge status={view.status} /></div>
        </div>
      </div>

      {/* Acceptance / decline banner */}
      {view.status === "ACCEPTED" ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#e7f4ef] px-4 py-3 text-sm text-[var(--color-teal)]">
          <Check size={18} className="mt-0.5 shrink-0" />
          <span>
            {view.acceptedByName ? <>Accepted by <strong>{view.acceptedByName}</strong></> : "Marked as accepted"}
            {view.acceptedByEmail ? ` (${view.acceptedByEmail})` : ""}
            {view.acceptedAt ? ` on ${view.acceptedAt}` : ""}.
          </span>
        </div>
      ) : view.status === "DECLINED" ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#fdecea] px-4 py-3 text-sm text-[var(--color-rose)]">
          <X size={18} className="mt-0.5 shrink-0" />
          <span>
            Declined{view.declinedAt ? ` on ${view.declinedAt}` : ""}.
            {view.declineReason ? ` Reason: ${view.declineReason}` : ""}
          </span>
        </div>
      ) : null}

      {/* Parties + meta */}
      <div className="mt-5 flex flex-wrap justify-between gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Prepared for</div>
          <div className="mt-1 font-medium">{view.clientName || <span className="text-[var(--color-ink-300)]">—</span>}</div>
          {view.clientCompany ? <div className="text-sm text-[var(--color-ink-500)]">{view.clientCompany}</div> : null}
          {view.clientAddressLines.map((l, i) => (
            <div key={i} className="text-xs text-[var(--color-muted)]">{l}</div>
          ))}
          {view.clientEmail ? <div className="text-xs text-[var(--color-muted)]">{view.clientEmail}</div> : null}
        </div>
        <div className="text-right text-sm">
          {view.issueDate ? (
            <div><span className="text-[var(--color-muted)]">Issued </span><span className="tabular-nums">{view.issueDate}</span></div>
          ) : null}
          {view.validUntil ? (
            <div><span className="text-[var(--color-muted)]">Valid until </span><span className="tabular-nums">{view.validUntil}</span></div>
          ) : null}
          <div className="mt-1 text-[var(--color-muted)]">{c} · {view.template === "DETAILED" ? "Detailed" : "Simple"}</div>
        </div>
      </div>

      {view.title ? <h2 className="mt-6 font-display text-2xl">{view.title}</h2> : null}
      {view.introText ? <p className="mt-2 whitespace-pre-line text-sm text-[var(--color-ink-500)]">{view.introText}</p> : null}

      {/* Sections */}
      <div className="mt-6 space-y-6">
        {view.sections.map((s, i) => {
          const meta = sectionMeta(s.kind);
          if (s.items.length === 0) return null;
          return (
            <section key={i}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="font-display text-base text-[var(--color-ink)]">{s.title}</h3>
                {meta.informational ? (
                  <span className="text-[11px] uppercase tracking-wide text-[var(--color-ink-300)]">Projection — not in total</span>
                ) : null}
              </div>
              {meta.priced ? <PricedTable section={s} currency={c} /> : <ChecklistTable section={s} kind={s.kind} />}
            </section>
          );
        })}
      </div>

      {/* Totals */}
      <div className="mt-7 flex justify-end">
        <div className="w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Subtotal</span>
            <span className="tabular-nums">{formatMoney(view.totals.subtotal, c)}</span>
          </div>
          {discountLabel ? (
            <div className="flex justify-between text-[var(--color-accent-600)]">
              <span>{discountLabel}</span>
              <span className="tabular-nums">−{formatMoney(view.totals.discountAmount, c)}</span>
            </div>
          ) : null}
          {view.taxEnabled ? (
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">{view.taxLabel} ({Number(view.taxRate)}%)</span>
              <span className="tabular-nums">{formatMoney(view.totals.taxAmount, c)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-[var(--color-line)] pt-2 font-display text-lg">
            <span>Total</span>
            <span className="tabular-nums text-[var(--color-accent-600)]">{formatMoney(view.totals.total, c)}</span>
          </div>
          {view.tcoTotal !== undefined ? (
            <div className="flex justify-between pt-1 text-xs text-[var(--color-ink-300)]">
              <span>3-yr cost of ownership (projection)</span>
              <span className="tabular-nums">{formatMoney(view.tcoTotal, c)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {view.notes ? (
        <div className="mt-6 border-t border-[var(--color-line)] pt-4">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Notes & terms</div>
          <p className="mt-1 whitespace-pre-line text-sm text-[var(--color-ink-500)]">{view.notes}</p>
        </div>
      ) : null}
    </div>
  );
}
