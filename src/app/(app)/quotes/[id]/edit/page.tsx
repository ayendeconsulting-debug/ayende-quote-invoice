import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { QuoteEditor } from "../../quote-editor";
import { loadClientsAndProfile, loadQuoteInitial, loadCatalogOptions } from "../../data";

export const dynamic = "force-dynamic";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [initial, { clients, profile }, catalog] = await Promise.all([
    loadQuoteInitial(id),
    loadClientsAndProfile(),
    loadCatalogOptions(),
  ]);
  if (!initial) notFound();

  return (
    <>
      <Topbar title={`Edit ${initial.number}`} subtitle={initial.title ?? "Update the quote."} />
      <div className="p-4 sm:p-6 lg:p-8">
        <QuoteEditor clients={clients} profile={profile} catalog={catalog} initial={initial} />
      </div>
    </>
  );
}
