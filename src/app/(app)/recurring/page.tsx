import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Card, PrimaryLink, EmptyState } from "@/components/ui/primitives";
import { Repeat, Play, Pause, Pencil, Zap, CheckCircle2, AlertTriangle } from "lucide-react";
import { loadRecurringList, type RecurringListRow } from "./data";
import { setRecurringStatus, generateNow } from "./actions";
import { DeleteRecurringButton } from "./delete-recurring-button";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<string, string> = {
  ACTIVE: "bg-[#e7f4ef] text-[var(--color-teal)]",
  PAUSED: "bg-[#fdf3e7] text-[var(--color-amber)]",
  COMPLETED: "bg-[#eceae4] text-[var(--color-ink-500)]",
};

function cadence(unit: string, count: number): string {
  const u = unit === "DAY" ? "day" : unit === "WEEK" ? "week" : "month";
  return count === 1 ? `Every ${u}` : `Every ${count} ${u}s`;
}

function endLabel(row: RecurringListRow): string {
  if (row.endMode === "AFTER_N" && row.maxOccurrences != null)
    return `${row.occurrencesGenerated}/${row.maxOccurrences} generated`;
  return `${row.occurrencesGenerated} generated`;
}

export default async function RecurringPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string; generror?: string; genempty?: string }>;
}) {
  const sp = await searchParams;
  const rows = await loadRecurringList();

  return (
    <>
      <Topbar
        title="Recurring"
        subtitle="Schedules that generate draft invoices automatically."
        action={<PrimaryLink href="/recurring/new">New schedule</PrimaryLink>}
      />
      <div className="p-8">
        {sp.created || sp.updated ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-[#e7f4ef] px-4 py-3 text-sm text-[var(--color-teal)]">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>Schedule {sp.created ? "created" : "updated"}.</span>
          </div>
        ) : null}
        {sp.generror ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-[#fdf3e7] px-4 py-3 text-sm text-[var(--color-amber)]">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>Couldn&rsquo;t generate an invoice from that schedule. Check it has at least one line item.</span>
          </div>
        ) : null}
        {sp.genempty ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-[#fdf3e7] px-4 py-3 text-sm text-[var(--color-amber)]">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>That schedule has no billable line items, so no invoice was created.</span>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <EmptyState
            icon={<Repeat size={22} />}
            title="No recurring schedules yet"
            description="Set up a schedule to auto-generate draft invoices on a cadence you choose."
          />
        ) : (
          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[var(--color-muted)]">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Cadence</th>
                  <th className="px-5 py-3 font-medium">Next run</th>
                  <th className="px-5 py-3 font-medium">Progress</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: RecurringListRow) => (
                  <tr key={r.id} className="border-b border-[var(--color-line)] last:border-0">
                    <td className="px-5 py-3 text-[var(--color-ink)]">{r.clientName}</td>
                    <td className="px-5 py-3 text-[var(--color-ink-500)]">{r.title ?? "—"}</td>
                    <td className="px-5 py-3 text-[var(--color-ink-500)]">{cadence(r.intervalUnit, r.intervalCount)}</td>
                    <td className="px-5 py-3 tabular-nums text-[var(--color-ink-500)]">
                      {r.status === "COMPLETED" ? "—" : r.nextRunDate}
                    </td>
                    <td className="px-5 py-3 text-[var(--color-ink-300)]">{endLabel(r)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[r.status] ?? STATUS_PILL.COMPLETED}`}>
                        {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status !== "COMPLETED" ? (
                          <form action={generateNow}>
                            <input type="hidden" name="id" value={r.id} />
                            <button type="submit" className="rounded p-1 text-[var(--color-ink-300)] transition hover:text-[var(--color-accent-600)]" aria-label="Generate now" title="Generate a draft invoice now">
                              <Zap size={15} />
                            </button>
                          </form>
                        ) : null}
                        {r.status === "ACTIVE" ? (
                          <form action={setRecurringStatus}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="status" value="PAUSED" />
                            <button type="submit" className="rounded p-1 text-[var(--color-ink-300)] transition hover:text-[var(--color-ink)]" aria-label="Pause" title="Pause"><Pause size={15} /></button>
                          </form>
                        ) : r.status === "PAUSED" ? (
                          <form action={setRecurringStatus}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="status" value="ACTIVE" />
                            <button type="submit" className="rounded p-1 text-[var(--color-ink-300)] transition hover:text-[var(--color-teal)]" aria-label="Resume" title="Resume"><Play size={15} /></button>
                          </form>
                        ) : null}
                        <Link href={`/recurring/${r.id}/edit`} className="rounded p-1 text-[var(--color-ink-300)] transition hover:text-[var(--color-ink)]" aria-label="Edit" title="Edit"><Pencil size={15} /></Link>
                        <DeleteRecurringButton id={r.id} label={r.clientName} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </>
  );
}
