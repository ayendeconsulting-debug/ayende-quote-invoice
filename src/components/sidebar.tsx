"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LogOut } from "lucide-react";
import { NAV_ITEMS } from "@/components/nav";

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-[var(--color-ink)] text-white">
      <div className="px-6 py-6">
        <Link href="/dashboard" className="font-display text-lg tracking-tight">
          Ayende <span className="text-[var(--color-accent)]">Consulting</span>
        </Link>
        <p className="mt-0.5 text-xs text-[var(--color-ink-300)]">Quotes & Invoices</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-white/10 text-white"
                  : "text-[var(--color-ink-300)] hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon size={18} className={active ? "text-[var(--color-accent)]" : ""} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 px-3 text-xs text-[var(--color-ink-300)]">{email}</div>
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
    </aside>
  );
}
