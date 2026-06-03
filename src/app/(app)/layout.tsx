import { requireSession } from "@/lib/session";
import { Shell } from "@/components/shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <Shell email={session.email}>{children}</Shell>;
}
