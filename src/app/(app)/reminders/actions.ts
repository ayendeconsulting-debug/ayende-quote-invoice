"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { round2, formatMoney, type Currency } from "@/lib/money";
import { kindForDueDate } from "@/lib/reminders";
import { loadInvoiceView } from "../invoices/data";
import { renderInvoicePdf } from "@/lib/pdf/invoice-pdf";
import { sendInvoiceReminderEmail } from "@/lib/email";

/** Only allow redirecting back to in-app paths (the value comes from our own form). */
function safeBack(v: string): string {
  return v.startsWith("/") ? v : "/reminders";
}

/**
 * Email a payment reminder for one invoice. Re-checks eligibility server-side
 * (status + positive balance) so a paid/draft invoice can never be nudged, then
 * stamps lastReminderAt / reminderCount on success.
 */
export async function sendReminder(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const back = safeBack(String(formData.get("from") ?? "/reminders"));
  if (!id) redirect("/reminders");

  const inv = await prisma.invoice.findUnique({
    where: { id },
    select: { status: true, total: true, amountPaid: true, dueDate: true },
  });
  if (!inv) redirect(back);

  const eligible =
    inv!.status === "SENT" || inv!.status === "OVERDUE" || inv!.status === "PARTIALLY_PAID";
  const balance = round2(Number(inv!.total) - Number(inv!.amountPaid));
  if (!eligible || balance <= 0) redirect(`${back}?rem=ineligible`);

  const loaded = await loadInvoiceView(id);
  if (!loaded) redirect(back);
  const { view, invoice } = loaded!;
  if (!invoice.clientEmail) redirect(`${back}?rem=no-email`);

  const now = new Date();
  const kind = inv!.dueDate ? kindForDueDate(inv!.dueDate, now) : "OVERDUE";
  const balanceText = formatMoney(view.balanceDue, view.currency as Currency);

  let result: { ok: boolean; error?: string };
  try {
    const pdf = await renderInvoicePdf(view);
    result = await sendInvoiceReminderEmail({
      to: invoice.clientEmail as string,
      invoiceNumber: invoice.number,
      businessName: view.businessName,
      clientName: invoice.clientName,
      title: view.title,
      kind,
      dueDate: view.dueDate,
      balanceText,
      pdf,
    });
  } catch {
    result = { ok: false, error: "render-failed" };
  }

  if (!result.ok) {
    const code = (result.error || "").toLowerCase().includes("configured") ? "config" : "failed";
    redirect(`${back}?rem=${code}`);
  }

  try {
    await prisma.invoice.update({
      where: { id },
      data: { lastReminderAt: now, reminderCount: { increment: 1 } },
    });
  } catch {
    // Non-fatal: the email already went out; the next load will recompute.
  }

  revalidatePath("/reminders");
  revalidatePath(`/invoices/${id}`);
  redirect(`${back}?rem=sent`);
}
