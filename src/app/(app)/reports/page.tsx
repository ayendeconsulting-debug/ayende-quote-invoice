import { Suspense } from "react";
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Card } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoney, type Currency } from "@/lib/money";
import { resolvePeriod, describeRange, type PeriodKey } from "@/lib/period";
import { PeriodPicker } from "./period-picker";
import {
  getReceivables,
  getOverdue,
  getPipeline,
  getPaidInPeriod,
  getRevenueByClient,
  getAcceptanceRate,
  nonZeroCurrencies,
  type ByCurrency,
  type ReceivablesRow,
  type RevenueByClientRow,
} from "@/lib/reports";
import { Download, FileSpreadsheet } from "lucide-react";

export const dynamic = "force-dynamic";

function MoneyByCurrency({ map, muted = false, positive = false }: { map: ByCurrency; muted?: boolean; positive?: boolean }) {
  const present = nonZeroCurrencies(map);
  const list = present.length ? present : (["CAD"] as Currency[]);
  const color = positive ? "var(--color-teal)" : muted ? "var(--color-ink-500)" : "var(--color-ink)";
  return (
    <div style={{ color }}>
      {list.map((c: Currency) => (
        <div key={c} className="font-display text-xl tabular-nums">
          {formatMoney(map[c], c)}
        </div>
      ))}
    </div>
  );
}

function ExportButtons({ report, qs }: { report: string; qs: string }) {
  const base = `/reports/export?report=${report}&${qs}`;
  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={`${base}&format=csv`}
        prefetch={false}
        className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] px-2.5 py-1 text-xs text-[var(--color-ink-500)] transition hover:border-[var(--color-accent)]"
      >
        <Download size={13} /> CSV
      </Link>
      <Link
        href={`${base}&format=xlsx`}
        prefetch={false}
        className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] px-2.5 py-1 text-xs text-[var(--color-ink-500)] transition hover:border-[var(--color-accent)]"
      >
        <FileSpreadsheet size={13} /> XLSX
      </Link>
    </div>
  );
}

function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
      <h2 className="font-display text-lg">{title}</h2>
      {children}
    </div>
  );
}

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : "\u2014";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const period = resolvePeriod(sp.preset as PeriodKey | undefined, sp.from, sp.to);

  const exportQs = new URLSearchParams();
  exportQs.set("preset", period.key);
  if (sp.from) exportQs.set("from", sp.from);
  if (sp.to) exportQs.set("to", sp.to);
  const qs = exportQs.toString();

  const [receivables, overdue, pipeline, paid, revenue, acceptance] = await Promise.all([
    getReceivables(),
    getOverdue(),
    getPipeline(),
    getPaidInPeriod(period),
    getRevenueByClient(period),
    getAcceptanceRate(period),
  ]);

  return (
    <>
      <Topbar title="Reports" breadcrumb="Insights / Reports" subtitle="Receivables, revenue, and acceptance rates." />
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Suspense>
            <PeriodPicker />
          </Suspense>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-muted)]">{describeRange(period)}</span>
            <Link
              href={`/reports/export?report=all&${qs}&format=xlsx`}
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-ink)] px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              <FileSpreadsheet size={15} /> Export all (XLSX)
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm text-[var(--color-muted)]">Outstanding receivables</p>
            <div className="mt-2"><MoneyByCurrency map={receivables.totalsByCurrency} /></div>
            <p className="mt-1 text-xs text-[var(--color-ink-300)]">{receivables.rows.length} open invoice(s) \u00b7 now</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-[var(--color-muted)]">Pipeline value</p>
            <div className="mt-2"><MoneyByCurrency map={pipeline.totalsByCurrency} /></div>
            <p className="mt-1 text-xs text-[var(--color-ink-300)]">{pipeline.count} accepted, not invoiced</p>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-[var(--color-muted)]">Quote acceptance rate</p>
            <p className="mt-2 font-display text-xl tabular-nums text-[var(--color-ink)]">
              {acceptance.rate === null ? "\u2014" : `${acceptance.rate.toFixed(0)}%`}
            </p>
            <p className="mt-1 text-xs text-[var(--color-ink-300)]">
              {acceptance.accepted} accepted / {acceptance.declined} declined
            </p>
          </Card>
        </div>

        <Card>
          <SectionHeader title="Paid in period">
            <div className="flex items-center gap-3">
              <div className="text-right"><MoneyByCurrency map={paid.totalsByCurrency} positive /></div>
              <ExportButtons report="paid" qs={qs} />
            </div>
          </SectionHeader>
          {paid.months.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--color-muted)]">No payments in this period.</p>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[var(--color-muted)]">
                  <th className="px-5 py-3 font-medium">Month</th>
                  <th className="px-5 py-3 text-right font-medium">CAD</th>
                  <th className="px-5 py-3 text-right font-medium">USD</th>
                </tr>
              </thead>
              <tbody>
                {paid.months.map((m: (typeof paid.months)[number]) => (
                  <tr key={m.month} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-5 py-2.5">{m.label}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{m.byCurrency.CAD ? formatMoney(m.byCurrency.CAD, "CAD") : "\u2014"}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{m.byCurrency.USD ? formatMoney(m.byCurrency.USD, "USD") : "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Revenue by client">
            <ExportButtons report="revenue" qs={qs} />
          </SectionHeader>
          {revenue.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--color-muted)]">No activity in this period.</p>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[var(--color-muted)]">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Currency</th>
                  <th className="px-5 py-3 text-right font-medium">Invoiced</th>
                  <th className="px-5 py-3 text-right font-medium">Collected</th>
                </tr>
              </thead>
              <tbody>
                {revenue.map((r: RevenueByClientRow) => (
                  <tr key={`${r.clientId}-${r.currency}`} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-5 py-2.5 text-[var(--color-ink)]">{r.client}</td>
                    <td className="px-5 py-2.5 text-[var(--color-ink-500)]">{r.currency}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(r.invoiced, r.currency)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(r.collected, r.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </Card>

        <Card>
          <SectionHeader title="Overdue invoices">
            <div className="flex items-center gap-3">
              <div className="text-right"><MoneyByCurrency map={overdue.totalsByCurrency} muted /></div>
              <ExportButtons report="overdue" qs={qs} />
            </div>
          </SectionHeader>
          {overdue.rows.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--color-muted)]">Nothing overdue.</p>
          ) : (
            <OpenInvoiceTable rows={overdue.rows} />
          )}
        </Card>

        <Card>
          <SectionHeader title="All open receivables">
            <ExportButtons report="receivables" qs={qs} />
          </SectionHeader>
          {receivables.rows.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--color-muted)]">No open invoices.</p>
          ) : (
            <OpenInvoiceTable rows={receivables.rows} />
          )}
        </Card>
      </div>
    </>
  );
}

function OpenInvoiceTable({ rows }: { rows: ReceivablesRow[] }) {
  return (
    <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
      <thead>
        <tr className="border-b border-[var(--color-line)] text-left text-[var(--color-muted)]">
          <th className="px-5 py-3 font-medium">Invoice</th>
          <th className="px-5 py-3 font-medium">Client</th>
          <th className="px-5 py-3 font-medium">Status</th>
          <th className="px-5 py-3 text-right font-medium">Outstanding</th>
          <th className="px-5 py-3 font-medium">Due</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r: ReceivablesRow) => (
          <tr key={r.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-paper)]">
            <td className="px-5 py-2.5">
              <Link href={`/invoices/${r.id}`} className="font-medium tabular-nums text-[var(--color-ink)] hover:text-[var(--color-accent-600)]">
                {r.number}
              </Link>
            </td>
            <td className="px-5 py-2.5 text-[var(--color-ink-500)]">{r.client}</td>
            <td className="px-5 py-2.5"><StatusBadge status={r.status} /></td>
            <td className="px-5 py-2.5 text-right tabular-nums text-[var(--color-ink)]">{formatMoney(r.outstanding, r.currency)}</td>
            <td className="px-5 py-2.5 tabular-nums text-[var(--color-ink-500)]">{fmtDate(r.dueDate)}</td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}
