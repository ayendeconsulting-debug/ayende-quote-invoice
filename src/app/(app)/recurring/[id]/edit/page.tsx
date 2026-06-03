import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { loadRecurringEditorData, loadRecurringInitial } from "../../data";
import { RecurringEditor } from "../../recurring-editor";

export const dynamic = "force-dynamic";

export default async function EditRecurringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ clients, profile }, initial] = await Promise.all([
    loadRecurringEditorData(),
    loadRecurringInitial(id),
  ]);
  if (!initial) notFound();

  return (
    <>
      <Topbar title="Edit schedule" subtitle={initial.title || "Recurring invoice"} />
      <div className="p-4 sm:p-6 lg:p-8">
        <Link href="/recurring" className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          <ArrowLeft size={15} /> All schedules
        </Link>
        <div className="mx-auto max-w-3xl">
          <RecurringEditor clients={clients} profile={profile} initial={initial} />
        </div>
      </div>
    </>
  );
}
