import { notFound } from "next/navigation";
import { Download, Check, X, Clock } from "lucide-react";
import { QuotePreview } from "@/components/quote-preview";
import { loadPublicQuoteView } from "@/app/(app)/quotes/data";
import { RespondForm } from "./respond-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const loaded = await loadPublicQuoteView(token);
  if (!loaded) notFound();
  const { view, quote } = loaded;

  const open = view.status === "DRAFT" || view.status === "SENT";

  return (
    <main className="min-h-screen bg-[var(--color-paper)]">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-ink)] text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="font-display text-lg tracking-tight">{view.businessName}</div>
          <a
            href={`/q/${token}/pdf`}
            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-sm transition hover:bg-white/20"
          >
            <Download size={16} /> Download PDF
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Response panel */}
        <div className="mb-6 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6 shadow-sm">
          {view.status === "ACCEPTED" ? (
            <div className="flex items-start gap-2.5 text-[var(--color-teal)]">
              <Check size={20} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-display text-lg">Thank you — quote accepted</div>
                <p className="mt-0.5 text-sm text-[var(--color-ink-500)]">
                  {view.acceptedByName ? `Accepted by ${view.acceptedByName}` : "This quote has been accepted"}
                  {view.acceptedAt ? ` on ${view.acceptedAt}` : ""}. We&rsquo;ll be in touch shortly.
                </p>
              </div>
            </div>
          ) : view.status === "DECLINED" ? (
            <div className="flex items-start gap-2.5 text-[var(--color-rose)]">
              <X size={20} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-display text-lg">Quote declined</div>
                <p className="mt-0.5 text-sm text-[var(--color-ink-500)]">
                  You declined this quote{view.declinedAt ? ` on ${view.declinedAt}` : ""}. If this was a mistake, please contact us.
                </p>
              </div>
            </div>
          ) : view.status === "EXPIRED" ? (
            <div className="flex items-start gap-2.5 text-[var(--color-amber)]">
              <Clock size={20} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-display text-lg">This quote has expired</div>
                <p className="mt-0.5 text-sm text-[var(--color-ink-500)]">
                  {view.validUntil ? `It was valid until ${view.validUntil}. ` : ""}Please contact us for an updated quote.
                </p>
              </div>
            </div>
          ) : null}

          {open ? (
            <>
              <div className="mb-4">
                <div className="font-display text-lg text-[var(--color-ink)]">Review &amp; respond</div>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  Please review the quote below{view.validUntil ? `, valid until ${view.validUntil}` : ""}.
                </p>
              </div>
              <RespondForm token={token} />
            </>
          ) : null}
        </div>

        <QuotePreview view={view} />

        <p className="mt-6 text-center text-xs text-[var(--color-ink-300)]">
          {view.businessName} · {quote.number}
        </p>
      </div>
    </main>
  );
}
