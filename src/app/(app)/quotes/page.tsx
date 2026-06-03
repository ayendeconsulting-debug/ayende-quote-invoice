import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { EmptyState, PrimaryLink } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatMoney, type Currency } from "@/lib/money";
import { expireOverdueQuotes } from "@/lib/share";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "SENT", label: "Sent" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "DECLINED", label: "Declined" },
  { key: "EXPIRED", label: "Expired" },
];

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const statusParam = (await searchParams).status?.toUpperCase() ?? "ALL";
  const active = FILTERS.some((f) => f.key === statusParam) ? statusParam : "ALL";
  const where = active === "ALL" ? {} : { status: active as never };

  await expireOverdueQuotes();
  const quotes = await prisma.quote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { client: true },
  });

  return (
    <>
      <Topbar
        title="Quotes"
        subtitle="Draft, send, and track proposals."
        action={<PrimaryLink href="/quotes/new">New quote</PrimaryLink>}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-5 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "ALL" ? "/quotes" : `/quotes?status=${f.key}`}
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

        {quotes.length === 0 ? (
          active !== "ALL" ? (
            <EmptyState
              icon={<FileText size={22} />}
              title="No quotes here"
              description="No quotes match this status filter."
            />
          ) : (
            <EmptyState
              icon={<FileText size={22} />}
              title="No quotes yet"
              description="Build a KSQ-style detailed quote or a simple itemized one."
              action={<PrimaryLink href="/quotes/new">Draft a quote</PrimaryLink>}
            />
          )
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[var(--color-muted)]">
                  <th className="px-5 py-3 font-medium">Number</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Issued</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q: (typeof quotes)[number]) => (
                  <tr key={q.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-paper)]">
                    <td className="px-5 py-3">
                      <Link href={`/quotes/${q.id}`} className="font-medium tabular-nums text-[var(--color-ink)] hover:text-[var(--color-accent-600)]">
                        {q.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-ink-500)]">{q.client.name}</td>
                    <td className="px-5 py-3 text-[var(--color-ink-500)]">{q.title ?? "\u2014"}</td>
                    <td className="px-5 py-3"><StatusBadge status={q.status} /></td>
                    <td className="px-5 py-3 text-right tabular-nums text-[var(--color-ink)]">
                      {formatMoney(Number(q.total), q.currency as Currency)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-[var(--color-ink-500)]">
                      {q.issueDate.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}
      </div>
    </>
  );
}
