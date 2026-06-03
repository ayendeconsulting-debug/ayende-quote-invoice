import "server-only";
import { prisma } from "@/lib/prisma";
import type { Currency } from "@/lib/money";
import { round2 } from "@/lib/money";
import { dateRangeFilter, type ResolvedPeriod } from "@/lib/period";

// All monetary aggregation is done in JS over findMany results. Volumes are
// tiny (single-user app) and this sidesteps Prisma groupBy Decimal typing.
// Decimals come back as objects -> coerce with Number(). Every money figure is
// segmented by currency (CAD / USD are never blended).

export const CURRENCIES: Currency[] = ["CAD", "USD"];

export type ByCurrency = Record<Currency, number>;

function emptyByCurrency(): ByCurrency {
  return { CAD: 0, USD: 0 };
}

function add(map: ByCurrency, currency: string, amount: number): void {
  const c = (currency === "USD" ? "USD" : "CAD") as Currency;
  map[c] = round2(map[c] + amount);
}

/** Currencies in a map that have a non-zero value (for compact display). */
export function nonZeroCurrencies(map: ByCurrency): Currency[] {
  return CURRENCIES.filter((c: Currency) => Math.abs(map[c]) > 0.001);
}

const OPEN_INVOICE_STATUSES = ["SENT", "PARTIALLY_PAID", "OVERDUE"] as const;

// ---------- Receivables (point-in-time snapshot, not period-bound) ----------

export interface ReceivablesRow {
  id: string;
  number: string;
  client: string;
  currency: Currency;
  total: number;
  paid: number;
  outstanding: number;
  dueDate: Date | null;
  status: string;
}

export interface Receivables {
  rows: ReceivablesRow[];
  totalsByCurrency: ByCurrency;
}

export async function getReceivables(): Promise<Receivables> {
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: OPEN_INVOICE_STATUSES as unknown as never[] } },
    include: { client: true },
    orderBy: { dueDate: "asc" },
  });
  const totals = emptyByCurrency();
  const rows: ReceivablesRow[] = invoices
    .map((inv: (typeof invoices)[number]) => {
      const total = Number(inv.total);
      const paid = Number(inv.amountPaid);
      const outstanding = round2(Math.max(total - paid, 0));
      add(totals, inv.currency, outstanding);
      return {
        id: inv.id,
        number: inv.number,
        client: inv.client.name,
        currency: inv.currency as Currency,
        total,
        paid,
        outstanding,
        dueDate: inv.dueDate ?? null,
        status: inv.status,
      };
    })
    .filter((r: ReceivablesRow) => r.outstanding > 0.001);
  return { rows, totalsByCurrency: totals };
}

// ---------- Overdue (derived live from dueDate, never written) ----------

export async function getOverdue(now: Date = new Date()): Promise<Receivables> {
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: OPEN_INVOICE_STATUSES as unknown as never[] },
      dueDate: { lt: now },
    },
    include: { client: true },
    orderBy: { dueDate: "asc" },
  });
  const totals = emptyByCurrency();
  const rows: ReceivablesRow[] = invoices
    .map((inv: (typeof invoices)[number]) => {
      const total = Number(inv.total);
      const paid = Number(inv.amountPaid);
      const outstanding = round2(Math.max(total - paid, 0));
      add(totals, inv.currency, outstanding);
      return {
        id: inv.id,
        number: inv.number,
        client: inv.client.name,
        currency: inv.currency as Currency,
        total,
        paid,
        outstanding,
        dueDate: inv.dueDate ?? null,
        status: inv.status,
      };
    })
    .filter((r: ReceivablesRow) => r.outstanding > 0.001);
  return { rows, totalsByCurrency: totals };
}

// ---------- Pipeline (accepted quotes not yet invoiced, snapshot) ----------

export interface Pipeline {
  count: number;
  totalsByCurrency: ByCurrency;
}

export async function getPipeline(): Promise<Pipeline> {
  const quotes = await prisma.quote.findMany({
    where: { status: "ACCEPTED", invoice: { is: null } },
    select: { currency: true, total: true },
  });
  const totals = emptyByCurrency();
  quotes.forEach((q: (typeof quotes)[number]) => add(totals, q.currency, Number(q.total)));
  return { count: quotes.length, totalsByCurrency: totals };
}

// ---------- Paid in period (payments, currency from the invoice) ----------

export interface PaidByMonthRow {
  month: string; // yyyy-mm
  label: string; // "Jun 2026"
  byCurrency: ByCurrency;
}

export interface PaidInPeriod {
  totalsByCurrency: ByCurrency;
  months: PaidByMonthRow[];
}

export async function getPaidInPeriod(period: ResolvedPeriod): Promise<PaidInPeriod> {
  const range = dateRangeFilter(period);
  const payments = await prisma.payment.findMany({
    where: range ? { date: range } : {},
    include: { invoice: { select: { currency: true } } },
    orderBy: { date: "asc" },
  });

  const totals = emptyByCurrency();
  const monthMap = new Map<string, ByCurrency>();

  payments.forEach((p: (typeof payments)[number]) => {
    const currency = p.invoice.currency as Currency;
    const amount = Number(p.amount);
    add(totals, currency, amount);
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap.has(key)) monthMap.set(key, emptyByCurrency());
    add(monthMap.get(key) as ByCurrency, currency, amount);
  });

  const months: PaidByMonthRow[] = Array.from(monthMap.keys())
    .sort()
    .map((key: string) => {
      const [yy, mm] = key.split("-");
      const label = new Date(Number(yy), Number(mm) - 1, 1).toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
      });
      return { month: key, label, byCurrency: monthMap.get(key) as ByCurrency };
    });

  return { totalsByCurrency: totals, months };
}

// ---------- Revenue by client (both invoiced and collected) ----------

export interface RevenueByClientRow {
  clientId: string;
  client: string;
  currency: Currency;
  invoiced: number; // sum of invoice totals issued in period
  collected: number; // sum of payments received in period
}

export async function getRevenueByClient(period: ResolvedPeriod): Promise<RevenueByClientRow[]> {
  const range = dateRangeFilter(period);

  const invoices = await prisma.invoice.findMany({
    where: range ? { issueDate: range } : {},
    select: { clientId: true, currency: true, total: true, client: { select: { name: true } } },
  });
  const payments = await prisma.payment.findMany({
    where: range ? { date: range } : {},
    select: {
      amount: true,
      invoice: { select: { clientId: true, currency: true, client: { select: { name: true } } } },
    },
  });

  // Key rows by client + currency.
  const map = new Map<string, RevenueByClientRow>();
  const keyOf = (clientId: string, currency: Currency) => `${clientId}::${currency}`;
  const ensure = (clientId: string, name: string, currency: Currency): RevenueByClientRow => {
    const key = keyOf(clientId, currency);
    let row = map.get(key);
    if (!row) {
      row = { clientId, client: name, currency, invoiced: 0, collected: 0 };
      map.set(key, row);
    }
    return row;
  };

  invoices.forEach((inv: (typeof invoices)[number]) => {
    const currency = (inv.currency === "USD" ? "USD" : "CAD") as Currency;
    const row = ensure(inv.clientId, inv.client.name, currency);
    row.invoiced = round2(row.invoiced + Number(inv.total));
  });
  payments.forEach((p: (typeof payments)[number]) => {
    const currency = (p.invoice.currency === "USD" ? "USD" : "CAD") as Currency;
    const row = ensure(p.invoice.clientId, p.invoice.client.name, currency);
    row.collected = round2(row.collected + Number(p.amount));
  });

  return Array.from(map.values()).sort(
    (a: RevenueByClientRow, b: RevenueByClientRow) =>
      b.collected - a.collected || b.invoiced - a.invoiced || a.client.localeCompare(b.client),
  );
}

// ---------- Acceptance rate (decisions within the period) ----------

export interface AcceptanceRate {
  accepted: number;
  declined: number;
  rate: number | null; // null when no decisions in period
}

export async function getAcceptanceRate(period: ResolvedPeriod): Promise<AcceptanceRate> {
  const range = dateRangeFilter(period);
  const accepted = await prisma.quote.count({
    where: range ? { acceptedAt: range } : { acceptedAt: { not: null } },
  });
  const declined = await prisma.quote.count({
    where: range ? { declinedAt: range } : { declinedAt: { not: null } },
  });
  const decided = accepted + declined;
  return { accepted, declined, rate: decided === 0 ? null : round2((accepted / decided) * 100) };
}

// ---------- Recent activity (dashboard feed) ----------

export interface ActivityItem {
  kind: "quote" | "invoice" | "payment";
  label: string;
  sub: string;
  date: Date;
  amount: number;
  currency: Currency;
  href: string;
}

export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const [quotes, invoices, payments] = await Promise.all([
    prisma.quote.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { client: { select: { name: true } } },
    }),
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { client: { select: { name: true } } },
    }),
    prisma.payment.findMany({
      orderBy: { date: "desc" },
      take: limit,
      include: { invoice: { select: { number: true, currency: true, id: true } } },
    }),
  ]);

  const items: ActivityItem[] = [];
  quotes.forEach((q: (typeof quotes)[number]) =>
    items.push({
      kind: "quote",
      label: `Quote ${q.number}`,
      sub: q.client.name,
      date: new Date(q.createdAt),
      amount: Number(q.total),
      currency: q.currency as Currency,
      href: `/quotes/${q.id}`,
    }),
  );
  invoices.forEach((inv: (typeof invoices)[number]) =>
    items.push({
      kind: "invoice",
      label: `Invoice ${inv.number}`,
      sub: inv.client.name,
      date: new Date(inv.createdAt),
      amount: Number(inv.total),
      currency: inv.currency as Currency,
      href: `/invoices/${inv.id}`,
    }),
  );
  payments.forEach((p: (typeof payments)[number]) =>
    items.push({
      kind: "payment",
      label: `Payment on ${p.invoice.number}`,
      sub: p.method.replace("_", " ").toLowerCase(),
      date: new Date(p.date),
      amount: Number(p.amount),
      currency: p.invoice.currency as Currency,
      href: `/invoices/${p.invoice.id}`,
    }),
  );

  return items.sort((a: ActivityItem, b: ActivityItem) => b.date.getTime() - a.date.getTime()).slice(0, limit);
}

// ---------- Dashboard summary (composes the above) ----------

export interface DashboardSummary {
  receivables: ByCurrency;
  pipeline: ByCurrency;
  paidThisMonth: ByCurrency;
  acceptance: AcceptanceRate;
  activity: ActivityItem[];
}
