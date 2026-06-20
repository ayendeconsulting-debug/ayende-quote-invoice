import { Search } from "lucide-react";

export function Topbar({
  title,
  subtitle,
  breadcrumb,
  action,
  search = false,
}: {
  title: string;
  subtitle?: string;
  /** Small context line above the title, e.g. "Billing / Payments". */
  breadcrumb?: string;
  action?: React.ReactNode;
  /** Show a (currently non-interactive) search affordance on the right. */
  search?: boolean;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 lg:px-8">
      <div className="min-w-0">
        {breadcrumb ? (
          <p className="text-[11px] text-[var(--color-ink-300)]">{breadcrumb}</p>
        ) : null}
        <h1 className="font-display text-xl text-[var(--color-ink)] sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">{subtitle}</p> : null}
      </div>
      {search || action ? (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {search ? (
            <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink-300)]">
              <Search size={15} />
              Search
            </span>
          ) : null}
          {action}
        </div>
      ) : null}
    </header>
  );
}
