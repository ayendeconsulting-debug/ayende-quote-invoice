import "server-only";
import { prisma } from "@/lib/prisma";
import { getBusinessProfile } from "@/lib/profile";
import { nextDocumentNumber } from "@/lib/numbering";
import { computeTotals, lineAmount, round2 } from "@/lib/money";

const DUE_NET_DAYS = 15;

type Unit = "DAY" | "WEEK" | "MONTH";

/** Advance a date by N units. MONTH clamps to end-of-month (e.g. Jan 31 -> Feb 28). */
export function advanceDate(from: Date, unit: string, count: number): Date {
  const d = new Date(from);
  const n = Math.max(1, Math.floor(count || 1));
  if (unit === "DAY") {
    d.setDate(d.getDate() + n);
  } else if (unit === "WEEK") {
    d.setDate(d.getDate() + n * 7);
  } else {
    // MONTH: preserve day-of-month where possible, clamp otherwise.
    const targetDay = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(targetDay, lastDay));
  }
  return d;
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

type ScheduleWithLines = {
  id: string;
  clientId: string;
  currency: "CAD" | "USD";
  title: string | null;
  notes: string | null;
  taxEnabled: boolean;
  taxRate: unknown;
  taxLabel: string;
  discountType: string | null;
  discountValue: unknown;
  intervalUnit: string;
  intervalCount: number;
  nextRunDate: Date;
  endMode: string;
  endDate: Date | null;
  maxOccurrences: number | null;
  occurrencesGenerated: number;
  lineItems: {
    description: string;
    detail: string | null;
    hours: unknown;
    quantity: unknown;
    unit: string | null;
    unitPrice: unknown;
    sortOrder: number;
  }[];
};

/**
 * Generate exactly one invoice from a schedule, then advance it. Used by both
 * the cron (only for due schedules) and the manual "Generate now" button.
 * Returns the new invoice id, or null if the schedule has no billable lines.
 */
export async function generateOneFromSchedule(schedule: ScheduleWithLines): Promise<string | null> {
  const lines = schedule.lineItems
    .filter((it) => it.description.trim().length > 0)
    .map((it, i) => {
      const hours = it.hours === null || it.hours === undefined ? null : Number(it.hours);
      const quantity = Number(it.quantity);
      const unitPrice = Number(it.unitPrice);
      return {
        description: it.description,
        detail: it.detail,
        hours,
        quantity,
        unit: it.unit,
        unitPrice,
        amount: round2(lineAmount({ hours, quantity, unitPrice })),
        sortOrder: i,
      };
    });

  if (lines.length === 0) return null;

  const taxRate = Number(schedule.taxRate);
  const discountType =
    schedule.discountType === "PERCENT" || schedule.discountType === "FIXED" ? schedule.discountType : null;
  const discountValue = Number(schedule.discountValue);

  const totals = computeTotals({
    lines: lines.map((l) => ({ hours: l.hours, quantity: l.quantity, unitPrice: l.unitPrice })),
    taxEnabled: schedule.taxEnabled,
    taxRate,
    discountType,
    discountValue,
  });

  const profile = await getBusinessProfile();
  const number = await nextDocumentNumber("INVOICE", profile.invoicePrefix);
  const issueDate = new Date();

  const created = await prisma.invoice.create({
    data: {
      number,
      clientId: schedule.clientId,
      status: "DRAFT",
      currency: schedule.currency,
      title: schedule.title,
      notes: schedule.notes,
      issueDate,
      dueDate: addDays(issueDate, DUE_NET_DAYS),
      taxEnabled: schedule.taxEnabled,
      taxRate,
      taxLabel: schedule.taxLabel,
      discountType,
      discountValue,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      total: totals.total,
      lineItems: { create: lines },
    },
  });

  // Advance the schedule and evaluate its end condition.
  const newOccurrences = schedule.occurrencesGenerated + 1;
  const newNextRun = advanceDate(schedule.nextRunDate, schedule.intervalUnit, schedule.intervalCount);

  let completed = false;
  if (schedule.endMode === "AFTER_N" && schedule.maxOccurrences != null) {
    completed = newOccurrences >= schedule.maxOccurrences;
  } else if (schedule.endMode === "ON_DATE" && schedule.endDate != null) {
    completed = newNextRun > schedule.endDate;
  }

  await prisma.recurringInvoice.update({
    where: { id: schedule.id },
    data: {
      occurrencesGenerated: newOccurrences,
      nextRunDate: newNextRun,
      status: completed ? "COMPLETED" : undefined,
    },
  });

  return created.id;
}

/** Cron entrypoint: generate one invoice for every ACTIVE schedule that is due. */
export async function generateDueRecurringInvoices(now: Date = new Date()): Promise<{ generated: number; invoiceIds: string[] }> {
  const due = await prisma.recurringInvoice.findMany({
    where: { status: "ACTIVE", nextRunDate: { lte: now } },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  const invoiceIds: string[] = [];
  for (const schedule of due as unknown as ScheduleWithLines[]) {
    const id = await generateOneFromSchedule(schedule);
    if (id) invoiceIds.push(id);
  }
  return { generated: invoiceIds.length, invoiceIds };
}
