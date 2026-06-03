"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBusinessProfile } from "@/lib/profile";
import { nextDocumentNumber } from "@/lib/numbering";
import { computeTotals, lineAmount, round2 } from "@/lib/money";
import { contributesToTotal } from "@/lib/quote-template";
import { loadInvoiceView } from "./data";
import { renderInvoicePdf } from "@/lib/pdf/invoice-pdf";
import { sendInvoiceEmail } from "@/lib/email";

export type InvoiceState = { error?: string };

// ---- helpers ---------------------------------------------------------------
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
function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

const DUE_NET_DAYS = 15;

// ===========================================================================
// Convert an accepted quote into an invoice (one-click, 1:1, snapshotted).
// ===========================================================================
export async function convertQuoteToInvoice(formData: FormData): Promise<void> {
  const quoteId = s(String(formData.get("quoteId") ?? ""));
  if (!quoteId) return;

  let invoiceId: string;
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { sections: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } }, invoice: true },
    });
    if (!quote) redirect("/quotes");
    if (quote!.invoice) redirect(`/invoices/${quote!.invoice.id}`);
    if (quote!.status !== "ACCEPTED") {
      redirect(`/quotes/${quoteId}?error=not-accepted`);
    }

    // Flatten only the billable sections into a flat line-item snapshot.
    const lines = quote!.sections
      .filter((sec: (typeof quote.sections)[number]) => contributesToTotal(sec.kind))
      .flatMap((sec: (typeof quote.sections)[number]) => sec.items)
      .map((it: (typeof quote.sections)[number]["items"][number], i: number) => ({
        description: it.description,
        detail: it.detail,
        hours: it.hours,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        amount: it.amount,
        sortOrder: i,
      }));

    const profile = await getBusinessProfile();
    const number = await nextDocumentNumber("INVOICE", profile.invoicePrefix);
    const issueDate = new Date();

    const created = await prisma.invoice.create({
      data: {
        number,
        clientId: quote!.clientId,
        sourceQuoteId: quote!.id,
        status: "DRAFT",
        currency: quote!.currency,
        title: quote!.title,
        notes: quote!.notes,
        issueDate,
        dueDate: addDays(issueDate, DUE_NET_DAYS),
        taxEnabled: quote!.taxEnabled,
        taxRate: quote!.taxRate,
        taxLabel: quote!.taxLabel,
        discountType: quote!.discountType,
        discountValue: quote!.discountValue,
        subtotal: quote!.subtotal,
        discountAmount: quote!.discountAmount,
        taxAmount: quote!.taxAmount,
        total: quote!.total,
        lineItems: { create: lines },
      },
    });
    invoiceId = created.id;
  } catch (e) {
    // redirect() throws NEXT_REDIRECT — let it propagate.
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) throw e;
    redirect(`/quotes/${quoteId}?error=convert-failed`);
  }

  revalidatePath("/invoices");
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/invoices/${invoiceId}`);
}

// ===========================================================================
// Standalone invoice creation (flat editor payload).
// ===========================================================================
interface PayloadLine {
  description?: string;
  detail?: string;
  hours?: string;
  quantity?: string;
  unit?: string;
  unitPrice?: string;
}
interface InvoicePayload {
  clientId: string;
  currency: string;
  title?: string;
  notes?: string;
  issueDate?: string;
  dueDate?: string;
  taxEnabled?: boolean;
  taxRate?: string;
  taxLabel?: string;
  discountType?: string | null;
  discountValue?: string;
  lines: PayloadLine[];
}

export async function createInvoice(_prev: InvoiceState, formData: FormData): Promise<InvoiceState> {
  let p: InvoicePayload;
  try {
    p = JSON.parse(String(formData.get("payload") ?? "")) as InvoicePayload;
  } catch {
    return { error: "Could not read the invoice data. Please retry." };
  }

  const clientId = s(p.clientId);
  if (!clientId) return { error: "Please choose a client." };
  const currency = p.currency === "USD" ? "USD" : "CAD";

  const taxRate = num(p.taxRate, 0);
  if (taxRate < 0 || taxRate > 100) return { error: "Tax rate must be between 0 and 100." };

  let discountType: "PERCENT" | "FIXED" | null = null;
  if (p.discountType === "PERCENT" || p.discountType === "FIXED") discountType = p.discountType;
  const discountValue = num(p.discountValue, 0);
  if (discountValue < 0) return { error: "Discount value cannot be negative." };
  if (discountType === "PERCENT" && discountValue > 100) return { error: "A percentage discount cannot exceed 100%." };

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
        amount: round2(lineAmount({ hours, quantity, unitPrice })),
        sortOrder: i,
      };
    });

  if (!lines.some((l) => l.description.length > 0)) return { error: "Add at least one line item before saving." };

  const totals = computeTotals({
    lines: lines.map((l) => ({ hours: l.hours, quantity: l.quantity, unitPrice: l.unitPrice })),
    taxEnabled: p.taxEnabled !== false,
    taxRate,
    discountType,
    discountValue,
  });

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { error: "That client no longer exists." };

  let id: string;
  try {
    const profile = await getBusinessProfile();
    const number = await nextDocumentNumber("INVOICE", profile.invoicePrefix);
    const issueDate = dateOrNull(p.issueDate) ?? new Date();
    const created = await prisma.invoice.create({
      data: {
        number,
        clientId,
        status: "DRAFT",
        currency,
        title: sOrNull(p.title),
        notes: sOrNull(p.notes),
        issueDate,
        dueDate: dateOrNull(p.dueDate) ?? addDays(issueDate, DUE_NET_DAYS),
        taxEnabled: p.taxEnabled !== false,
        taxRate,
        taxLabel: s(p.taxLabel) || "HST",
        discountType,
        discountValue,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        total: totals.total,
        lineItems: { create: lines },
      },
    });
    id = created.id;
  } catch {
    return { error: "Could not save the invoice. Is the database connected (DATABASE_URL set)?" };
  }

  revalidatePath("/invoices");
  redirect(`/invoices/${id}`);
}

// ===========================================================================
// Status, light edit, delete
// ===========================================================================
export async function setInvoiceStatus(formData: FormData): Promise<void> {
  const id = s(String(formData.get("id") ?? ""));
  const status = s(String(formData.get("status") ?? ""));
  if (!id) return;
  // Manual transitions only toggle Draft <-> Sent. Paid / Partially paid come
  // from recorded payments in Phase 7; Overdue is set automatically.
  if (status !== "DRAFT" && status !== "SENT") return;
  try {
    await prisma.invoice.update({ where: { id }, data: { status } });
  } catch {
    return;
  }
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function updateInvoiceMeta(formData: FormData): Promise<void> {
  const id = s(String(formData.get("id") ?? ""));
  if (!id) return;
  const dueDate = dateOrNull(String(formData.get("dueDate") ?? ""));
  const notes = sOrNull(String(formData.get("notes") ?? ""));
  try {
    await prisma.invoice.update({ where: { id }, data: { dueDate, notes } });
  } catch {
    return;
  }
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function sendInvoiceToClient(formData: FormData): Promise<void> {
  const id = s(String(formData.get("id") ?? ""));
  if (!id) return;

  const loaded = await loadInvoiceView(id);
  if (!loaded) redirect("/invoices");
  const { view, invoice } = loaded;

  if (!invoice.clientEmail) {
    redirect(`/invoices/${id}?serror=no-email`);
  }

  let result: { ok: boolean; error?: string };
  try {
    const pdf = await renderInvoicePdf(view);
    result = await sendInvoiceEmail({
      to: invoice.clientEmail as string,
      invoiceNumber: invoice.number,
      businessName: view.businessName,
      clientName: invoice.clientName,
      title: view.title,
      pdf,
      dueDate: view.dueDate,
    });
  } catch {
    result = { ok: false, error: "render-failed" };
  }

  if (!result.ok) {
    // Secret-safe: logs Resend's reason (e.g. unverified domain / from address),
    // never the API key. Read in Vercel function logs, then remove.
    console.error("[invoice-email] send failed:", result.error);
    const code = (result.error || "").toLowerCase().includes("configured") ? "config" : "failed";
    redirect(`/invoices/${id}?serror=${code}`);
  }

  // On a successful send, promote a Draft to Sent (never downgrade Paid/etc.).
  if (invoice.status === "DRAFT") {
    try {
      await prisma.invoice.update({ where: { id }, data: { status: "SENT" } });
    } catch {
      // Non-fatal; the email already went out.
    }
  }
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}?sent=1`);
}

export async function deleteInvoice(formData: FormData): Promise<void> {
  const id = s(String(formData.get("id") ?? ""));
  if (!id) return;

  const payments = await prisma.payment.count({ where: { invoiceId: id } });
  if (payments > 0) {
    redirect(`/invoices/${id}?error=has-payments`);
  }

  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/invoices");
  revalidatePath("/quotes");
  redirect("/invoices");
}
