"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { recomputeInvoicePayment } from "@/lib/payments";

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

  await prisma.payment.create({ data: { invoiceId, amount, method: method as never, reference, date } });
  await recomputeInvoicePayment(invoiceId);

  revalidateFor(invoiceId);
  redirect(`/invoices/${invoiceId}`);
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
