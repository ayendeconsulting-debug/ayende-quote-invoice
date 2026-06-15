import { redirect } from "next/navigation";
import Link from "next/link";
import { Trash2, Send, Undo2, CheckCircle2, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { closeoutUrl } from "@/lib/share";
import { Topbar } from "@/components/topbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/form";
import { CloseoutEditor } from "./closeout-editor";
import { CopyLinkButton } from "./copy-link-button";
import { setCloseoutStatus, deleteCloseout } from "./actions";

export const dynamic = "force-dynamic";

export default async function CloseoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id: quoteId } = await params;
  const { saved } = await searchParams;

  const closeout = await prisma.closeout.findUnique({
    where: { quoteId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      quote: { include: { client: true } },
    },
  });
  if (!closeout) redirect(`/quotes/${quoteId}`);

  const c = closeout!;
  const url = closeoutUrl(c.shareToken);
  const signed = c.status === "SIGNED";
  const checkedCount = c.items.filter((i: (typeof c.items)[number]) => i.checked).length;
  const signedAtPretty = c.signedAt
    ? new Date(c.signedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div>
      <Topbar
        title="Project closeout"
        subtitle={`${c.quote.number} · ${c.quote.client.name}`}
        action={
          <Link href={`/quotes/${quoteId}`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
            Back to quote
          </Link>
        }
      />

      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
        {saved ? (
          <div className="flex items-center gap-2 rounded-lg bg-[#e7f4ef] px-4 py-3 text-sm text-[var(--color-teal)]">
            <CheckCircle2 size={16} /> Checklist saved.
          </div>
        ) : null}

        {/* Status + share */}
        <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <StatusBadge status={c.status} />
              {signed && signedAtPretty ? (
                <span className="text-sm text-[var(--color-muted)]">Signed by {c.signedByName} on {signedAtPretty}</span>
              ) : null}
            </div>
            {!signed ? (
              <form action={deleteCloseout}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="quoteId" value={quoteId} />
                <button type="submit" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-300)] hover:text-[var(--color-rose)]">
                  <Trash2 size={15} /> Delete
                </button>
              </form>
            ) : null}
          </div>

          <p className="mb-1.5 text-sm font-medium text-[var(--color-ink-500)]">Client link</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input readOnly value={url} className="flex-1 min-w-[240px]" />
            <CopyLinkButton url={url} />
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm text-[var(--color-ink-500)] hover:border-[var(--color-ink)]">
              <ExternalLink size={15} /> Open
            </a>
          </div>

          {!signed ? (
            <div className="mt-4 flex items-center gap-2 border-t border-[var(--color-line)] pt-4">
              {c.status === "DRAFT" ? (
                <form action={setCloseoutStatus}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="quoteId" value={quoteId} />
                  <input type="hidden" name="status" value="SENT" />
                  <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-600)]">
                    <Send size={15} /> Mark as sent
                  </button>
                </form>
              ) : (
                <form action={setCloseoutStatus}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="quoteId" value={quoteId} />
                  <input type="hidden" name="status" value="DRAFT" />
                  <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-3.5 py-2 text-sm text-[var(--color-ink-500)] transition hover:border-[var(--color-ink)]">
                    <Undo2 size={15} /> Move back to draft
                  </button>
                </form>
              )}
              <p className="text-xs text-[var(--color-ink-300)]">
                {c.status === "DRAFT" ? "Sending just marks it ready — share the link above with your client." : "Marked as sent. Share the link with your client to sign off."}
              </p>
            </div>
          ) : null}
        </div>

        {/* Editor or signed summary */}
        {signed ? (
          <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6">
            <h2 className="mb-1 font-display text-base text-[var(--color-ink)]">{c.title || "Project closeout"}</h2>
            <p className="mb-4 text-sm text-[var(--color-muted)]">{checkedCount} of {c.items.length} items confirmed complete.</p>
            <ul className="space-y-2">
              {c.items.map((it: (typeof c.items)[number]) => (
                <li key={it.id} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 size={16} className={it.checked ? "mt-0.5 shrink-0 text-[var(--color-teal)]" : "mt-0.5 shrink-0 text-[var(--color-ink-300)]"} />
                  <span>
                    <span className={it.checked ? "text-[var(--color-ink)]" : "text-[var(--color-muted)] line-through"}>{it.label}</span>
                    {it.detail ? <span className="block text-xs text-[var(--color-muted)]">{it.detail}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <CloseoutEditor
            closeoutId={c.id}
            quoteId={quoteId}
            initial={{
              title: c.title ?? "",
              introNote: c.introNote ?? "",
              items: c.items.map((it: (typeof c.items)[number]) => ({ label: it.label, detail: it.detail ?? "" })),
            }}
          />
        )}
      </div>
    </div>
  );
}
