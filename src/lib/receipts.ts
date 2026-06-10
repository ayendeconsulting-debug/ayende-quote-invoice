import "server-only";
import { prisma } from "@/lib/prisma";
import { getBusinessProfile } from "@/lib/profile";
import { round2, type Currency } from "@/lib/money";

const METHOD_LABEL: Record<string, string> = {
  ETRANSFER: "e-Transfer",
  BANK_TRANSFER: "Bank transfer",
  CASH: "Cash",
};

export interface ReceiptView {
  businessName: string;
  businessAddressLines: string[];
  businessEmail?: string | null;
  businessPhone?: string | null;
  businessWebsite?: string | null;
  taxNumberLine?: string | null;

  clientName: string;
  clientCompany?: string | null;
  clientAddressLines: string[];
  clientEmail?: string | null;

  invoiceNumber: string;
  currency: Currency;

  paymentDatePretty: string;
  paymentMethod: string;
  paymentReference?: string | null;
  paymentAmount: number;

  invoiceTotal: number;
  totalPaidToDate: number;
  balanceRemaining: number;
  creditBalance: number;
  paidInFull: boolean;
}

function lines(...parts: (string | null | undefined)[]): string[] {
  return parts.map((p) => (p ?? "").trim()).filter((p) => p.length > 0);
}

/** Build the view for a single payment's receipt, with running reconciliation. */
export async function buildReceiptView(paymentId: string): Promise<{ view: ReceiptView; clientEmail: string | null } | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: { include: { client: true, payments: { select: { amount: true } } } },
    },
  });
  if (!payment) return null;

  const inv = payment.invoice;
  const profile = await getBusinessProfile();

  const totalPaid = round2(
    inv.payments.reduce((sum: number, p: (typeof inv.payments)[number]) => sum + Number(p.amount), 0)
  );
  const total = round2(Number(inv.total));
  const balanceRemaining = round2(Math.max(total - totalPaid, 0));
  const creditBalance = round2(Math.max(totalPaid - total, 0));

  const view: ReceiptView = {
    businessName: profile.businessName,
    businessAddressLines: lines(
      profile.addressLine1,
      profile.addressLine2,
      lines(profile.city, profile.province).join(", ") + (profile.postalCode ? `  ${profile.postalCode}` : ""),
      profile.country
    ),
    businessEmail: profile.email,
    businessPhone: profile.phone,
    businessWebsite: profile.website,
    taxNumberLine: inv.taxEnabled && profile.taxNumber ? `${profile.taxLabel} No. ${profile.taxNumber}` : null,

    clientName: inv.client.name,
    clientCompany: inv.client.company,
    clientAddressLines: lines(
      inv.client.addressLine1,
      inv.client.addressLine2,
      lines(inv.client.city, inv.client.province).join(", ") + (inv.client.postalCode ? `  ${inv.client.postalCode}` : ""),
      inv.client.country
    ),
    clientEmail: inv.client.email,

    invoiceNumber: inv.number,
    currency: inv.currency as Currency,

    paymentDatePretty: new Date(payment.date).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }),
    paymentMethod: METHOD_LABEL[payment.method] ?? payment.method,
    paymentReference: payment.reference,
    paymentAmount: round2(Number(payment.amount)),

    invoiceTotal: total,
    totalPaidToDate: totalPaid,
    balanceRemaining,
    creditBalance,
    paidInFull: total > 0 && totalPaid >= total,
  };

  return { view, clientEmail: inv.client.email };
}
