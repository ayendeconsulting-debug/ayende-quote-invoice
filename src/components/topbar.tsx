export function Topbar({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 lg:px-8">
      <div className="min-w-0">
        <h1 className="font-display text-xl text-[var(--color-ink)] sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-0.5 truncate text-sm text-[var(--color-muted)]">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2 sm:gap-3">{action}</div> : null}
    </header>
  );
}
