import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Card, PrimaryLink } from "@/components/ui/primitives";
import { formatMoney, type Currency } from "@/lib/money";
import { resolvePeriod } from "@/lib/period";
import {
  getReceivables,
  getPipeline,
  getPaidInPeriod,
  getAcceptanceRate,
  getRecentActivity,
  nonZeroCurrencies,
  type ByCurrency,
  type ActivityItem,
} from "@/lib/reports";
import { ArrowUpRight, Clock, FileText, ReceiptText, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

function MoneyLines({ map }: { map: ByCurrency }) {
  const present = nonZeroCurrencies(map);
  const list = present.length ? present : (["CAD"] as Currency[]);
  return (
    <>
      {list.map((c: Currency) => (
        <p key={c} className="font-display text-2xl tabular-nums text-[var(--color-ink)]">
          {formatMoney(map[c], c)}
        </p>
      ))}
    </>
  );
}

const ACTIVITY_ICON = {
  quote: FileText,
  invoice: ReceiptText,
  payment: Wallet,
} as const;

export default async function DashboardPage() {
  const thisMonth = resolvePeriod("THIS_MONTH");
  const last90 = resolvePeriod("LAST_90");

  const [receivables, pipeline, paid, acceptance, activity] = await Promise.all([
    getReceivables(),
    getPipeline(),
    getPaidInPeriod(thisMonth),
    getAcceptanceRate(last90),
    getRecentActivity(8),
  ]);

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle="Your quoting and billing at a glance."
        action={<PrimaryLink href="/quotes/new">New quote</PrimaryLink>}
      />

      <div className="p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card className="p-5">
            <p className="text-sm text-[var(--color-muted)]">Outstanding receivables</p>
            <div className="mt-2"><MoneyLines map={receivables.totalsByCurrency} /></div>
            <p className="mt-1 text-xs text-[var(--color-ink-300)]">Across {receivables.rows.length} open invoice(s)</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-[var(--color-muted)]">Pipeline value</p>
            <div className="mt-2"><MoneyLines map={pipeline.totalsByCurrency} /></div>
            <p className="mt-1 text-xs text-[var(--color-ink-300)]">Accepted, not yet invoiced</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-[var(--color-muted)]">Paid this month</p>
            <div className="mt-2"><MoneyLines map={paid.totalsByCurrency} /></div>
            <p className="mt-1 text-xs text-[var(--color-ink-300)]">Cleared payments</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-[var(--color-muted)]">Quote acceptance rate</p>
            <p className="mt-2 font-display text-2xl tabular-nums text-[var(--color-ink)]">
              {acceptance.rate === null ? "\u2014" : `${acceptance.rate.toFixed(0)}%`}
            </p>
            <p className="mt-1 text-xs text-[var(--color-ink-300)]">Last 90 days</p>
          </Card>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
              <h2 className="font-display text-lg">Recent activity</h2>
              <Clock size={18} className="text-[var(--color-ink-300)]" />
            </div>
            {activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-600)]">
                  <FileText size={20} />
                </div>
                <p className="text-sm text-[var(--color-muted)]">
                  Nothing here yet. Create your first quote to get started.
                </p>
              </div>
            ) : (
              <ul>
                {activity.map((a: ActivityItem, i: number) => {
                  const Icon = ACTIVITY_ICON[a.kind];
                  return (
                    <li key={`${a.kind}-${i}`} className="border-b border-[var(--color-line)] last:border-0">
                      <Link href={a.href} className="flex items-center justify-between px-5 py-3 transition hover:bg-[var(--color-paper)]">
                        <span className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-paper)] text-[var(--color-ink-500)]">
                            <Icon size={15} />
                          </span>
                          <span>
                            <span className="block text-sm text-[var(--color-ink)]">{a.label}</span>
                            <span className="block text-xs capitalize text-[var(--color-muted)]">{a.sub}</span>
                          </span>
                        </span>
                        <span className="text-right">
                          <span className="block text-sm tabular-nums text-[var(--color-ink)]">{formatMoney(a.amount, a.currency)}</span>
                          <span className="block text-xs tabular-nums text-[var(--color-ink-300)]">
                            {new Date(a.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-lg">Quick actions</h2>
            <div className="mt-4 space-y-2">
              {[
                { href: "/quotes/new", label: "Draft a quote" },
                { href: "/clients/new", label: "Add a client" },
                { href: "/invoices", label: "View invoices" },
                { href: "/reports", label: "View reports" },
              ].map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-line)] px-3.5 py-2.5 text-sm transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-100)]/40"
                >
                  {a.label}
                  <ArrowUpRight size={16} className="text-[var(--color-ink-300)]" />
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
