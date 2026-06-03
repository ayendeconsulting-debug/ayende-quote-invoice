import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { resolvePeriod } from "@/lib/period";
import {
  getReceivables,
  getOverdue,
  getRevenueByClient,
  getPaidInPeriod,
} from "@/lib/reports";
import {
  receivablesTable,
  revenueByClientTable,
  paidByPeriodTable,
  tableToCsv,
  tablesToXlsxBuffer,
  type Table,
} from "@/lib/export";

export const dynamic = "force-dynamic";

type ReportKey = "receivables" | "overdue" | "revenue" | "paid" | "all";

async function buildTables(report: ReportKey, period: ReturnType<typeof resolvePeriod>): Promise<Table[]> {
  switch (report) {
    case "receivables":
      return [receivablesTable(await getReceivables())];
    case "overdue":
      return [receivablesTable(await getOverdue(), "Overdue")];
    case "revenue":
      return [revenueByClientTable(await getRevenueByClient(period))];
    case "paid":
      return [paidByPeriodTable(await getPaidInPeriod(period))];
    case "all":
      return [
        receivablesTable(await getReceivables()),
        receivablesTable(await getOverdue(), "Overdue"),
        revenueByClientTable(await getRevenueByClient(period)),
        paidByPeriodTable(await getPaidInPeriod(period)),
      ];
  }
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const sp = req.nextUrl.searchParams;
  const reportParam = (sp.get("report") ?? "all") as ReportKey;
  const valid: ReportKey[] = ["receivables", "overdue", "revenue", "paid", "all"];
  const report: ReportKey = valid.includes(reportParam) ? reportParam : "all";
  const format = sp.get("format") === "csv" ? "csv" : "xlsx";

  const period = resolvePeriod(sp.get("preset") ?? undefined, sp.get("from") ?? undefined, sp.get("to") ?? undefined);
  const stamp = new Date().toISOString().slice(0, 10);

  const tables = await buildTables(report, period);

  if (format === "csv") {
    // CSV is single-table; "all" falls back to the first table.
    const table = tables[0];
    const csv = tableToCsv(table);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug(table.name)}-${stamp}.csv"`,
      },
    });
  }

  const buffer = await tablesToXlsxBuffer(tables);
  const baseName = report === "all" ? "ayende-reports" : slug(tables[0].name);
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${baseName}-${stamp}.xlsx"`,
    },
  });
}
