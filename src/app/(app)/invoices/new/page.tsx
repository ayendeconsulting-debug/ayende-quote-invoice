import { Topbar } from "@/components/topbar";
import { EmptyState, PrimaryLink } from "@/components/ui/primitives";
import { Users } from "lucide-react";
import { InvoiceEditor } from "../invoice-editor";
import { loadInvoiceEditorData } from "../data";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const { clients, profile } = await loadInvoiceEditorData();

  return (
    <>
      <Topbar title="New invoice" subtitle="Bill a client directly." />
      <div className="p-8">
        {clients.length === 0 ? (
          <EmptyState
            icon={<Users size={22} />}
            title="Add a client first"
            description="An invoice needs a client. Create one, then come back to bill them."
            action={<PrimaryLink href="/clients/new">Add a client</PrimaryLink>}
          />
        ) : (
          <InvoiceEditor clients={clients} profile={profile} />
        )}
      </div>
    </>
  );
}
