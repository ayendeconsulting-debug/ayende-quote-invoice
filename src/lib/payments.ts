import "server-only";
import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/money";

/**
 * Recompute an invoice's amountPaid (= sum of its payments) and derive its
 * status. Called after any payment create/edit/delete. Single-user app, so a
 * plain read-then-write is fine (no interactive transaction needed).
 *
 * Status rules (DRAFT is never touched — payments require a Sent invoice):
 *   paid >= total (> 0)  -> PAID         (also covers overpayment)
 *   0 < paid < total     -> PARTIALLY_PAID
 *   paid <= 0            -> SENT          (overdue is re-applied on next load)
 */
export async function recomputeInvoicePayment(invoiceId: string): Promise<void> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: { select: { amount: true } } },
  });
  if (!inv) return;

  const paid = round2(
    inv.payments.reduce((sum: number, p: (typeof inv.payments)[number]) => sum + Number(p.amount), 0)
  );
  const total = round2(Number(inv.total));

  let status = inv.status;
  if (inv.status !== "DRAFT") {
    if (total > 0 && paid >= total) status = "PAID";
    else if (paid > 0) status = "PARTIALLY_PAID";
    else status = "SENT";
  }

  await prisma.invoice.update({ where: { id: invoiceId }, data: { amountPaid: paid, status } });
}
