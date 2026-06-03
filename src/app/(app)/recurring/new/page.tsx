import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { loadRecurringEditorData } from "../data";
import { RecurringEditor } from "../recurring-editor";

export const dynamic = "force-dynamic";

export default async function NewRecurringPage() {
  const { clients, profile } = await loadRecurringEditorData();
  return (
    <>
      <Topbar title="New recurring schedule" subtitle="Generate draft invoices on a cadence." />
      <div className="p-4 sm:p-6 lg:p-8">
        <Link href="/recurring" className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          <ArrowLeft size={15} /> All schedules
        </Link>
        <div className="mx-auto max-w-3xl">
          <RecurringEditor clients={clients} profile={profile} />
        </div>
      </div>
    </>
  );
}
