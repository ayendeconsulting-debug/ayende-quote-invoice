"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LogOut } from "lucide-react";
import { NAV_GROUPS } from "@/components/nav";

export function NavList({ email, onNavigate }: { email: string; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6">
        <Link href="/dashboard" onClick={onNavigate} className="font-display text-lg tracking-tight">
          Ayende <span className="text-[var(--color-accent)]">Books</span>
        </Link>
        <p className="mt-0.5 text-xs text-[var(--color-ink-300)]">Bookkeeping &amp; billing</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label ?? `group-${gi}`} className={gi === 0 ? "" : "mt-5"}>
            {group.label ? (
              <div className="px-3 pb-1.5 text-[10.5px] font-medium uppercase tracking-[0.09em] text-white/35">
                {group.label}
              </div>
            ) : null}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                      active
                        ? "bg-[var(--color-accent)]/20 font-medium text-[var(--color-accent)]"
                        : "text-[var(--color-ink-300)] hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon size={18} className={active ? "text-[var(--color-accent)]" : ""} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 truncate px-3 text-xs text-[var(--color-ink-300)]">{email}</div>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--color-ink-300)] transition hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
