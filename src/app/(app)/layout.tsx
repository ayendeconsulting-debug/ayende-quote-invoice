import { requireSession } from "@/lib/session";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar email={session.email} />
      <div className="scroll-slim flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
