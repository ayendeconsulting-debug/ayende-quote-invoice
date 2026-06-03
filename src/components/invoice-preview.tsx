import { formatMoney, type Currency } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";

export interface InvoiceLine {
  description: string;
  detail?: string | null;
  hours?: number | null;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  amount: number;
}

export interface InvoiceView {
  number?: string | null;
  status: string;
  currency: Currency;

  businessName: string;
  businessAddressLines: string[];
  businessEmail?: string | null;
  businessPhone?: string | null;
  businessWebsite?: string | null;
  businessTaxNumber?: string | null;

  clientName: string;
  clientCompany?: string | null;
  clientAddressLines: string[];
  clientEmail?: string | null;

  title?: string | null;
  notes?: string | null;
  issueDate?: string | null; // pre-formatted
  dueDate?: string | null; // pre-formatted

  taxEnabled: boolean;
  taxRate: number;
  taxLabel: string;
  discountType?: "PERCENT" | "FIXED" | null;
  discountValue: number;

  lines: InvoiceLine[];
  totals: { subtotal: number; discountAmount: number; taxAmount: number; total: number };
  amountPaid: number;
  balanceDue: number;
  creditBalance?: number;

  payEtransferEmail?: string | null;
  payBankDetails?: string | null;

  sourceQuoteNumber?: string | null;
}

export function InvoicePreview({ view }: { view: InvoiceView }) {
  const c = view.currency;
  const discountLabel =
    view.discountType === "PERCENT"
      ? `Discount (${Number(view.discountValue)}%)`
      : view.discountType === "FIXED"
        ? "Discount"
        : null;
  const showPaid = view.amountPaid > 0 || view.status === "PARTIALLY_PAID" || view.status === "PAID";

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
          {view.taxEnabled && view.businessTaxNumber ? (
            <div className="mt-1 text-xs text-[var(--color-muted)]">{view.taxLabel} No. {view.businessTaxNumber}</div>
          ) : null}
        </div>
        <div className="text-right">
          <div className="font-display text-2xl tracking-tight text-[var(--color-accent-600)]">INVOICE</div>
          <div className="mt-1 text-sm tabular-nums text-[var(--color-ink-500)]">{view.number ?? "— not yet saved —"}</div>
          <div className="mt-1"><StatusBadge status={view.status} /></div>
        </div>
      </div>

      {/* Parties + meta */}
      <div className="mt-5 flex flex-wrap justify-between gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Billed to</div>
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
          {view.dueDate ? (
            <div><span className="text-[var(--color-muted)]">Due </span><span className="tabular-nums">{view.dueDate}</span></div>
          ) : null}
          <div className="mt-1 text-[var(--color-muted)]">{c}</div>
          {view.sourceQuoteNumber ? (
            <div className="mt-1 text-xs text-[var(--color-ink-300)]">From quote {view.sourceQuoteNumber}</div>
          ) : null}
        </div>
      </div>

      {view.title ? <h2 className="mt-6 font-display text-2xl">{view.title}</h2> : null}

      {/* Line items */}
      <div className="mt-6">
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
            {view.lines.map((it, i) => {
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
                  <td className="py-2 px-2 text-right tabular-nums text-[var(--color-ink-500)]">{formatMoney(it.unitPrice, c)}</td>
                  <td className="py-2 pl-2 text-right tabular-nums text-[var(--color-ink)]">{formatMoney(it.amount, c)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
          {showPaid ? (
            <>
              <div className="flex justify-between text-[var(--color-teal)]">
                <span>Amount paid</span>
                <span className="tabular-nums">−{formatMoney(view.amountPaid, c)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-line)] pt-2 font-medium">
                <span>Balance due</span>
                <span className="tabular-nums">{formatMoney(view.balanceDue, c)}</span>
              </div>
              {view.creditBalance && view.creditBalance > 0 ? (
                <div className="flex justify-between text-[var(--color-teal)]">
                  <span>Credit balance</span>
                  <span className="tabular-nums">{formatMoney(view.creditBalance, c)}</span>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {/* How to pay */}
      {view.payEtransferEmail || view.payBankDetails ? (
        <div className="mt-6 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">How to pay</div>
          {view.payEtransferEmail ? (
            <div className="mt-1.5 text-sm"><span className="text-[var(--color-muted)]">e-Transfer: </span>{view.payEtransferEmail}</div>
          ) : null}
          {view.payBankDetails ? (
            <div className="mt-1 whitespace-pre-line text-sm text-[var(--color-ink-500)]">{view.payBankDetails}</div>
          ) : null}
        </div>
      ) : null}

      {view.notes ? (
        <div className="mt-6 border-t border-[var(--color-line)] pt-4">
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">Notes & terms</div>
          <p className="mt-1 whitespace-pre-line text-sm text-[var(--color-ink-500)]">{view.notes}</p>
        </div>
      ) : null}
    </div>
  );
}
