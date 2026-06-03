import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { EmptyState } from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { formatMoney, type Currency } from "@/lib/money";
import { Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

const METHOD_LABEL: Record<string, string> = {
  ETRANSFER: "e-Transfer",
  BANK_TRANSFER: "Bank transfer",
  CASH: "Cash",
};

const FILTERS: { key: string; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ETRANSFER", label: "e-Transfer" },
  { key: "BANK_TRANSFER", label: "Bank transfer" },
  { key: "CASH", label: "Cash" },
];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string }>;
}) {
  const methodParam = (await searchParams).method?.toUpperCase() ?? "ALL";
  const active = FILTERS.some((f) => f.key === methodParam) ? methodParam : "ALL";
  const where = active === "ALL" ? {} : { method: active as never };

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { date: "desc" },
    include: { invoice: { select: { id: true, number: true, currency: true, client: { select: { name: true } } } } },
  });

  // Totals are grouped by currency (CAD/USD don't sum together).
  const totals: Record<string, number> = {};
  for (const p of payments as (typeof payments)[number][]) {
    const cur = p.invoice.currency;
    totals[cur] = Math.round(((totals[cur] ?? 0) + Number(p.amount)) * 100) / 100;
  }
  const totalLabel = Object.keys(totals).length
    ? Object.entries(totals).map(([cur, amt]) => formatMoney(amt, cur as Currency)).join("  ·  ")
    : null;

  return (
    <>
      <Topbar title="Payments" subtitle="Every payment recorded across your invoices." />
      <div className="p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={f.key === "ALL" ? "/payments" : `/payments?method=${f.key}`}
                className={`rounded-full px-3 py-1 text-sm transition ${
                  active === f.key
                    ? "bg-[var(--color-ink)] text-white"
                    : "border border-[var(--color-line)] text-[var(--color-ink-500)] hover:border-[var(--color-accent)]"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
          {totalLabel ? (
            <div className="text-sm text-[var(--color-ink-500)]">
              <span className="text-[var(--color-muted)]">Total{active === "ALL" ? "" : ` (${METHOD_LABEL[active]})`}: </span>
              <span className="font-medium tabular-nums text-[var(--color-ink)]">{totalLabel}</span>
            </div>
          ) : null}
        </div>

        {payments.length === 0 ? (
          <EmptyState
            icon={<Wallet size={22} />}
            title={active === "ALL" ? "No payments recorded" : "No payments here"}
            description={
              active === "ALL"
                ? "Record a payment from any sent invoice and it will show up here."
                : "No payments match this method filter."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[var(--color-muted)]">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: (typeof payments)[number]) => (
                  <tr key={p.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-paper)]">
                    <td className="px-5 py-3 tabular-nums text-[var(--color-ink-500)]">
                      {p.date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/invoices/${p.invoice.id}`} className="font-medium tabular-nums text-[var(--color-ink)] hover:text-[var(--color-accent-600)]">
                        {p.invoice.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-ink-500)]">{p.invoice.client.name}</td>
                    <td className="px-5 py-3 text-[var(--color-ink-500)]">{METHOD_LABEL[p.method] ?? p.method}</td>
                    <td className="px-5 py-3 text-[var(--color-ink-300)]">{p.reference || "\u2014"}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-[var(--color-ink)]">{formatMoney(Number(p.amount), p.invoice.currency as Currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
