import "server-only";
import { prisma } from "@/lib/prisma";
import { loadInvoiceEditorData } from "../invoices/data";
import type { InvoiceClient, InvoiceProfile } from "../invoices/invoice-editor";

export type { InvoiceClient, InvoiceProfile };

export async function loadRecurringEditorData(): Promise<{ clients: InvoiceClient[]; profile: InvoiceProfile }> {
  return loadInvoiceEditorData();
}

export interface RecurringListRow {
  id: string;
  clientName: string;
  title: string | null;
  currency: string;
  intervalUnit: string;
  intervalCount: number;
  nextRunDate: string; // pretty
  status: string;
  occurrencesGenerated: number;
  maxOccurrences: number | null;
  endMode: string;
}

function pretty(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

export async function loadRecurringList(): Promise<RecurringListRow[]> {
  const rows = await prisma.recurringInvoice.findMany({
    orderBy: [{ status: "asc" }, { nextRunDate: "asc" }],
    include: { client: { select: { name: true } } },
  });
  return rows.map((r: (typeof rows)[number]) => ({
    id: r.id,
    clientName: r.client.name,
    title: r.title,
    currency: r.currency,
    intervalUnit: r.intervalUnit,
    intervalCount: r.intervalCount,
    nextRunDate: pretty(r.nextRunDate),
    status: r.status,
    occurrencesGenerated: r.occurrencesGenerated,
    maxOccurrences: r.maxOccurrences,
    endMode: r.endMode,
  }));
}

export interface RecurringInitialLine {
  description: string;
  detail: string;
  hours: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

export interface RecurringInitial {
  id: string;
  clientId: string;
  currency: string;
  title: string;
  notes: string;
  taxEnabled: boolean;
  taxRate: string;
  taxLabel: string;
  discountType: string;
  discountValue: string;
  intervalUnit: string;
  intervalCount: string;
  startDate: string; // yyyy-mm-dd
  endMode: string;
  endDate: string; // yyyy-mm-dd or ""
  maxOccurrences: string;
  status: string;
  lines: RecurringInitialLine[];
}

function ymd(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export async function loadRecurringInitial(id: string): Promise<RecurringInitial | null> {
  const r = await prisma.recurringInvoice.findUnique({
    where: { id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!r) return null;
  return {
    id: r.id,
    clientId: r.clientId,
    currency: r.currency,
    title: r.title ?? "",
    notes: r.notes ?? "",
    taxEnabled: r.taxEnabled,
    taxRate: String(r.taxRate),
    taxLabel: r.taxLabel,
    discountType: r.discountType ?? "",
    discountValue: String(r.discountValue),
    intervalUnit: r.intervalUnit,
    intervalCount: String(r.intervalCount),
    startDate: ymd(r.startDate),
    endMode: r.endMode,
    endDate: ymd(r.endDate),
    maxOccurrences: r.maxOccurrences == null ? "" : String(r.maxOccurrences),
    status: r.status,
    lines: r.lineItems.map((it: (typeof r.lineItems)[number]) => ({
      description: it.description,
      detail: it.detail ?? "",
      hours: it.hours == null ? "" : String(it.hours),
      quantity: String(it.quantity),
      unit: it.unit ?? "",
      unitPrice: String(it.unitPrice),
    })),
  };
}
