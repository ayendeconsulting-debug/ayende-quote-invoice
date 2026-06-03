export type Currency = "CAD" | "USD";

const SYMBOLS: Record<Currency, string> = { CAD: "$", USD: "$" };

/** Format a number as currency, e.g. formatMoney(2000, "CAD") -> "$2,000.00 CAD". */
export function formatMoney(amount: number, currency: Currency = "CAD"): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const body = new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${SYMBOLS[currency]}${body} ${currency}`;
}

/** Round to 2 decimal places, avoiding float artifacts. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type LineLike = { quantity: number; unitPrice: number; hours?: number | null };

/**
 * Amount for a single line. Phase 3 rule: if `hours` is provided (not null/blank)
 * the line is hours * unitPrice (KSQ behaviour); otherwise quantity * unitPrice.
 */
export function lineAmount(l: LineLike): number {
  const unitPrice = Number(l.unitPrice) || 0;
  const h = l.hours;
  if (h !== null && h !== undefined && String(h).trim() !== "") {
    return round2((Number(h) || 0) * unitPrice);
  }
  return round2((Number(l.quantity) || 0) * unitPrice);
}

export interface TotalsInput {
  lines: LineLike[];
  taxEnabled: boolean;
  taxRate: number; // percentage, e.g. 13
  discountType?: "PERCENT" | "FIXED" | null;
  discountValue?: number;
}

export interface Totals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

/** Compute subtotal, discount, tax, and total for a set of line items. */
export function computeTotals(input: TotalsInput): Totals {
  const subtotal = round2(
    input.lines.reduce((sum, l) => sum + lineAmount(l), 0)
  );

  let discountAmount = 0;
  const dv = Number(input.discountValue) || 0;
  if (input.discountType === "PERCENT") discountAmount = round2((subtotal * dv) / 100);
  else if (input.discountType === "FIXED") discountAmount = round2(dv);
  discountAmount = Math.min(discountAmount, subtotal);

  const taxable = round2(subtotal - discountAmount);
  const taxAmount = input.taxEnabled ? round2((taxable * (Number(input.taxRate) || 0)) / 100) : 0;
  const total = round2(taxable + taxAmount);

  return { subtotal, discountAmount, taxAmount, total };
}
