import { NavList } from "@/components/nav-list";

/** Permanent navy sidebar on large screens. The mobile drawer lives in Shell. */
export function Sidebar({ email }: { email: string }) {
  return (
    <aside className="hidden h-full w-60 shrink-0 flex-col bg-[var(--color-ink)] text-white lg:flex">
      <NavList email={email} />
    </aside>
  );
}
