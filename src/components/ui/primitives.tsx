import Link from "next/link";
import { Plus } from "lucide-react";

export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-600)]"
    >
      <Plus size={16} />
      {children}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] ${className}`}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-600)]">
        {icon}
      </div>
      <h3 className="font-display text-lg text-[var(--color-ink)]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
