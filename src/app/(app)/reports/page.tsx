import { Topbar } from "@/components/topbar";
import { EmptyState } from "@/components/ui/primitives";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <>
      <Topbar title="Reports" subtitle="Receivables, revenue, and acceptance rates." />
      <div className="p-8">
        <EmptyState
          icon={<BarChart3 size={22} />}
          title="Reports coming soon"
          description="Receivables, pipeline, revenue by client, and CSV/XLSX export. Coming in Phase 8."
        />
      </div>
    </>
  );
}
