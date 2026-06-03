import "server-only";
import { prisma } from "@/lib/prisma";
import { getBusinessProfile } from "@/lib/profile";
import { markOverdueInvoices } from "@/lib/share";
import type { InvoiceView } from "@/components/invoice-preview";
import type { InvoiceClient, InvoiceProfile } from "./invoice-editor";
import type { PaymentItem } from "./payments-panel";

type AddrLike = {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
};
function addressLines(a: AddrLike): string[] {
  return [
    a.addressLine1,
    a.addressLine2,
    [a.city, a.province].filter(Boolean).join(", "),
    [a.postalCode, a.country].filter(Boolean).join(" "),
  ]
    .map((l) => (l ?? "").trim())
    .filter((l) => l.length > 0);
}
function pretty(d: Date | null): string | null {
  return d ? d.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }) : null;
}

export async function loadInvoiceEditorData(): Promise<{ clients: InvoiceClient[]; profile: InvoiceProfile }> {
  const [rows, profile] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    getBusinessProfile(),
  ]);
  const clients: InvoiceClient[] = rows.map((c: (typeof rows)[number]) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    email: c.email,
    currency: c.currency,
    addressLines: addressLines(c),
  }));
  const p: InvoiceProfile = {
    businessName: profile.businessName,
    addressLines: addressLines(profile),
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    defaultCurrency: profile.defaultCurrency,
    defaultTaxRate: String(profile.defaultTaxRate),
    taxLabel: profile.taxLabel,
    etransferEmail: profile.etransferEmail,
    bankDetails: profile.bankDetails,
  };
  return { clients, profile: p };
}

const invoiceInclude = {
  client: true,
  lineItems: { orderBy: { sortOrder: "asc" as const } },
  sourceQuote: { select: { number: true } },
} as const;

export interface InvoiceMeta {
  id: string;
  number: string;
  status: string;
  clientName: string;
  clientEmail: string | null;
  sourceQuoteId: string | null;
  sourceQuoteNumber: string | null;
  hasPayments: boolean;
  dueDateInput: string; // yyyy-mm-dd or ""
  notes: string;
}

export async function loadInvoiceView(
  id: string
): Promise<{ view: InvoiceView; invoice: InvoiceMeta; payments: PaymentItem[] } | null> {
  await markOverdueInvoices();
  const [inv, profile] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { ...invoiceInclude, payments: { orderBy: { date: "desc" }, select: { id: true, date: true, amount: true, method: true, reference: true } } },
    }),
    getBusinessProfile(),
  ]);
  if (!inv) return null;

  const lines = inv.lineItems.map((it: (typeof inv.lineItems)[number]) => ({
    description: it.description,
    detail: it.detail,
    hours: it.hours === null ? null : Number(it.hours),
    quantity: Number(it.quantity),
    unit: it.unit,
    unitPrice: Number(it.unitPrice),
    amount: Number(it.amount),
  }));

  const amountPaid = Number(inv.amountPaid);
  const total = Number(inv.total);
  const balanceDue = Math.max(0, Math.round((total - amountPaid) * 100) / 100);
  const creditBalance = Math.max(0, Math.round((amountPaid - total) * 100) / 100);

  const view: InvoiceView = {
    number: inv.number,
    status: inv.status,
    currency: inv.currency === "USD" ? "USD" : "CAD",
    businessName: profile.businessName,
    businessAddressLines: addressLines(profile),
    businessEmail: profile.email,
    businessPhone: profile.phone,
    businessWebsite: profile.website,
    businessTaxNumber: profile.taxNumber,
    clientName: inv.client.name,
    clientCompany: inv.client.company,
    clientAddressLines: addressLines(inv.client),
    clientEmail: inv.client.email,
    title: inv.title,
    notes: inv.notes,
    issueDate: pretty(inv.issueDate),
    dueDate: pretty(inv.dueDate),
    taxEnabled: inv.taxEnabled,
    taxRate: Number(inv.taxRate),
    taxLabel: inv.taxLabel,
    discountType: (inv.discountType as "PERCENT" | "FIXED" | null) ?? null,
    discountValue: Number(inv.discountValue),
    lines,
    totals: {
      subtotal: Number(inv.subtotal),
      discountAmount: Number(inv.discountAmount),
      taxAmount: Number(inv.taxAmount),
      total,
    },
    amountPaid,
    balanceDue,
    creditBalance,
    payEtransferEmail: profile.etransferEmail,
    payBankDetails: profile.bankDetails,
    sourceQuoteNumber: inv.sourceQuote?.number ?? null,
  };

  const payments: PaymentItem[] = inv.payments.map((p: (typeof inv.payments)[number]) => ({
    id: p.id,
    dateInput: p.date.toISOString().slice(0, 10),
    datePretty: p.date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }),
    amount: Number(p.amount),
    method: p.method,
    reference: p.reference,
  }));

  const invoice: InvoiceMeta = {
    id: inv.id,
    number: inv.number,
    status: inv.status,
    clientName: inv.client.name,
    clientEmail: inv.client.email,
    sourceQuoteId: inv.sourceQuoteId,
    sourceQuoteNumber: inv.sourceQuote?.number ?? null,
    hasPayments: inv.payments.length > 0,
    dueDateInput: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : "",
    notes: inv.notes ?? "",
  };

  return { view, invoice, payments };
}
