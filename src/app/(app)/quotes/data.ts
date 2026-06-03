import "server-only";
import { prisma } from "@/lib/prisma";
import { getBusinessProfile } from "@/lib/profile";
import { expireOverdueQuotes } from "@/lib/share";
import type { ClientOption, ProfileInfo, QuoteInitial } from "./quote-editor";
import type { CatalogOption } from "./catalog-picker";
import type { QuoteView, PreviewSection } from "@/components/quote-preview";

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

function ymd(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}
function pretty(d: Date | null): string | null {
  return d ? d.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }) : null;
}
function prettyDateTime(d: Date | null): string | null {
  return d
    ? d.toLocaleString("en-CA", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;
}

export async function loadClientsAndProfile(): Promise<{ clients: ClientOption[]; profile: ProfileInfo }> {
  const [rows, profile] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    getBusinessProfile(),
  ]);

  const clients: ClientOption[] = rows.map((c: (typeof rows)[number]) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    email: c.email,
    currency: c.currency,
    addressLines: addressLines(c),
  }));

  const profileInfo: ProfileInfo = {
    businessName: profile.businessName,
    addressLines: addressLines(profile),
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
  };

  return { clients, profile: profileInfo };
}

export async function loadCatalogOptions(): Promise<CatalogOption[]> {
  const rows = await prisma.catalogItem.findMany({ orderBy: [{ sectionKind: "asc" }, { sortOrder: "asc" }] });
  return rows.map((c: (typeof rows)[number]) => ({
    id: c.id,
    sectionKind: c.sectionKind,
    description: c.description,
    detail: c.detail ?? "",
    hours: c.hours === null ? "" : String(c.hours),
    quantity: String(c.quantity),
    unit: c.unit ?? "",
    unitPrice: String(c.unitPrice),
  }));
}

const quoteInclude = {
  client: true,
  invoice: { select: { id: true, number: true } },
  sections: { orderBy: { sortOrder: "asc" as const }, include: { items: { orderBy: { sortOrder: "asc" as const } } } },
} as const;

export async function loadQuoteInitial(id: string): Promise<QuoteInitial | null> {
  const q = await prisma.quote.findUnique({ where: { id }, include: quoteInclude });
  if (!q) return null;

  return {
    id: q.id,
    number: q.number,
    status: q.status,
    clientId: q.clientId,
    template: q.template,
    currency: q.currency,
    title: q.title ?? "",
    introText: q.introText ?? "",
    notes: q.notes ?? "",
    issueDate: ymd(q.issueDate),
    validUntil: ymd(q.validUntil),
    taxEnabled: q.taxEnabled,
    taxRate: String(q.taxRate),
    taxLabel: q.taxLabel,
    discountType: q.discountType ?? "",
    discountValue: String(q.discountValue),
    sections: q.sections.map((s: (typeof q.sections)[number]) => ({
      kind: s.kind,
      title: s.title,
      items: s.items.map((it: (typeof s.items)[number]) => ({
        description: it.description,
        detail: it.detail ?? "",
        hours: it.hours === null ? "" : String(it.hours),
        quantity: String(it.quantity),
        unit: it.unit ?? "",
        unitPrice: String(it.unitPrice),
      })),
    })),
  };
}

type QuoteWithRelations = NonNullable<Awaited<ReturnType<typeof fetchQuote>>>;

async function fetchQuote(where: { id: string } | { shareToken: string }) {
  return prisma.quote.findUnique({ where: where as never, include: quoteInclude });
}

function buildView(q: QuoteWithRelations, profile: Awaited<ReturnType<typeof getBusinessProfile>>): QuoteView {
  const sections: PreviewSection[] = q.sections.map((s: (typeof q.sections)[number]) => ({
    kind: s.kind,
    title: s.title,
    items: s.items.map((it: (typeof s.items)[number]) => ({
      description: it.description,
      detail: it.detail,
      hours: it.hours === null ? null : Number(it.hours),
      quantity: Number(it.quantity),
      unit: it.unit,
      unitPrice: Number(it.unitPrice),
      amount: Number(it.amount),
    })),
  }));

  const tcoSection = q.sections.find((s: (typeof q.sections)[number]) => s.kind === "TCO");
  const tcoTotal = tcoSection
    ? tcoSection.items.reduce((sum: number, it: (typeof tcoSection.items)[number]) => sum + Number(it.amount), 0)
    : undefined;

  return {
    number: q.number,
    status: q.status,
    template: q.template === "SIMPLE" ? "SIMPLE" : "DETAILED",
    currency: q.currency === "USD" ? "USD" : "CAD",
    businessName: profile.businessName,
    businessAddressLines: addressLines(profile),
    businessEmail: profile.email,
    businessPhone: profile.phone,
    businessWebsite: profile.website,
    businessTaxNumber: profile.taxNumber,
    clientName: q.client.name,
    clientCompany: q.client.company,
    clientAddressLines: addressLines(q.client),
    clientEmail: q.client.email,
    title: q.title,
    introText: q.introText,
    notes: q.notes,
    issueDate: pretty(q.issueDate),
    validUntil: pretty(q.validUntil),
    taxEnabled: q.taxEnabled,
    taxRate: Number(q.taxRate),
    taxLabel: q.taxLabel,
    discountType: (q.discountType as "PERCENT" | "FIXED" | null) ?? null,
    discountValue: Number(q.discountValue),
    sections,
    totals: {
      subtotal: Number(q.subtotal),
      discountAmount: Number(q.discountAmount),
      taxAmount: Number(q.taxAmount),
      total: Number(q.total),
    },
    tcoTotal,
    acceptedByName: q.acceptedByName,
    acceptedByEmail: q.acceptedByEmail,
    acceptedAt: prettyDateTime(q.acceptedAt),
    declinedAt: prettyDateTime(q.declinedAt),
    declineReason: q.declineReason,
  };
}

export interface QuoteMeta {
  id: string;
  number: string;
  status: string;
  shareToken: string | null;
  clientEmail: string | null;
  clientName: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
}

export async function loadQuoteView(
  id: string
): Promise<{ view: QuoteView; quote: QuoteMeta } | null> {
  await expireOverdueQuotes();
  const [q, profile] = await Promise.all([fetchQuote({ id }), getBusinessProfile()]);
  if (!q) return null;
  return {
    view: buildView(q, profile),
    quote: {
      id: q.id,
      number: q.number,
      status: q.status,
      shareToken: q.shareToken,
      clientEmail: q.client.email,
      clientName: q.client.name,
      invoiceId: q.invoice?.id ?? null,
      invoiceNumber: q.invoice?.number ?? null,
    },
  };
}

/** Public (token-keyed) loader for the /q/[token] share page. No auth. */
export async function loadPublicQuoteView(
  token: string
): Promise<{ view: QuoteView; quote: QuoteMeta } | null> {
  await expireOverdueQuotes();
  const [q, profile] = await Promise.all([fetchQuote({ shareToken: token }), getBusinessProfile()]);
  if (!q) return null;
  return {
    view: buildView(q, profile),
    quote: {
      id: q.id,
      number: q.number,
      status: q.status,
      shareToken: q.shareToken,
      clientEmail: q.client.email,
      clientName: q.client.name,
      invoiceId: q.invoice?.id ?? null,
      invoiceNumber: q.invoice?.number ?? null,
    },
  };
}
