import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { Card } from "@/components/ui/primitives";
import { prisma } from "@/lib/prisma";
import { Pencil, ArrowLeft, AlertTriangle } from "lucide-react";
import { DeleteClientButton } from "../delete-button";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-6 border-b border-[var(--color-line)] py-3 last:border-0">
      <span className="text-sm text-[var(--color-muted)]">{label}</span>
      <span className="text-right text-sm text-[var(--color-ink)]">{value && value.length ? value : "—"}</span>
    </div>
  );
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  const address = [
    client.addressLine1,
    client.addressLine2,
    [client.city, client.province].filter(Boolean).join(", "),
    client.postalCode,
    client.country,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <>
      <Topbar
        title={client.name}
        subtitle={client.company ?? "Client"}
        action={
          <>
            <Link
              href={`/clients/${client.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-3.5 py-2 text-sm transition hover:border-[var(--color-accent)]"
            >
              <Pencil size={16} />
              Edit
            </Link>
            <DeleteClientButton id={client.id} name={client.name} />
          </>
        }
      />
      <div className="p-8">
        <Link href="/clients" className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          <ArrowLeft size={15} />
          All clients
        </Link>

        {error === "has-documents" ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-[#fdf3e7] px-4 py-3 text-sm text-[var(--color-amber)]">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>This client has quotes or invoices on file and can&rsquo;t be deleted. Remove those documents first.</span>
          </div>
        ) : null}

        <div className="grid max-w-3xl grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-3 font-display text-lg">Contact</h2>
            <Row label="Email" value={client.email} />
            <Row label="Phone" value={client.phone} />
            <Row label="Default currency" value={client.currency} />
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-display text-lg">Address</h2>
            <p className="whitespace-pre-line text-sm text-[var(--color-ink)]">{address.length ? address : "—"}</p>
          </Card>

          {client.notes ? (
            <Card className="p-6 lg:col-span-2">
              <h2 className="mb-3 font-display text-lg">Notes</h2>
              <p className="whitespace-pre-line text-sm text-[var(--color-ink)]">{client.notes}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
