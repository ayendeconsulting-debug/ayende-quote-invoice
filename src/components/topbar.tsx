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
    <header className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)] px-8 py-5">
      <div>
        <h1 className="font-display text-2xl text-[var(--color-ink)]">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-[var(--color-muted)]">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-3">{action}</div> : null}
    </header>
  );
}
