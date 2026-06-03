"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { formatMoney, type Currency } from "@/lib/money";
import { recordPayment, updatePayment, deletePayment } from "../payments/actions";

export interface PaymentItem {
  id: string;
  dateInput: string; // yyyy-mm-dd
  datePretty: string;
  amount: number;
  method: string;
  reference: string | null;
}

const METHOD_LABEL: Record<string, string> = {
  ETRANSFER: "e-Transfer",
  BANK_TRANSFER: "Bank transfer",
  CASH: "Cash",
};

const cell = "rounded-md border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]";

function MethodSelect({ name, defaultValue }: { name: string; defaultValue?: string }) {
  return (
    <select name={name} defaultValue={defaultValue ?? "ETRANSFER"} className={cell}>
      <option value="ETRANSFER">e-Transfer</option>
      <option value="BANK_TRANSFER">Bank transfer</option>
      <option value="CASH">Cash</option>
    </select>
  );
}

export function PaymentsPanel({
  invoiceId,
  status,
  currency,
  balanceDue,
  payments,
}: {
  invoiceId: string;
  status: string;
  currency: Currency;
  balanceDue: number;
  payments: PaymentItem[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const defaultAmount = balanceDue > 0 ? String(balanceDue) : "";

  return (
    <div className="space-y-5">
      {status === "DRAFT" ? (
        <p className="rounded-lg bg-[var(--color-paper)] px-4 py-3 text-sm text-[var(--color-ink-500)]">
          Mark this invoice as <span className="font-medium">Sent</span> before recording payments.
        </p>
      ) : (
        <form action={recordPayment} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)]/50 p-4">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
              Date
              <input type="date" name="date" defaultValue={today} className={cell} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
              Amount ({currency})
              <input type="number" name="amount" min="0.01" step="0.01" defaultValue={defaultAmount} placeholder="0.00" className={`${cell} w-32`} required />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
              Method
              <MethodSelect name="method" />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-[var(--color-muted)]">
              Reference (optional)
              <input name="reference" placeholder="Confirmation #, memo…" className={`${cell} min-w-40`} />
            </label>
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-600)]">
              <Plus size={15} /> Record
            </button>
          </div>
        </form>
      )}

      {payments.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-300)]">No payments recorded yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--color-line)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-left text-[var(--color-muted)]">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Method</th>
                <th className="px-4 py-2.5 font-medium">Reference</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) =>
                editingId === p.id ? (
                  <tr key={p.id} className="border-b border-[var(--color-line)] last:border-0 bg-[var(--color-paper)]/40">
                    <td colSpan={5} className="px-4 py-3">
                      <form action={updatePayment} className="flex flex-wrap items-end gap-3">
                        <input type="hidden" name="id" value={p.id} />
                        <label className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
                          Date
                          <input type="date" name="date" defaultValue={p.dateInput} className={cell} />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
                          Amount ({currency})
                          <input type="number" name="amount" min="0.01" step="0.01" defaultValue={String(p.amount)} className={`${cell} w-32`} required />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
                          Method
                          <MethodSelect name="method" defaultValue={p.method} />
                        </label>
                        <label className="flex flex-1 flex-col gap-1 text-xs text-[var(--color-muted)]">
                          Reference
                          <input name="reference" defaultValue={p.reference ?? ""} className={`${cell} min-w-40`} />
                        </label>
                        <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-ink)] px-3 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-ink-700)]">
                          <Check size={15} /> Save
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-ink-500)] hover:border-[var(--color-ink)]">
                          <X size={15} /> Cancel
                        </button>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-4 py-2.5 tabular-nums text-[var(--color-ink-500)]">{p.datePretty}</td>
                    <td className="px-4 py-2.5 text-[var(--color-ink-500)]">{METHOD_LABEL[p.method] ?? p.method}</td>
                    <td className="px-4 py-2.5 text-[var(--color-ink-300)]">{p.reference || "\u2014"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-ink)]">{formatMoney(p.amount, currency)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => setEditingId(p.id)} className="rounded p-1 text-[var(--color-ink-300)] hover:text-[var(--color-ink)]" aria-label="Edit payment">
                          <Pencil size={15} />
                        </button>
                        <form
                          action={deletePayment}
                          onSubmit={(e) => {
                            if (!confirm("Delete this payment? The invoice balance will be recalculated.")) e.preventDefault();
                          }}
                        >
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="rounded p-1 text-[var(--color-ink-300)] hover:text-[var(--color-rose)]" aria-label="Delete payment">
                            <Trash2 size={15} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
