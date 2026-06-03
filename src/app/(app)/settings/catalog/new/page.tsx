import { Topbar } from "@/components/topbar";
import { CatalogItemForm } from "../catalog-item-form";

export default function NewCatalogItemPage() {
  return (
    <>
      <Topbar title="New catalog item" subtitle="Add a reusable line item." />
      <div className="p-8">
        <CatalogItemForm />
      </div>
    </>
  );
}
