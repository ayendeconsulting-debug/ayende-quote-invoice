import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { EmptyState } from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { formatMoney, round2, type Currency } from "@/lib/money";
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

// Tinted method chips, themed to the brand palette.
const METHOD_CHIP: Record<string, string> = {
  ETRANSFER: "bg-[var(--color-accent-100)] text-[var(--color-accent-600)]",
  BANK_TRANSFER: "bg-[#e6f1fb] text-[#0c447c]",
  CASH: "bg-[var(--color-teal-100)] text-[var(--color-teal)]",
};

// Bar colours for the method breakdown.
const METHOD_BAR: Record<string, string> = {
  ETRANSFER: "var(--color-accent)",
  BANK_TRANSFER: "#185FA5",
  CASH: "var(--color-teal-600)",
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] ${className}`}>
      {children}
    </div>
  );
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string }>;
}) {
  const methodParam = (await searchParams).method?.toUpperCase() ?? "ALL";
  const active = FILTERS.some((f) => f.key === methodParam) ? methodParam : "ALL";

  // Fetch every payment once; the overview + breakdown always reflect all
  // payments, while the method pills filter only the table below.
  const payments = await prisma.payment.findMany({
    orderBy: { date: "desc" },
    include: { invoice: { select: { id: true, number: true, currency: true, client: { select: { name: true } } } } },
  });

  if (payments.length === 0) {
    return (
      <>
        <Topbar title="Payments" breadcrumb="Billing / Payments" subtitle="Every payment recorded across your invoices." />
        <div className="p-4 sm:p-6 lg:p-8">
          <EmptyState
            icon={<Wallet size={22} />}
            title="No payments recorded"
            description="Record a payment from any sent invoice and it will show up here."
          />
        </div>
      </>
    );
  }

  // --- Aggregates (all-time, segmented by currency) ---
  const totals: Record<string, number> = {};
  const methodCounts: Record<string, number> = { ETRANSFER: 0, BANK_TRANSFER: 0, CASH: 0 };
  let largest = 0;
  let largestCur: Currency = "CAD";

  for (const p of payments as (typeof payments)[number][]) {
    const cur = p.invoice.currency;
    const amt = Number(p.amount);
    totals[cur] = round2((totals[cur] ?? 0) + amt);
    if (p.method in methodCounts) methodCounts[p.method] += 1;
    if (amt > largest) {
      largest = amt;
      largestCur = cur as Currency;
    }
  }
  const maxMethod = Math.max(methodCounts.ETRANSFER, methodCounts.BANK_TRANSFER, methodCounts.CASH, 1);

  const rows =
    active === "ALL"
      ? payments
      : (payments as (typeof payments)[number][]).filter((p) => p.method === active);

  return (
    <>
      <Topbar
        title="Payments"
        breadcrumb="Billing / Payments"
        subtitle="Every payment recorded across your invoices."
        search
      />
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Overview cards */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="p-4">
            <div className="text-xs text-[var(--color-muted)]">Received · CAD</div>
            <div className="mt-1 font-display text-2xl text-[var(--color-teal)]">{formatMoney(totals.CAD ?? 0, "CAD")}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-[var(--color-muted)]">Received · USD</div>
            <div className="mt-1 font-display text-2xl text-[var(--color-teal)]">{formatMoney(totals.USD ?? 0, "USD")}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-[var(--color-muted)]">Payments</div>
            <div className="mt-1 font-display text-2xl text-[var(--color-ink)]">{payments.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-[var(--color-muted)]">Largest</div>
            <div className="mt-1 font-display text-2xl text-[var(--color-ink)]">{formatMoney(largest, largestCur)}</div>
          </Card>
        </div>

        {/* Method breakdown */}
        <Card className="mb-4 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-ink)]">By method</span>
            <span className="text-xs text-[var(--color-muted)]">{payments.length} payments</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {(["ETRANSFER", "BANK_TRANSFER", "CASH"] as const).map((m) => (
              <div key={m} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-[var(--color-ink-500)]">{METHOD_LABEL[m]}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-paper)]">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${(methodCounts[m] / maxMethod) * 100}%`, background: METHOD_BAR[m] }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs text-[var(--color-muted)]">{methodCounts[m]}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Filter pills + table */}
        <div className="mb-3 flex flex-wrap gap-1.5">
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

        {rows.length === 0 ? (
          <Card className="px-5 py-8 text-center text-sm text-[var(--color-muted)]">
            No payments match this method filter.
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] bg-[var(--color-paper)] text-left text-[var(--color-muted)]">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p: (typeof rows)[number]) => (
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
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${METHOD_CHIP[p.method] ?? "bg-[var(--color-paper)] text-[var(--color-ink-500)]"}`}>
                        {METHOD_LABEL[p.method] ?? p.method}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-ink-300)]">{p.reference || "\u2014"}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium text-[var(--color-ink)]">{formatMoney(Number(p.amount), p.invoice.currency as Currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </Card>
        )}
      </div>
    </>
  );
}
