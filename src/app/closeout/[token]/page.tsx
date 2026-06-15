import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getBusinessProfile } from "@/lib/profile";
import { CloseoutSignForm } from "./sign-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PublicCloseoutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const closeout = await prisma.closeout.findUnique({
    where: { shareToken: token },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      quote: { include: { client: true } },
    },
  });
  if (!closeout) notFound();

  const c = closeout!;
  const profile = await getBusinessProfile();
  const signed = c.status === "SIGNED";
  const title = c.title || c.quote.title || "Project closeout";
  const signedAtPretty = c.signedAt
    ? new Date(c.signedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
    : null;
  const checkedCount = c.items.filter((i: (typeof c.items)[number]) => i.checked).length;

  return (
    <main className="min-h-screen bg-[var(--color-paper)]">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-ink)] text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="font-display text-lg tracking-tight">{profile.businessName}</div>
          <div className="text-sm text-white/70">{c.quote.number}</div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-[var(--color-ink)]">{title}</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Prepared for {c.quote.client.company || c.quote.client.name}
          </p>
        </div>

        {signed ? (
          <>
            <div className="mb-6 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[#e7f4ef] p-6">
              <div className="flex items-start gap-2.5 text-[var(--color-teal)]">
                <CheckCircle2 size={22} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-display text-lg">Project signed off</div>
                  <p className="mt-0.5 text-sm text-[var(--color-ink-500)]">
                    Signed by {c.signedByName}{signedAtPretty ? ` on ${signedAtPretty}` : ""}. Thank you.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-5 sm:p-6">
              <p className="mb-4 text-sm text-[var(--color-muted)]">{checkedCount} of {c.items.length} deliverables confirmed complete.</p>
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
          </>
        ) : (
          <>
            {c.introNote ? (
              <div className="mb-6 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-5 text-sm text-[var(--color-ink-500)] sm:p-6">
                {c.introNote}
              </div>
            ) : null}
            <CloseoutSignForm
              token={token}
              items={c.items.map((it: (typeof c.items)[number]) => ({ id: it.id, label: it.label, detail: it.detail }))}
            />
          </>
        )}
      </div>
    </main>
  );
}
