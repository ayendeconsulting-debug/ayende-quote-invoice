import { loadQuoteView } from "../../data";
import { renderQuotePdf } from "@/lib/pdf/quote-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadQuoteView(id);
  if (!loaded) return new Response("Not found", { status: 404 });

  const pdf = await renderQuotePdf(loaded.view);
  const filename = `${loaded.quote.number || "quote"}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
