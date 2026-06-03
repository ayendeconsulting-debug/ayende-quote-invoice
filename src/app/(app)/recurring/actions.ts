"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateOneFromSchedule } from "@/lib/recurring";

export type RecurringState = { error?: string };

function s(v?: string): string {
  return (v ?? "").trim();
}
function sOrNull(v?: string): string | null {
  const t = s(v);
  return t.length ? t : null;
}
function num(v?: string, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function nOrNull(v?: string): number | null {
  if (v === undefined || s(v) === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function dateOrNull(v?: string): Date | null {
  const t = s(v);
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

interface PayloadLine {
  description?: string;
  detail?: string;
  hours?: string;
  quantity?: string;
  unit?: string;
  unitPrice?: string;
}
interface Payload {
  clientId?: string;
  currency?: string;
  title?: string;
  notes?: string;
  taxEnabled?: boolean;
  taxRate?: string;
  taxLabel?: string;
  discountType?: string;
  discountValue?: string;
  intervalUnit?: string;
  intervalCount?: string;
  startDate?: string;
  endMode?: string;
  endDate?: string;
  maxOccurrences?: string;
  lines?: PayloadLine[];
}

interface Normalized {
  clientId: string;
  currency: "CAD" | "USD";
  title: string | null;
  notes: string | null;
  taxEnabled: boolean;
  taxRate: number;
  taxLabel: string;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: number;
  intervalUnit: "DAY" | "WEEK" | "MONTH";
  intervalCount: number;
  startDate: Date;
  endMode: "NEVER" | "ON_DATE" | "AFTER_N";
  endDate: Date | null;
  maxOccurrences: number | null;
  lines: {
    description: string;
    detail: string | null;
    hours: number | null;
    quantity: number;
    unit: string | null;
    unitPrice: number;
    sortOrder: number;
  }[];
}

function parse(raw: string): { ok: true; data: Normalized } | { ok: false; error: string } {
  let p: Payload;
  try {
    p = JSON.parse(raw) as Payload;
  } catch {
    return { ok: false, error: "Could not read the schedule data. Please retry." };
  }

  const clientId = s(p.clientId);
  if (!clientId) return { ok: false, error: "Please choose a client." };

  const currency = p.currency === "USD" ? "USD" : "CAD";
  const taxRate = num(p.taxRate, 0);
  if (taxRate < 0 || taxRate > 100) return { ok: false, error: "Tax rate must be between 0 and 100." };

  let discountType: "PERCENT" | "FIXED" | null = null;
  if (p.discountType === "PERCENT" || p.discountType === "FIXED") discountType = p.discountType;
  const discountValue = num(p.discountValue, 0);
  if (discountValue < 0) return { ok: false, error: "Discount value cannot be negative." };
  if (discountType === "PERCENT" && discountValue > 100)
    return { ok: false, error: "A percentage discount cannot exceed 100%." };

  const intervalUnit = p.intervalUnit === "DAY" ? "DAY" : p.intervalUnit === "WEEK" ? "WEEK" : "MONTH";
  const intervalCount = Math.floor(num(p.intervalCount, 1));
  if (intervalCount < 1) return { ok: false, error: "Interval must be at least 1." };

  const startDate = dateOrNull(p.startDate);
  if (!startDate) return { ok: false, error: "Please choose a start date." };

  const endMode = p.endMode === "ON_DATE" ? "ON_DATE" : p.endMode === "AFTER_N" ? "AFTER_N" : "NEVER";
  let endDate: Date | null = null;
  let maxOccurrences: number | null = null;
  if (endMode === "ON_DATE") {
    endDate = dateOrNull(p.endDate);
    if (!endDate) return { ok: false, error: "Choose an end date, or pick a different end option." };
    if (endDate < startDate) return { ok: false, error: "The end date can't be before the start date." };
  } else if (endMode === "AFTER_N") {
    maxOccurrences = Math.floor(num(p.maxOccurrences, 0));
    if (maxOccurrences < 1) return { ok: false, error: "Enter how many invoices to generate (at least 1)." };
  }

  const rawLines = Array.isArray(p.lines) ? p.lines : [];
  const lines = rawLines
    .filter((it) => s(it.description).length > 0 || nOrNull(it.unitPrice) !== null || nOrNull(it.hours) !== null)
    .map((it, i) => {
      const hours = nOrNull(it.hours);
      const quantity = it.quantity !== undefined && s(it.quantity).length ? num(it.quantity, 1) : 1;
      const unitPrice = num(it.unitPrice, 0);
      return {
        description: s(it.description),
        detail: sOrNull(it.detail),
        hours,
        quantity,
        unit: sOrNull(it.unit),
        unitPrice,
        sortOrder: i,
      };
    });

  if (!lines.some((l) => l.description.length > 0))
    return { ok: false, error: "Add at least one line item before saving." };

  return {
    ok: true,
    data: {
      clientId,
      currency,
      title: sOrNull(p.title),
      notes: sOrNull(p.notes),
      taxEnabled: p.taxEnabled !== false,
      taxRate,
      taxLabel: s(p.taxLabel) || "HST",
      discountType,
      discountValue,
      intervalUnit,
      intervalCount,
      startDate,
      endMode,
      endDate,
      maxOccurrences,
      lines,
    },
  };
}

export async function createRecurring(_prev: RecurringState, formData: FormData): Promise<RecurringState> {
  const parsed = parse(String(formData.get("payload") ?? ""));
  if (!parsed.ok) return { error: parsed.error };
  const d = parsed.data;

  const client = await prisma.client.findUnique({ where: { id: d.clientId } });
  if (!client) return { error: "That client no longer exists." };

  let id: string;
  try {
    const created = await prisma.recurringInvoice.create({
      data: {
        clientId: d.clientId,
        currency: d.currency,
        title: d.title,
        notes: d.notes,
        taxEnabled: d.taxEnabled,
        taxRate: d.taxRate,
        taxLabel: d.taxLabel,
        discountType: d.discountType,
        discountValue: d.discountValue,
        intervalUnit: d.intervalUnit,
        intervalCount: d.intervalCount,
        startDate: d.startDate,
        nextRunDate: d.startDate, // first run on the start date
        status: "ACTIVE",
        endMode: d.endMode,
        endDate: d.endDate,
        maxOccurrences: d.maxOccurrences,
        lineItems: { create: d.lines },
      },
    });
    id = created.id;
  } catch {
    return { error: "Could not save the schedule. Is the database connected (DATABASE_URL set)?" };
  }

  revalidatePath("/recurring");
  redirect(`/recurring?created=${id}`);
}

export async function updateRecurring(_prev: RecurringState, formData: FormData): Promise<RecurringState> {
  const id = s(String(formData.get("id") ?? ""));
  if (!id) return { error: "Missing schedule id." };
  const parsed = parse(String(formData.get("payload") ?? ""));
  if (!parsed.ok) return { error: parsed.error };
  const d = parsed.data;

  const existing = await prisma.recurringInvoice.findUnique({ where: { id }, select: { occurrencesGenerated: true } });
  if (!existing) return { error: "That schedule no longer exists." };
  // Only re-anchor the next run to the start date if nothing has been generated yet.
  const reanchor = existing.occurrencesGenerated === 0;

  try {
    await prisma.$transaction([
      prisma.recurringInvoiceLineItem.deleteMany({ where: { recurringId: id } }),
      prisma.recurringInvoice.update({
        where: { id },
        data: {
          clientId: d.clientId,
          currency: d.currency,
          title: d.title,
          notes: d.notes,
          taxEnabled: d.taxEnabled,
          taxRate: d.taxRate,
          taxLabel: d.taxLabel,
          discountType: d.discountType,
          discountValue: d.discountValue,
          intervalUnit: d.intervalUnit,
          intervalCount: d.intervalCount,
          startDate: d.startDate,
          endMode: d.endMode,
          endDate: d.endDate,
          maxOccurrences: d.maxOccurrences,
          ...(reanchor ? { nextRunDate: d.startDate } : {}),
          lineItems: { create: d.lines },
        },
      }),
    ]);
  } catch {
    return { error: "Could not save changes." };
  }

  revalidatePath("/recurring");
  revalidatePath(`/recurring/${id}/edit`);
  redirect(`/recurring?updated=${id}`);
}

export async function setRecurringStatus(formData: FormData): Promise<void> {
  const id = s(String(formData.get("id") ?? ""));
  const status = s(String(formData.get("status") ?? ""));
  if (!id) return;
  if (status !== "ACTIVE" && status !== "PAUSED") return;
  try {
    await prisma.recurringInvoice.update({ where: { id }, data: { status } });
  } catch {
    return;
  }
  revalidatePath("/recurring");
  redirect("/recurring");
}

export async function deleteRecurring(formData: FormData): Promise<void> {
  const id = s(String(formData.get("id") ?? ""));
  if (!id) return;
  // Past generated invoices are independent (no FK), so they're untouched.
  await prisma.recurringInvoice.delete({ where: { id } });
  revalidatePath("/recurring");
  redirect("/recurring");
}

export async function generateNow(formData: FormData): Promise<void> {
  const id = s(String(formData.get("id") ?? ""));
  if (!id) return;
  const schedule = await prisma.recurringInvoice.findUnique({
    where: { id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!schedule) redirect("/recurring");

  let invoiceId: string | null = null;
  try {
    invoiceId = await generateOneFromSchedule(schedule as unknown as Parameters<typeof generateOneFromSchedule>[0]);
  } catch {
    redirect("/recurring?generror=1");
  }
  revalidatePath("/recurring");
  revalidatePath("/invoices");
  if (invoiceId) redirect(`/invoices/${invoiceId}`);
  redirect("/recurring?genempty=1");
}
