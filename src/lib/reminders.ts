import "server-only";
import { prisma } from "@/lib/prisma";
import { markOverdueInvoices } from "@/lib/share";
import { formatMoney, round2, type Currency } from "@/lib/money";

/**
 * Payment reminders (review-first; nothing is emailed automatically).
 *
 * Cadence (locked with the user):
 *   - DUE_SOON: a single heads-up in the 3 days before the due date.
 *   - OVERDUE:  on/after the due date, repeating weekly until paid (no cap).
 *
 * The weekly overdue cadence is measured from the LAST reminder of any kind, so
 * a due-soon nudge sent 2 days before the due date won't be immediately followed
 * by an overdue nudge — the first overdue one lands ~7 days later. This keeps the
 * client from getting two emails inside the same week.
 *
 * Only SENT / OVERDUE / PARTIALLY_PAID invoices with a due date and a positive
 * outstanding balance are ever eligible (never DRAFT/PAID, never zero-balance).
 */

export const DUE_SOON_DAYS = 3;
export const OVERDUE_REPEAT_DAYS = 7;

export type ReminderKind = "DUE_SOON" | "OVERDUE";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole calendar days between two dates, by UTC midnight (server resolves in UTC). */
function dayDiff(from: Date, to: Date): number {
  const a = Math.floor(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()) / DAY_MS);
  const b = Math.floor(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) / DAY_MS);
  return b - a;
}

function isEligibleStatus(status: string): boolean {
  return status === "SENT" || status === "OVERDUE" || status === "PARTIALLY_PAID";
}

/** Which reminder a dated invoice falls under right now (ignores send history). */
export function kindForDueDate(dueDate: Date, now: Date): ReminderKind {
  const daysUntilDue = dayDiff(now, dueDate);
  return daysUntilDue > 0 ? "DUE_SOON" : "OVERDUE";
}

interface ReminderInput {
  status: string;
  dueDate: Date | null;
  total: number;
  amountPaid: number;
  lastReminderAt: Date | null;
}

/**
 * Decide whether an invoice is due for a reminder right now, and of which kind.
 * Pure function — no I/O — so it's easy to reason about and reuse.
 */
export function reminderState(inv: ReminderInput, now: Date): { kind: ReminderKind | null; due: boolean } {
  const balance = round2(inv.total - inv.amountPaid);
  if (!isEligibleStatus(inv.status) || !inv.dueDate || balance <= 0) {
    return { kind: null, due: false };
  }

  const daysUntilDue = dayDiff(now, inv.dueDate); // >0 future, 0 today, <0 past

  let kind: ReminderKind | null = null;
  if (daysUntilDue > 0 && daysUntilDue <= DUE_SOON_DAYS) kind = "DUE_SOON";
  else if (daysUntilDue <= 0) kind = "OVERDUE";
  if (!kind) return { kind: null, due: false }; // more than 3 days out → nothing yet

  let due: boolean;
  if (kind === "DUE_SOON") {
    // Fire once per due-soon window: only if no reminder has gone out since the
    // window opened (dueDate − 3 days).
    const windowStart = new Date(inv.dueDate);
    windowStart.setUTCDate(windowStart.getUTCDate() - DUE_SOON_DAYS);
    due = inv.lastReminderAt === null || inv.lastReminderAt < windowStart;
  } else {
    // Weekly from the last reminder of any kind; fires immediately if never reminded.
    const daysSinceLast = inv.lastReminderAt ? dayDiff(inv.lastReminderAt, now) : Infinity;
    due = daysSinceLast >= OVERDUE_REPEAT_DAYS;
  }

  return { kind, due };
}

function prettyDate(d: Date | null): string {
  return d
    ? d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })
    : "—";
}

function relativeDue(dueDate: Date, now: Date): string {
  const n = dayDiff(now, dueDate);
  if (n > 1) return `due in ${n} days`;
  if (n === 1) return "due tomorrow";
  if (n === 0) return "due today";
  if (n === -1) return "1 day overdue";
  return `${Math.abs(n)} days overdue`;
}

export interface ReminderRow {
  id: string;
  number: string;
  status: string;
  clientName: string;
  clientEmail: string | null;
  currency: Currency;
  balance: number;
  balanceText: string;
  dueDatePretty: string;
  dueRelative: string;
  kind: ReminderKind;
  lastReminderPretty: string | null;
  reminderCount: number;
}

/**
 * The review worklist: every invoice that is due for a reminder right now.
 * Refreshes OVERDUE statuses first so badges/filters stay truthful, then
 * filters in JS via reminderState. Returns plain serializable rows.
 */
export async function loadDueReminders(): Promise<ReminderRow[]> {
  await markOverdueInvoices();
  const now = new Date();

  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ["SENT", "OVERDUE", "PARTIALLY_PAID"] as unknown as never[] },
      dueDate: { not: null },
    },
    orderBy: { dueDate: "asc" },
    include: { client: { select: { name: true, email: true } } },
  });

  const rows: ReminderRow[] = [];
  for (const inv of invoices as (typeof invoices)[number][]) {
    const total = Number(inv.total);
    const amountPaid = Number(inv.amountPaid);
    const state = reminderState(
      { status: inv.status, dueDate: inv.dueDate, total, amountPaid, lastReminderAt: inv.lastReminderAt },
      now
    );
    if (!state.due || !state.kind) continue;

    const balance = round2(total - amountPaid);
    const currency: Currency = inv.currency === "USD" ? "USD" : "CAD";
    rows.push({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      clientName: inv.client.name,
      clientEmail: inv.client.email,
      currency,
      balance,
      balanceText: formatMoney(balance, currency),
      dueDatePretty: prettyDate(inv.dueDate),
      dueRelative: inv.dueDate ? relativeDue(inv.dueDate, now) : "—",
      kind: state.kind,
      lastReminderPretty: inv.lastReminderAt
        ? new Date(inv.lastReminderAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })
        : null,
      reminderCount: inv.reminderCount,
    });
  }

  // Overdue first (more urgent), then due-soon; each already in due-date order.
  rows.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "OVERDUE" ? -1 : 1));
  return rows;
}
