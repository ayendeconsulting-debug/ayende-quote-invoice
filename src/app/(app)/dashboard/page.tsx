import { Topbar } from "@/components/topbar";
import { Card, PrimaryLink } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";
import { ArrowUpRight, Clock, FileText } from "lucide-react";

// Phase 1: static placeholders. Live metrics are wired up in Phase 8 (Reporting).
const METRICS = [
  { label: "Outstanding receivables", value: formatMoney(0), hint: "Across open invoices" },
  { label: "Pipeline value", value: formatMoney(0), hint: "Accepted, not yet invoiced" },
  { label: "Paid this month", value: formatMoney(0), hint: "Cleared payments" },
  { label: "Quote acceptance rate", value: "—", hint: "Last 90 days" },
];

export default function DashboardPage() {
  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle="Your quoting and billing at a glance."
        action={<PrimaryLink href="/quotes/new">New quote</PrimaryLink>}
      />

      <div className="p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {METRICS.map((m) => (
            <Card key={m.label} className="p-5">
              <p className="text-sm text-[var(--color-muted)]">{m.label}</p>
              <p className="mt-2 font-display text-2xl text-[var(--color-ink)]">{m.value}</p>
              <p className="mt-1 text-xs text-[var(--color-ink-300)]">{m.hint}</p>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
              <h2 className="font-display text-lg">Recent activity</h2>
              <Clock size={18} className="text-[var(--color-ink-300)]" />
            </div>
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-600)]">
                <FileText size={20} />
              </div>
              <p className="text-sm text-[var(--color-muted)]">
                Nothing here yet. Create your first quote to get started.
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-lg">Quick actions</h2>
            <div className="mt-4 space-y-2">
              {[
                { href: "/quotes/new", label: "Draft a quote" },
                { href: "/clients/new", label: "Add a client" },
                { href: "/invoices", label: "View invoices" },
                { href: "/settings", label: "Business settings" },
              ].map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-line)] px-3.5 py-2.5 text-sm transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-100)]/40"
                >
                  {a.label}
                  <ArrowUpRight size={16} className="text-[var(--color-ink-300)]" />
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
