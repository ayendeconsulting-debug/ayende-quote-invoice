import { Topbar } from "@/components/topbar";
import { EmptyState, PrimaryLink } from "@/components/ui/primitives";
import { Users } from "lucide-react";
import { QuoteEditor } from "../quote-editor";
import { loadClientsAndProfile, loadCatalogOptions } from "../data";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  const [{ clients, profile }, catalog] = await Promise.all([loadClientsAndProfile(), loadCatalogOptions()]);

  return (
    <>
      <Topbar title="New quote" subtitle="Build a detailed or simple quote." />
      <div className="p-8">
        {clients.length === 0 ? (
          <EmptyState
            icon={<Users size={22} />}
            title="Add a client first"
            description="A quote needs a client. Create one, then come back to draft the quote."
            action={<PrimaryLink href="/clients/new">Add a client</PrimaryLink>}
          />
        ) : (
          <QuoteEditor clients={clients} profile={profile} catalog={catalog} />
        )}
      </div>
    </>
  );
}
