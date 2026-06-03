import type { ReactNode } from "react";

const STYLES: Record<string, string> = {
  DRAFT: "bg-[var(--color-paper)] text-[var(--color-ink-500)] border-[var(--color-line)]",
  SENT: "bg-[var(--color-accent-100)] text-[var(--color-accent-600)] border-[var(--color-accent-100)]",
  ACCEPTED: "bg-[#e7f4ef] text-[var(--color-teal)] border-[#cfe9df]",
  DECLINED: "bg-[#fdecea] text-[var(--color-rose)] border-[#f6d6d2]",
  EXPIRED: "bg-[#fdf3e7] text-[var(--color-amber)] border-[#f3e2c8]",
  PARTIALLY_PAID: "bg-[#fdf3e7] text-[var(--color-amber)] border-[#f3e2c8]",
  PAID: "bg-[#e7f4ef] text-[var(--color-teal)] border-[#cfe9df]",
  OVERDUE: "bg-[#fdecea] text-[var(--color-rose)] border-[#f6d6d2]",
};

const LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

export function StatusBadge({ status }: { status: string }): ReactNode {
  const cls = STYLES[status] ?? STYLES.DRAFT;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
