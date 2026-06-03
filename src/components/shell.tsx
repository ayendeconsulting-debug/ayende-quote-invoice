"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { NavList } from "@/components/nav-list";

export function Shell({ email, children }: { email: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape, and lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex h-screen flex-col overflow-hidden lg:flex-row">
      {/* Desktop sidebar */}
      <Sidebar email={email} />

      {/* Mobile top bar */}
      <header className="flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-ink)] px-4 py-3 text-white lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="-ml-1 rounded-lg p-1.5 text-white/90 transition hover:bg-white/10"
        >
          <Menu size={22} />
        </button>
        <Link href="/dashboard" className="font-display text-base tracking-tight">
          Ayende <span className="text-[var(--color-accent)]">Consulting</span>
        </Link>
      </header>

      {/* Mobile drawer + backdrop */}
      <div className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 max-w-[85%] bg-[var(--color-ink)] text-white shadow-xl transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute right-3 top-5 rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
          <NavList email={email} onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      {/* Content */}
      <div className="scroll-slim flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
