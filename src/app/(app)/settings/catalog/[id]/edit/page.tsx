import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { prisma } from "@/lib/prisma";
import { CatalogItemForm } from "../../catalog-item-form";

export const dynamic = "force-dynamic";

export default async function EditCatalogItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.catalogItem.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <>
      <Topbar title="Edit catalog item" subtitle={item.description} />
      <div className="p-4 sm:p-6 lg:p-8">
        <CatalogItemForm
          initial={{
            id: item.id,
            sectionKind: item.sectionKind,
            description: item.description,
            detail: item.detail ?? "",
            hours: item.hours === null ? "" : String(item.hours),
            quantity: String(item.quantity),
            unit: item.unit ?? "",
            unitPrice: String(item.unitPrice),
            sortOrder: String(item.sortOrder),
          }}
        />
      </div>
    </>
  );
}
