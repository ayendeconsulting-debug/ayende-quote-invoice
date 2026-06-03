import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { EmptyState, PrimaryLink } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatMoney, type Currency } from "@/lib/money";
import { markOverdueInvoices } from "@/lib/share";
import { ReceiptText } from "lucide-react";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "SENT", label: "Sent" },
  { key: "PARTIALLY_PAID", label: "Partially paid" },
  { key: "PAID", label: "Paid" },
  { key: "OVERDUE", label: "Overdue" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const statusParam = (await searchParams).status?.toUpperCase() ?? "ALL";
  const active = FILTERS.some((f) => f.key === statusParam) ? statusParam : "ALL";
  const where = active === "ALL" ? {} : { status: active as never };

  await markOverdueInvoices();
  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { client: true },
  });

  return (
    <>
      <Topbar
        title="Invoices"
        subtitle="Bill clients and watch the balance."
        action={<PrimaryLink href="/invoices/new">New invoice</PrimaryLink>}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-5 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "ALL" ? "/invoices" : `/invoices?status=${f.key}`}
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

        {invoices.length === 0 ? (
          active !== "ALL" ? (
            <EmptyState icon={<ReceiptText size={22} />} title="No invoices here" description="No invoices match this status filter." />
          ) : (
            <EmptyState
              icon={<ReceiptText size={22} />}
              title="No invoices yet"
              description="Convert an accepted quote in one click, or create an invoice directly."
              action={<PrimaryLink href="/invoices/new">New invoice</PrimaryLink>}
            />
          )
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[var(--color-muted)]">
                  <th className="px-5 py-3 font-medium">Number</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 text-right font-medium">Balance</th>
                  <th className="px-5 py-3 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: (typeof invoices)[number]) => {
                  const total = Number(inv.total);
                  const balance = Math.max(0, Math.round((total - Number(inv.amountPaid)) * 100) / 100);
                  return (
                    <tr key={inv.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-paper)]">
                      <td className="px-5 py-3">
                        <Link href={`/invoices/${inv.id}`} className="font-medium tabular-nums text-[var(--color-ink)] hover:text-[var(--color-accent-600)]">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-[var(--color-ink-500)]">{inv.client.name}</td>
                      <td className="px-5 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="px-5 py-3 text-right tabular-nums text-[var(--color-ink)]">{formatMoney(total, inv.currency as Currency)}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-[var(--color-ink-500)]">{formatMoney(balance, inv.currency as Currency)}</td>
                      <td className="px-5 py-3 tabular-nums text-[var(--color-ink-500)]">
                        {inv.dueDate ? inv.dueDate.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : "\u2014"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </div>
        )}
      </div>
    </>
  );
}
