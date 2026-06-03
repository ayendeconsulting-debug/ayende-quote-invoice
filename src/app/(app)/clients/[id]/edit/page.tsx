import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { prisma } from "@/lib/prisma";
import { ClientForm } from "../../client-form";

export const dynamic = "force-dynamic";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <>
      <Topbar title={`Edit ${client.name}`} subtitle="Update client details." />
      <div className="p-4 sm:p-6 lg:p-8">
        <ClientForm
          initial={{
            id: client.id,
            name: client.name,
            company: client.company,
            email: client.email,
            phone: client.phone,
            addressLine1: client.addressLine1,
            addressLine2: client.addressLine2,
            city: client.city,
            province: client.province,
            postalCode: client.postalCode,
            country: client.country,
            currency: client.currency,
            notes: client.notes,
          }}
        />
      </div>
    </>
  );
}
