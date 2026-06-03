import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { EmptyState, PrimaryLink } from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { SECTION_KINDS, sectionMeta } from "@/lib/quote-template";
import { ArrowLeft, BookOpen, Pencil } from "lucide-react";
import { DeleteItemButton } from "./delete-item-button";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const items = await prisma.catalogItem.findMany({ orderBy: [{ sectionKind: "asc" }, { sortOrder: "asc" }] });

  const byKind = SECTION_KINDS.map((k) => ({
    kind: k,
    label: sectionMeta(k).label,
    rows: items.filter((i: (typeof items)[number]) => i.sectionKind === k),
  })).filter((g) => g.rows.length > 0);

  return (
    <>
      <Topbar
        title="Line-item catalog"
        subtitle="Reusable items you can insert into quotes."
        action={<PrimaryLink href="/settings/catalog/new">New item</PrimaryLink>}
      />
      <div className="p-8">
        <Link href="/settings" className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          <ArrowLeft size={15} /> Settings
        </Link>

        {items.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={22} />}
            title="Catalog is empty"
            description="Run npm run db:seed to load the KSQ items, or add your own."
            action={<PrimaryLink href="/settings/catalog/new">Add an item</PrimaryLink>}
          />
        ) : (
          <div className="space-y-6">
            {byKind.map((g) => (
              <div key={g.kind} className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white">
                <div className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-paper)] px-5 py-3">
                  <h2 className="font-display text-base">{g.label}</h2>
                  <span className="text-xs uppercase tracking-wide text-[var(--color-ink-300)]">{g.kind} · {g.rows.length}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {g.rows.map((it: (typeof g.rows)[number]) => (
                      <tr key={it.id} className="border-b border-[var(--color-line)] align-top last:border-0">
                        <td className="px-5 py-3">
                          <div className="text-[var(--color-ink)]">{it.description}</div>
                          {it.detail ? <div className="text-xs text-[var(--color-muted)]">{it.detail}</div> : null}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-[var(--color-ink-500)]">
                          {it.hours !== null ? `${Number(it.hours)} hrs` : Number(it.unitPrice) ? `$${Number(it.unitPrice)}${it.unit ? `/${it.unit}` : ""}` : "\u2014"}
                        </td>
                        <td className="w-20 px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/settings/catalog/${it.id}/edit`} className="rounded p-1 text-[var(--color-ink-300)] transition hover:text-[var(--color-accent-600)]" aria-label="Edit item">
                              <Pencil size={16} />
                            </Link>
                            <DeleteItemButton id={it.id} label={it.description} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
