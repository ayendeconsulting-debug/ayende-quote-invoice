import "server-only";
import ExcelJS from "exceljs";
import { formatMoney, type Currency } from "@/lib/money";
import type {
  Receivables,
  RevenueByClientRow,
  PaidInPeriod,
} from "@/lib/reports";

// A report rendered as a simple table: column headers + rows of cells.
// Both the CSV writer and the XLSX builder consume this one shape so the two
// export formats can never drift apart.
export interface Table {
  name: string;
  columns: string[];
  rows: (string | number)[][];
}

const dateCell = (d: Date | null): string =>
  d ? new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : "—";

// ---------- report -> Table ----------

export function receivablesTable(data: Receivables, name = "Receivables"): Table {
  return {
    name,
    columns: ["Invoice", "Client", "Currency", "Total", "Paid", "Outstanding", "Due date", "Status"],
    rows: data.rows.map((r) => [
      r.number,
      r.client,
      r.currency,
      r.total,
      r.paid,
      r.outstanding,
      dateCell(r.dueDate),
      r.status,
    ]),
  };
}

export function revenueByClientTable(rows: RevenueByClientRow[]): Table {
  return {
    name: "Revenue by client",
    columns: ["Client", "Currency", "Invoiced", "Collected"],
    rows: rows.map((r) => [r.client, r.currency, r.invoiced, r.collected]),
  };
}

export function paidByPeriodTable(data: PaidInPeriod): Table {
  return {
    name: "Paid by month",
    columns: ["Month", "CAD", "USD"],
    rows: data.months.map((m) => [m.label, m.byCurrency.CAD, m.byCurrency.USD]),
  };
}

// ---------- CSV ----------

function csvCell(value: string | number): string {
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function tableToCsv(table: Table): string {
  const header = table.columns.map(csvCell).join(",");
  const body = table.rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return body ? `${header}\r\n${body}\r\n` : `${header}\r\n`;
}

// ---------- XLSX (exceljs) ----------

const INK = "FF0D1B2A";
const ACCENT = "FFE07B39";
const MONEY_COLUMNS: Record<string, boolean> = {
  Total: true,
  Paid: true,
  Outstanding: true,
  Invoiced: true,
  Collected: true,
  CAD: true,
  USD: true,
};

function addSheet(wb: ExcelJS.Workbook, table: Table): void {
  const ws = wb.addWorksheet(table.name.slice(0, 31)); // Excel sheet-name limit
  const header = ws.addRow(table.columns);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
    cell.alignment = { vertical: "middle" };
  });

  const moneyColIdx = table.columns
    .map((c, i) => (MONEY_COLUMNS[c] ? i + 1 : 0))
    .filter((i) => i > 0);

  table.rows.forEach((row) => {
    const r = ws.addRow(row);
    moneyColIdx.forEach((idx) => {
      const cell = r.getCell(idx);
      if (typeof cell.value === "number") cell.numFmt = '#,##0.00';
    });
  });

  // Reasonable column widths.
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 40);
  });

  // Accent underline on the header bottom border.
  header.eachCell((cell) => {
    cell.border = { bottom: { style: "thin", color: { argb: ACCENT } } };
  });
}

export async function tablesToXlsxBuffer(tables: Table[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ayende CX";
  wb.created = new Date();
  if (tables.length === 0) wb.addWorksheet("Report");
  tables.forEach((t) => addSheet(wb, t));
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer as ArrayBuffer);
}

// Re-export for the route's convenience.
export { formatMoney };
export type { Currency };
