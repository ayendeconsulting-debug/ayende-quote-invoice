// Reporting period model. Isomorphic (no server-only imports) so the picker
// (client) and the report loaders (server) share one definition.
//
// Two families, both supported per the Phase 8 decision:
//   - Calendar presets: This month, Last month, This quarter, Year to date
//   - Rolling windows:   Last 30 / 90 / 365 days
// Plus "All time" and a "Custom" explicit from/to range.
//
// Periods are resolved in the server's local time. For a single-user Toronto
// app this is acceptable; documented here so it isn't a surprise later.

export type PeriodKey =
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_QUARTER"
  | "YTD"
  | "LAST_30"
  | "LAST_90"
  | "LAST_365"
  | "ALL"
  | "CUSTOM";

export interface PeriodOption {
  key: PeriodKey;
  label: string;
  group: "calendar" | "rolling" | "other";
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { key: "THIS_MONTH", label: "This month", group: "calendar" },
  { key: "LAST_MONTH", label: "Last month", group: "calendar" },
  { key: "THIS_QUARTER", label: "This quarter", group: "calendar" },
  { key: "YTD", label: "Year to date", group: "calendar" },
  { key: "LAST_30", label: "Last 30 days", group: "rolling" },
  { key: "LAST_90", label: "Last 90 days", group: "rolling" },
  { key: "LAST_365", label: "Last 365 days", group: "rolling" },
  { key: "ALL", label: "All time", group: "other" },
  { key: "CUSTOM", label: "Custom range", group: "other" },
];

export interface ResolvedPeriod {
  key: PeriodKey;
  label: string;
  /** Inclusive start, or null for unbounded (all time). */
  from: Date | null;
  /** Inclusive end (set to end-of-day), or null for unbounded. */
  to: Date | null;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseDateOnly(s: string | undefined | null): Date | null {
  if (!s) return null;
  // Expecting yyyy-mm-dd from <input type="date">.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function labelForKey(key: PeriodKey): string {
  const opt = PERIOD_OPTIONS.find((o: PeriodOption) => o.key === key);
  return opt ? opt.label : "This month";
}

/**
 * Resolve a period key (plus optional custom from/to as yyyy-mm-dd strings)
 * into concrete inclusive bounds. `now` is injectable for testing.
 */
export function resolvePeriod(
  key: PeriodKey | string | undefined,
  customFrom?: string,
  customTo?: string,
  now: Date = new Date(),
): ResolvedPeriod {
  const k = (PERIOD_OPTIONS.some((o: PeriodOption) => o.key === key) ? key : "THIS_MONTH") as PeriodKey;
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (k) {
    case "THIS_MONTH":
      return { key: k, label: labelForKey(k), from: startOfDay(new Date(y, m, 1)), to: endOfDay(now) };
    case "LAST_MONTH": {
      const from = startOfDay(new Date(y, m - 1, 1));
      const to = endOfDay(new Date(y, m, 0)); // day 0 of this month = last day of prev month
      return { key: k, label: labelForKey(k), from, to };
    }
    case "THIS_QUARTER": {
      const qStartMonth = Math.floor(m / 3) * 3;
      return { key: k, label: labelForKey(k), from: startOfDay(new Date(y, qStartMonth, 1)), to: endOfDay(now) };
    }
    case "YTD":
      return { key: k, label: labelForKey(k), from: startOfDay(new Date(y, 0, 1)), to: endOfDay(now) };
    case "LAST_30":
    case "LAST_90":
    case "LAST_365": {
      const days = k === "LAST_30" ? 30 : k === "LAST_90" ? 90 : 365;
      const from = startOfDay(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
      return { key: k, label: labelForKey(k), from, to: endOfDay(now) };
    }
    case "ALL":
      return { key: k, label: labelForKey(k), from: null, to: null };
    case "CUSTOM": {
      const f = parseDateOnly(customFrom);
      const t = parseDateOnly(customTo);
      return {
        key: k,
        label: labelForKey(k),
        from: f ? startOfDay(f) : null,
        to: t ? endOfDay(t) : null,
      };
    }
    default:
      return { key: "THIS_MONTH", label: labelForKey("THIS_MONTH"), from: startOfDay(new Date(y, m, 1)), to: endOfDay(now) };
  }
}

/** Prisma date filter for a field, honoring open-ended bounds. */
export function dateRangeFilter(p: ResolvedPeriod): { gte?: Date; lte?: Date } | undefined {
  const filter: { gte?: Date; lte?: Date } = {};
  if (p.from) filter.gte = p.from;
  if (p.to) filter.lte = p.to;
  return p.from || p.to ? filter : undefined;
}

/** Short human label for the resolved range, e.g. "Jun 1 – Jun 3, 2026" or "All time". */
export function describeRange(p: ResolvedPeriod): string {
  if (!p.from && !p.to) return "All time";
  const fmt = (d: Date) => d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
  if (p.from && p.to) return `${fmt(p.from)} – ${fmt(p.to)}`;
  if (p.from) return `From ${fmt(p.from)}`;
  return `Until ${fmt(p.to as Date)}`;
}
