import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { EmptyState } from "@/components/ui/primitives";
import { BellRing, CheckCircle2, AlertTriangle, Clock, AlertOctagon } from "lucide-react";
import { loadDueReminders, DUE_SOON_DAYS } from "@/lib/reminders";
import { SendReminderButton } from "./send-reminder-button";

export const dynamic = "force-dynamic";

function KindPill({ kind }: { kind: "DUE_SOON" | "OVERDUE" }) {
  const overdue = kind === "OVERDUE";
  const cls = overdue
    ? "bg-[#fdecea] text-[var(--color-rose)] border-[#f6d6d2]"
    : "bg-[#fdf3e7] text-[var(--color-amber)] border-[#f3e2c8]";
  const Icon = overdue ? AlertOctagon : Clock;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <Icon size={12} /> {overdue ? "Overdue" : "Due soon"}
    </span>
  );
}

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ rem?: string }>;
}) {
  const { rem } = await searchParams;
  const rows = await loadDueReminders();

  return (
    <>
      <Topbar
        title="Reminders"
        subtitle="Invoices ready for a payment nudge. Nothing is emailed until you send it."
      />
      <div className="p-4 sm:p-6 lg:p-8">
        {rem === "sent" ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-[#e7f4ef] px-4 py-3 text-sm text-[var(--color-teal)]">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>Reminder sent.</span>
          </div>
        ) : null}
        {rem && rem !== "sent" ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-[#fdf3e7] px-4 py-3 text-sm text-[var(--color-amber)]">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>
              {rem === "no-email"
                ? "That client has no email address on file. Add one on the client record, then send."
                : rem === "config"
                ? "Email isn't set up yet (RESEND_API_KEY). Configure Resend to send reminders."
                : rem === "ineligible"
                ? "That invoice is no longer due for a reminder (it may have been paid)."
                : "Couldn't send the reminder. Try again, or send the invoice manually."}
            </span>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <EmptyState
            icon={<BellRing size={22} />}
            title="Nothing to chase"
            description={`No invoices are due for a reminder right now. Due-soon nudges appear in the ${DUE_SOON_DAYS} days before the due date; overdue ones repeat weekly until paid.`}
          />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-left text-[var(--color-muted)]">
                    <th className="px-5 py-3 font-medium">Invoice</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Due</th>
                    <th className="px-5 py-3 font-medium">Reminder</th>
                    <th className="px-5 py-3 font-medium">History</th>
                    <th className="px-5 py-3 text-right font-medium">Balance</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-paper)]">
                      <td className="px-5 py-3">
                        <Link href={`/invoices/${r.id}`} className="font-medium tabular-nums text-[var(--color-ink)] hover:text-[var(--color-accent-600)]">
                          {r.number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-[var(--color-ink-500)]">
                        {r.clientName}
                        {!r.clientEmail ? (
                          <span className="ml-2 rounded bg-[#fdecea] px-1.5 py-0.5 text-xs text-[var(--color-rose)]">no email</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-[var(--color-ink-500)]">
                        <div className="tabular-nums">{r.dueDatePretty}</div>
                        <div className="text-xs text-[var(--color-ink-300)]">{r.dueRelative}</div>
                      </td>
                      <td className="px-5 py-3"><KindPill kind={r.kind} /></td>
                      <td className="px-5 py-3 text-[var(--color-ink-300)]">
                        {r.reminderCount > 0
                          ? `${r.reminderCount}×${r.lastReminderPretty ? ` · ${r.lastReminderPretty}` : ""}`
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium text-[var(--color-ink)]">{r.balanceText}</td>
                      <td className="px-5 py-3 text-right">
                        {r.clientEmail ? (
                          <div className="flex justify-end"><SendReminderButton id={r.id} /></div>
                        ) : (
                          <span className="text-xs text-[var(--color-ink-300)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
