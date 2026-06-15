"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { recomputeInvoicePayment } from "@/lib/payments";
import { buildReceiptView } from "@/lib/receipts";
import { renderReceiptPdf } from "@/lib/pdf/receipt-pdf";
import { sendPaymentReceiptEmail } from "@/lib/email";
import { formatMoney } from "@/lib/money";

/**
 * Render + email a receipt for one payment, then stamp receiptSentAt.
 * Returns a short outcome code; never throws (callers decide how to surface it).
 */
async function deliverReceipt(paymentId: string): Promise<"sent" | "no-email" | "config" | "failed"> {
  const built = await buildReceiptView(paymentId);
  if (!built) return "failed";
  if (!built.clientEmail) return "no-email";
  try {
    const pdf = await renderReceiptPdf(built.view);
    const v = built.view;
    const result = await sendPaymentReceiptEmail({
      to: built.clientEmail,
      invoiceNumber: v.invoiceNumber,
      businessName: v.businessName,
      clientName: v.clientName,
      amountText: formatMoney(v.paymentAmount, v.currency),
      paidInFull: v.paidInFull,
      balanceText: v.paidInFull ? null : formatMoney(v.balanceRemaining, v.currency),
      pdf,
    });
    if (!result.ok) {
      return (result.error || "").toLowerCase().includes("configured") ? "config" : "failed";
    }
    await prisma.payment.update({ where: { id: paymentId }, data: { receiptSentAt: new Date() } });
    return "sent";
  } catch {
    return "failed";
  }
}

const METHODS = ["ETRANSFER", "BANK_TRANSFER", "CASH"];

function s(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}
function sOrNull(v: FormDataEntryValue | null): string | null {
  const t = s(v);
  return t.length ? t : null;
}
function num(v: FormDataEntryValue | null): number {
  const n = Number(s(v));
  return Number.isFinite(n) ? n : NaN;
}
function dateOrNull(v: FormDataEntryValue | null): Date | null {
  const t = s(v);
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function revalidateFor(invoiceId: string) {
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/payments");
}

export async function recordPayment(formData: FormData): Promise<void> {
  const invoiceId = s(formData.get("invoiceId"));
  if (!invoiceId) return;

  const amount = num(formData.get("amount"));
  const method = s(formData.get("method"));
  const reference = sOrNull(formData.get("reference"));
  const date = dateOrNull(formData.get("date")) ?? new Date();

  if (!(amount > 0) || !METHODS.includes(method)) {
    redirect(`/invoices/${invoiceId}?perror=invalid`);
  }

  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { status: true } });
  if (!inv) redirect("/invoices");
  if (inv!.status === "DRAFT") redirect(`/invoices/${invoiceId}?perror=draft`);

  const created = await prisma.payment.create({ data: { invoiceId, amount, method: method as never, reference, date } });
  await recomputeInvoicePayment(invoiceId);

  let receiptParam = "";
  if (s(formData.get("sendReceipt")) === "on") {
    const outcome = await deliverReceipt(created.id);
    receiptParam = `?receipt=${outcome}`;
  }

  revalidateFor(invoiceId);
  redirect(`/invoices/${invoiceId}${receiptParam}`);
}

export async function sendPaymentReceipt(formData: FormData): Promise<void> {
  const paymentId = s(formData.get("paymentId"));
  if (!paymentId) return;
  const p = await prisma.payment.findUnique({ where: { id: paymentId }, select: { invoiceId: true } });
  if (!p) redirect("/invoices");
  const outcome = await deliverReceipt(paymentId);
  revalidateFor(p!.invoiceId);
  redirect(`/invoices/${p!.invoiceId}?receipt=${outcome}`);
}

export async function updatePayment(formData: FormData): Promise<void> {
  const id = s(formData.get("id"));
  if (!id) return;

  const existing = await prisma.payment.findUnique({ where: { id }, select: { invoiceId: true, date: true } });
  if (!existing) redirect("/invoices");
  const invoiceId = existing!.invoiceId;

  const amount = num(formData.get("amount"));
  const method = s(formData.get("method"));
  const reference = sOrNull(formData.get("reference"));
  const date = dateOrNull(formData.get("date")) ?? existing!.date;

  if (!(amount > 0) || !METHODS.includes(method)) {
    redirect(`/invoices/${invoiceId}?perror=invalid`);
  }

  await prisma.payment.update({ where: { id }, data: { amount, method: method as never, reference, date } });
  await recomputeInvoicePayment(invoiceId);

  revalidateFor(invoiceId);
  redirect(`/invoices/${invoiceId}`);
}

export async function deletePayment(formData: FormData): Promise<void> {
  const id = s(formData.get("id"));
  if (!id) return;

  const existing = await prisma.payment.findUnique({ where: { id }, select: { invoiceId: true } });
  if (!existing) redirect("/invoices");
  const invoiceId = existing!.invoiceId;

  await prisma.payment.delete({ where: { id } });
  await recomputeInvoicePayment(invoiceId);

  revalidateFor(invoiceId);
  redirect(`/invoices/${invoiceId}`);
}
