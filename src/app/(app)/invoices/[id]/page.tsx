import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { Card } from "@/components/ui/primitives";
import { Input, Textarea } from "@/components/ui/form";
import { InvoicePreview } from "@/components/invoice-preview";
import { ArrowLeft, Send, Undo2, AlertTriangle, Download, FileText, Save, Wallet, Mail, CheckCircle2 } from "lucide-react";
import { loadInvoiceView } from "../data";
import { setInvoiceStatus, updateInvoiceMeta, sendInvoiceToClient } from "../actions";
import { DeleteInvoiceButton } from "../delete-invoice-button";
import { PaymentsPanel } from "../payments-panel";

export const dynamic = "force-dynamic";

const btn =
  "inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-3.5 py-2 text-sm transition hover:border-[var(--color-accent)]";

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; perror?: string; sent?: string; serror?: string; receipt?: string }>;
}) {
  const { id } = await params;
  const { error, perror, sent, serror, receipt } = await searchParams;

  const loaded = await loadInvoiceView(id);
  if (!loaded) notFound();
  const { view, invoice, payments } = loaded;

  return (
    <>
      <Topbar
        title={invoice.number}
        subtitle={view.title ?? invoice.clientName}
        action={
          <>
            <a href={`/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener" className={btn}>
              <Download size={16} /> PDF
            </a>
            {invoice.clientEmail ? (
              <form action={sendInvoiceToClient}>
                <input type="hidden" name="id" value={invoice.id} />
                <button type="submit" className={btn}><Mail size={16} /> Send to client</button>
              </form>
            ) : (
              <span className={`${btn} cursor-not-allowed opacity-50`} title="No client email on file">
                <Mail size={16} /> Send to client
              </span>
            )}
            {invoice.status === "DRAFT" ? (
              <form action={setInvoiceStatus}>
                <input type="hidden" name="id" value={invoice.id} />
                <input type="hidden" name="status" value="SENT" />
                <button type="submit" className={btn}><Send size={16} /> Mark as sent</button>
              </form>
            ) : invoice.status === "SENT" || invoice.status === "OVERDUE" ? (
              <form action={setInvoiceStatus}>
                <input type="hidden" name="id" value={invoice.id} />
                <input type="hidden" name="status" value="DRAFT" />
                <button type="submit" className={btn}><Undo2 size={16} /> Move to draft</button>
              </form>
            ) : null}
            <DeleteInvoiceButton id={invoice.id} number={invoice.number} />
          </>
        }
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <Link href="/invoices" className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          <ArrowLeft size={15} /> All invoices
        </Link>

        {sent === "1" ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-[#e7f4ef] px-4 py-3 text-sm text-[var(--color-teal)]">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>Invoice emailed to {invoice.clientName}{invoice.clientEmail ? ` (${invoice.clientEmail})` : ""}.</span>
          </div>
        ) : null}

        {serror ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-[#fdf3e7] px-4 py-3 text-sm text-[var(--color-amber)]">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>
              {serror === "no-email"
                ? "This client has no email address on file. Add one on the client record, then send."
                : serror === "config"
                ? "Email isn't set up yet (RESEND_API_KEY is not configured). Download the PDF and send it manually, or configure Resend."
                : "Couldn't send the email. Download the PDF and send manually, or try again."}
            </span>
          </div>
        ) : null}

        {receipt === "sent" ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-[#e7f4ef] px-4 py-3 text-sm text-[var(--color-teal)]">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>Receipt emailed to {invoice.clientName}.</span>
          </div>
        ) : null}
        {receipt && receipt !== "sent" ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-[#fdf3e7] px-4 py-3 text-sm text-[var(--color-amber)]">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>
              {receipt === "no-email"
                ? "This client has no email address on file, so no receipt was sent."
                : receipt === "config"
                ? "Email isn't set up (RESEND_API_KEY). The payment was recorded; configure Resend to send receipts."
                : "The payment was recorded, but the receipt email couldn't be sent. Try the receipt button again."}
            </span>
          </div>
        ) : null}

        {error === "has-payments" ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-[#fdf3e7] px-4 py-3 text-sm text-[var(--color-amber)]">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>This invoice has recorded payments and can&rsquo;t be deleted. Remove its payments first.</span>
          </div>
        ) : null}

        {perror ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-[#fdf3e7] px-4 py-3 text-sm text-[var(--color-amber)]">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>
              {perror === "draft"
                ? "Mark the invoice as sent before recording a payment."
                : "Enter a payment amount greater than zero and pick a method."}
            </span>
          </div>
        ) : null}

        <div className="mx-auto max-w-3xl space-y-6">
          {invoice.sourceQuoteId ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <FileText size={15} className="text-[var(--color-accent-600)]" />
              From quote{" "}
              <Link href={`/quotes/${invoice.sourceQuoteId}`} className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent-600)]">
                {invoice.sourceQuoteNumber}
              </Link>
            </div>
          ) : null}

          <Card className="p-6">
            <h2 className="mb-1 font-display text-base text-[var(--color-ink)]">Invoice details</h2>
            <p className="mb-4 text-xs text-[var(--color-ink-300)]">
              Line items are a locked snapshot. You can adjust the due date and notes here.
            </p>
            <form action={updateInvoiceMeta} className="space-y-4">
              <input type="hidden" name="id" value={invoice.id} />
              <div className="max-w-xs">
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-ink-500)]">Due date</label>
                <Input type="date" name="dueDate" defaultValue={invoice.dueDateInput} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-ink-500)]">Notes & terms</label>
                <Textarea name="notes" defaultValue={invoice.notes} placeholder="Payment terms, PO number, thank-you note…" />
              </div>
              <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-600)]">
                <Save size={16} /> Save details
              </button>
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="mb-1 flex items-center gap-2 font-display text-base text-[var(--color-ink)]">
              <Wallet size={16} className="text-[var(--color-accent-600)]" /> Payments
            </h2>
            <p className="mb-4 text-xs text-[var(--color-ink-300)]">
              Record full or partial payments. The balance and status update automatically.
            </p>
            <PaymentsPanel
              invoiceId={invoice.id}
              status={invoice.status}
              currency={view.currency}
              balanceDue={view.balanceDue}
              payments={payments}
              clientEmail={invoice.clientEmail}
              invoiceTotal={view.totals.total}
              amountPaid={view.amountPaid}
            />
          </Card>

          <InvoicePreview view={view} />
        </div>
      </div>
    </>
  );
}
