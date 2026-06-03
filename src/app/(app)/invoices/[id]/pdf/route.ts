import { loadInvoiceView } from "../../data";
import { renderInvoicePdf } from "@/lib/pdf/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadInvoiceView(id);
  if (!loaded) return new Response("Not found", { status: 404 });

  const pdf = await renderInvoicePdf(loaded.view);
  const filename = `${loaded.invoice.number || "invoice"}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
