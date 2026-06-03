"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBusinessProfile } from "@/lib/profile";
import { nextDocumentNumber } from "@/lib/numbering";
import { computeTotals, lineAmount, round2 } from "@/lib/money";
import { contributesToTotal } from "@/lib/quote-template";
import { newShareToken } from "@/lib/share";
import { sendQuoteShareEmail } from "@/lib/email";

export type QuoteState = { error?: string };

// ---- Payload shape sent (as JSON in a hidden field) by the editor ----------
interface PayloadLine {
  description: string;
  detail?: string;
  hours?: string; // blank => null
  quantity?: string;
  unit?: string;
  unitPrice?: string;
}
interface PayloadSection {
  kind: string;
  title: string;
  items: PayloadLine[];
}
interface QuotePayload {
  id?: string;
  clientId: string;
  template: string;
  currency: string;
  title?: string;
  introText?: string;
  notes?: string;
  issueDate?: string;
  validUntil?: string;
  taxEnabled?: boolean;
  taxRate?: string;
  taxLabel?: string;
  discountType?: string | null;
  discountValue?: string;
  sections: PayloadSection[];
}

function nOrNull(v?: string): number | null {
  if (v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function num(v?: string, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function s(v?: string): string {
  return (v ?? "").trim();
}
function sOrNull(v?: string): string | null {
  const t = s(v);
  return t.length ? t : null;
}
function dateOrNull(v?: string): Date | null {
  const t = s(v);
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

interface NormalizedLine {
  description: string;
  detail: string | null;
  hours: number | null;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  amount: number;
}
interface Normalized {
  clientId: string;
  template: "DETAILED" | "SIMPLE";
  currency: "CAD" | "USD";
  title: string | null;
  introText: string | null;
  notes: string | null;
  issueDate: Date;
  validUntil: Date | null;
  taxEnabled: boolean;
  taxRate: number;
  taxLabel: string;
  discountType: "PERCENT" | "FIXED" | null;
  discountValue: number;
  sections: { kind: string; title: string; items: NormalizedLine[] }[];
  totals: { subtotal: number; discountAmount: number; taxAmount: number; total: number };
}

function parsePayload(raw: string): { ok: true; data: Normalized } | { ok: false; error: string } {
  let p: QuotePayload;
  try {
    p = JSON.parse(raw) as QuotePayload;
  } catch {
    return { ok: false, error: "Could not read the quote data. Please retry." };
  }

  const clientId = s(p.clientId);
  if (!clientId) return { ok: false, error: "Please choose a client." };

  const template = p.template === "SIMPLE" ? "SIMPLE" : "DETAILED";
  const currency = p.currency === "USD" ? "USD" : "CAD";

  const taxRate = num(p.taxRate, 0);
  if (taxRate < 0 || taxRate > 100) return { ok: false, error: "Tax rate must be between 0 and 100." };

  let discountType: "PERCENT" | "FIXED" | null = null;
  if (p.discountType === "PERCENT" || p.discountType === "FIXED") discountType = p.discountType;
  const discountValue = num(p.discountValue, 0);
  if (discountValue < 0) return { ok: false, error: "Discount value cannot be negative." };
  if (discountType === "PERCENT" && discountValue > 100)
    return { ok: false, error: "A percentage discount cannot exceed 100%." };

  const rawSections = Array.isArray(p.sections) ? p.sections : [];
  const sections = rawSections.map((sec) => {
    const items: NormalizedLine[] = (Array.isArray(sec.items) ? sec.items : [])
      .filter((it) => s(it.description).length > 0 || nOrNull(it.unitPrice) !== null || nOrNull(it.hours) !== null)
      .map((it) => {
        const hours = nOrNull(it.hours);
        const quantity = it.quantity !== undefined && s(it.quantity).length ? num(it.quantity, 1) : 1;
        const unitPrice = num(it.unitPrice, 0);
        const amount = round2(lineAmount({ hours, quantity, unitPrice }));
        return {
          description: s(it.description),
          detail: sOrNull(it.detail),
          hours,
          quantity,
          unit: sOrNull(it.unit),
          unitPrice,
          amount,
        };
      });
    return { kind: s(sec.kind) || "GENERIC", title: s(sec.title) || "Section", items };
  });

  const anyLine = sections.some((sec) => sec.items.some((it) => it.description.length > 0));
  if (!anyLine) return { ok: false, error: "Add at least one line item before saving." };

  // Only priced, non-informational sections feed the payable total.
  const billableLines = sections
    .filter((sec) => contributesToTotal(sec.kind))
    .flatMap((sec) => sec.items)
    .map((it) => ({ hours: it.hours, quantity: it.quantity, unitPrice: it.unitPrice }));

  const totals = computeTotals({
    lines: billableLines,
    taxEnabled: p.taxEnabled !== false,
    taxRate,
    discountType,
    discountValue,
  });

  return {
    ok: true,
    data: {
      clientId,
      template,
      currency,
      title: sOrNull(p.title),
      introText: sOrNull(p.introText),
      notes: sOrNull(p.notes),
      issueDate: dateOrNull(p.issueDate) ?? new Date(),
      validUntil: dateOrNull(p.validUntil),
      taxEnabled: p.taxEnabled !== false,
      taxRate,
      taxLabel: s(p.taxLabel) || "HST",
      discountType,
      discountValue,
      sections,
      totals,
    },
  };
}

function sectionsCreate(d: Normalized) {
  return d.sections.map((sec, si) => ({
    kind: sec.kind,
    title: sec.title,
    sortOrder: si,
    items: {
      create: sec.items.map((it, ii) => ({
        description: it.description,
        detail: it.detail,
        hours: it.hours,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        amount: it.amount,
        sortOrder: ii,
      })),
    },
  }));
}

function scalarData(d: Normalized) {
  return {
    template: d.template,
    currency: d.currency,
    title: d.title,
    introText: d.introText,
    notes: d.notes,
    issueDate: d.issueDate,
    validUntil: d.validUntil,
    taxEnabled: d.taxEnabled,
    taxRate: d.taxRate,
    taxLabel: d.taxLabel,
    discountType: d.discountType,
    discountValue: d.discountValue,
    subtotal: d.totals.subtotal,
    discountAmount: d.totals.discountAmount,
    taxAmount: d.totals.taxAmount,
    total: d.totals.total,
  };
}

export async function createQuote(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  const parsed = parsePayload(String(formData.get("payload") ?? ""));
  if (!parsed.ok) return { error: parsed.error };
  const d = parsed.data;

  const client = await prisma.client.findUnique({ where: { id: d.clientId } });
  if (!client) return { error: "That client no longer exists." };

  let id: string;
  try {
    const profile = await getBusinessProfile();
    const number = await nextDocumentNumber("QUOTE", profile.quotePrefix);
    const created = await prisma.quote.create({
      data: {
        number,
        clientId: d.clientId,
        status: "DRAFT",
        ...scalarData(d),
        sections: { create: sectionsCreate(d) },
      },
    });
    id = created.id;
  } catch {
    return { error: "Could not save the quote. Is the database connected (DATABASE_URL set)?" };
  }

  revalidatePath("/quotes");
  redirect(`/quotes/${id}`);
}

export async function updateQuote(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Missing quote id." };

  const parsed = parsePayload(String(formData.get("payload") ?? ""));
  if (!parsed.ok) return { error: parsed.error };
  const d = parsed.data;

  const client = await prisma.client.findUnique({ where: { id: d.clientId } });
  if (!client) return { error: "That client no longer exists." };

  try {
    // Replace sections wholesale (cascade clears their items), then rewrite scalars + sections.
    // Array form runs sequentially in one transaction: deleteMany first, then the update that re-creates.
    await prisma.$transaction([
      prisma.quoteSection.deleteMany({ where: { quoteId: id } }),
      prisma.quote.update({
        where: { id },
        data: { clientId: d.clientId, ...scalarData(d), sections: { create: sectionsCreate(d) } },
      }),
    ]);
  } catch {
    return { error: "Could not save changes." };
  }

  revalidatePath("/quotes");
  revalidatePath(`/quotes/${id}`);
  redirect(`/quotes/${id}`);
}

export async function setQuoteStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!id) return;

  // Manual transitions from the internal detail page. (Accepted/Declined also
  // arrive via the public share flow in q/[token]/actions.ts.)
  const allowed = ["DRAFT", "SENT", "ACCEPTED", "DECLINED"];
  if (!allowed.includes(status)) return;

  const now = new Date();
  const data: Record<string, unknown> = { status };
  if (status === "SENT") data.sentAt = now;
  if (status === "ACCEPTED") data.acceptedAt = now;
  if (status === "DECLINED") data.declinedAt = now;

  try {
    await prisma.quote.update({ where: { id }, data });
  } catch {
    return;
  }
  revalidatePath("/quotes");
  revalidatePath(`/quotes/${id}`);
  redirect(`/quotes/${id}`);
}

/** Ensure a quote has a share token (generates one if missing), then return to detail. */
export async function ensureShareToken(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  try {
    const q = await prisma.quote.findUnique({ where: { id }, select: { shareToken: true } });
    if (q && !q.shareToken) {
      await prisma.quote.update({ where: { id }, data: { shareToken: newShareToken() } });
    }
  } catch {
    return;
  }
  revalidatePath(`/quotes/${id}`);
  redirect(`/quotes/${id}`);
}

export type EmailState = { ok?: boolean; message?: string };

/** Email the share link to the client via Resend (used with useActionState). */
export async function emailQuote(_prev: EmailState, formData: FormData): Promise<EmailState> {
  const id = String(formData.get("id") ?? "").trim();
  const message = String(formData.get("message") ?? "");
  if (!id) return { ok: false, message: "Missing quote id." };

  try {
    let q = await prisma.quote.findUnique({ where: { id }, include: { client: true } });
    if (!q) return { ok: false, message: "Quote not found." };
    if (!q.client.email) return { ok: false, message: "This client has no email address. Add one on the client record, or copy the link and send it manually." };

    // Capture before the (possible) reassignment below — reassigning `q` would
    // otherwise discard the non-null narrowing on q.client.email.
    const toEmail: string = q.client.email;
    const clientName: string = q.client.name;

    if (!q.shareToken) {
      q = await prisma.quote.update({ where: { id }, data: { shareToken: newShareToken() }, include: { client: true } });
    }

    const profile = await getBusinessProfile();
    const result = await sendQuoteShareEmail({
      to: toEmail,
      quoteNumber: q.number,
      token: q.shareToken!,
      businessName: profile.businessName,
      clientName,
      title: q.title,
      message,
    });

    if (!result.ok) return { ok: false, message: result.error };

    // Sending implies the quote is now out for review.
    if (q.status === "DRAFT") {
      await prisma.quote.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
    }
    revalidatePath(`/quotes/${id}`);
    revalidatePath("/quotes");
    return { ok: true, message: `Sent to ${q.client.email}.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not send the email." };
  }
}

export async function deleteQuote(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  // Guard: a quote already converted to an invoice (Phase 6) must not be deleted out from under it.
  const invoice = await prisma.invoice.findUnique({ where: { sourceQuoteId: id } });
  if (invoice) {
    const params = new URLSearchParams({ error: "has-invoice" });
    redirect(`/quotes/${id}?${params.toString()}`);
  }

  await prisma.quote.delete({ where: { id } });
  revalidatePath("/quotes");
  redirect("/quotes");
}
