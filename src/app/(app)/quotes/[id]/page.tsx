import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { Card } from "@/components/ui/primitives";
import { QuotePreview } from "@/components/quote-preview";
import { ArrowLeft, Pencil, Send, Undo2, AlertTriangle, Download, Check, X, Link2, ReceiptText, ListChecks } from "lucide-react";
import { loadQuoteView } from "../data";
import { setQuoteStatus, ensureShareToken } from "../actions";
import { convertQuoteToInvoice } from "../../invoices/actions";
import { generateCloseout } from "./closeout/actions";
import { prisma } from "@/lib/prisma";
import { DeleteQuoteButton } from "../delete-quote-button";
import { SharePanel } from "./share-panel";
import { shareUrl } from "@/lib/share";

export const dynamic = "force-dynamic";

const btn =
  "inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-3.5 py-2 text-sm transition hover:border-[var(--color-accent)]";

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const loaded = await loadQuoteView(id);
  if (!loaded) notFound();
  const { view, quote } = loaded;

  const editable = quote.status === "DRAFT" || quote.status === "SENT";
  const url = quote.shareToken ? shareUrl(quote.shareToken) : null;
  const closeout = await prisma.closeout.findUnique({ where: { quoteId: id }, select: { status: true, signedByName: true } });

  return (
    <>
      <Topbar
        title={quote.number}
        subtitle={view.title ?? view.clientName}
        action={
          <>
            <a href={`/quotes/${quote.id}/pdf`} target="_blank" rel="noopener" className={btn}>
              <Download size={16} /> PDF
            </a>
            {quote.invoiceId ? (
              <Link href={`/invoices/${quote.invoiceId}`} className={btn}>
                <ReceiptText size={16} /> View invoice {quote.invoiceNumber}
              </Link>
            ) : quote.status === "ACCEPTED" ? (
              <form action={convertQuoteToInvoice}>
                <input type="hidden" name="quoteId" value={quote.id} />
                <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-600)]">
                  <ReceiptText size={16} /> Convert to invoice
                </button>
              </form>
            ) : null}
            {quote.status === "DRAFT" ? (
              <form action={setQuoteStatus}>
                <input type="hidden" name="id" value={quote.id} />
                <input type="hidden" name="status" value="SENT" />
                <button type="submit" className={btn}><Send size={16} /> Mark as sent</button>
              </form>
            ) : null}
            {quote.status === "SENT" ? (
              <>
                <form action={setQuoteStatus}>
                  <input type="hidden" name="id" value={quote.id} />
                  <input type="hidden" name="status" value="ACCEPTED" />
                  <button type="submit" className={btn}><Check size={16} /> Mark accepted</button>
                </form>
                <form action={setQuoteStatus}>
                  <input type="hidden" name="id" value={quote.id} />
                  <input type="hidden" name="status" value="DECLINED" />
                  <button type="submit" className={btn}><X size={16} /> Mark declined</button>
                </form>
                <form action={setQuoteStatus}>
                  <input type="hidden" name="id" value={quote.id} />
                  <input type="hidden" name="status" value="DRAFT" />
                  <button type="submit" className={btn}><Undo2 size={16} /> Move to draft</button>
                </form>
              </>
            ) : null}
            {editable ? (
              <Link href={`/quotes/${quote.id}/edit`} className={btn}>
                <Pencil size={16} /> Edit
              </Link>
            ) : null}
            <DeleteQuoteButton id={quote.id} number={quote.number} />
          </>
        }
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <Link href="/quotes" className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          <ArrowLeft size={15} /> All quotes
        </Link>

        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-[#fdf3e7] px-4 py-3 text-sm text-[var(--color-amber)]">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>
              {error === "has-invoice"
                ? "This quote has been converted to an invoice and can\u2019t be deleted."
                : error === "not-accepted"
                  ? "Only an accepted quote can be converted to an invoice."
                  : error === "convert-failed"
                    ? "Could not convert this quote to an invoice. Please try again."
                    : "Something went wrong."}
            </span>
          </div>
        ) : null}

        <div className="mx-auto max-w-3xl space-y-6">
          {/* Share & acceptance */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Link2 size={16} className="text-[var(--color-accent-600)]" />
              <h2 className="font-display text-base text-[var(--color-ink)]">Share &amp; acceptance</h2>
            </div>
            {url ? (
              <SharePanel id={quote.id} url={url} clientEmail={quote.clientEmail} />
            ) : (
              <div>
                <p className="text-sm text-[var(--color-muted)]">
                  Generate a secure link your client can use to view, download, and accept this quote online.
                </p>
                <form action={ensureShareToken} className="mt-3">
                  <input type="hidden" name="id" value={quote.id} />
                  <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-600)]">
                    <Link2 size={16} /> Generate share link
                  </button>
                </form>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <ListChecks size={16} className="text-[var(--color-accent-600)]" />
              <h2 className="font-display text-base text-[var(--color-ink)]">Project closeout</h2>
            </div>
            {closeout ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[var(--color-muted)]">
                  {closeout.status === "SIGNED"
                    ? `Signed off${closeout.signedByName ? ` by ${closeout.signedByName}` : ""}.`
                    : closeout.status === "SENT"
                    ? "Sent to the client — awaiting sign-off."
                    : "Draft — edit the checklist, then share the link."}
                </p>
                <Link href={`/quotes/${quote.id}/closeout`} className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm text-[var(--color-ink-500)] transition hover:border-[var(--color-ink)]">
                  <ListChecks size={16} /> {closeout.status === "SIGNED" ? "View closeout" : "Manage closeout"}
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[var(--color-muted)]">
                  Generate a client checklist from this quote&rsquo;s scope items. Your client ticks off each deliverable and signs off the project online.
                </p>
                <form action={generateCloseout} className="mt-3">
                  <input type="hidden" name="quoteId" value={quote.id} />
                  <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-600)]">
                    <ListChecks size={16} /> Generate closeout
                  </button>
                </form>
              </div>
            )}
          </Card>

          <QuotePreview view={view} />
        </div>
      </div>
    </>
  );
}
