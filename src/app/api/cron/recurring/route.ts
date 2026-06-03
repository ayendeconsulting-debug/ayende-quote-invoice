import { NextResponse, type NextRequest } from "next/server";
import { generateDueRecurringInvoices } from "@/lib/recurring";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Vercel Cron calls this daily with `Authorization: Bearer <CRON_SECRET>`.
// We also accept `?secret=` for manual/local triggering. If CRON_SECRET is
// unset we refuse (fail closed) rather than run unauthenticated.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  if (req.nextUrl.searchParams.get("secret") === secret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await generateDueRecurringInvoices();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "generation failed" },
      { status: 500 },
    );
  }
}
