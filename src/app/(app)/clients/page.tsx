import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { EmptyState, PrimaryLink } from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { Users } from "lucide-react";
import { SearchBox } from "./search-box";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { company: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const clients = await prisma.client.findMany({ where, orderBy: { name: "asc" } });

  return (
    <>
      <Topbar
        title="Clients"
        subtitle="People and companies you quote and invoice."
        action={<PrimaryLink href="/clients/new">New client</PrimaryLink>}
      />
      <div className="p-8">
        <div className="mb-5">
          <SearchBox initialQuery={q} />
        </div>

        {clients.length === 0 ? (
          q ? (
            <EmptyState
              icon={<Users size={22} />}
              title="No matches"
              description={`No clients matched the search. Try a different term.`}
            />
          ) : (
            <EmptyState
              icon={<Users size={22} />}
              title="No clients yet"
              description="Add your first client to start drafting quotes."
              action={<PrimaryLink href="/clients/new">Add a client</PrimaryLink>}
            />
          )
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[var(--color-muted)]">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Currency</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c: (typeof clients)[number]) => (
                  <tr key={c.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-paper)]">
                    <td className="px-5 py-3">
                      <Link href={`/clients/${c.id}`} className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent-600)]">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-ink-500)]">{c.company ?? "\u2014"}</td>
                    <td className="px-5 py-3 text-[var(--color-ink-500)]">{c.email ?? "\u2014"}</td>
                    <td className="px-5 py-3 text-[var(--color-ink-500)]">{c.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
