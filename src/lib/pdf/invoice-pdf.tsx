import "server-only";
import React from "react";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { InvoiceView } from "@/components/invoice-preview";
import { ensureFonts, C, money, styles, Letterhead, Parties, PricedTable } from "./base";

function InvoiceDocument({ view }: { view: InvoiceView }) {
  const c = view.currency;
  const discountLabel =
    view.discountType === "PERCENT"
      ? `Discount (${Number(view.discountValue)}%)`
      : view.discountType === "FIXED"
        ? "Discount"
        : null;
  const showPaid = view.amountPaid > 0 || view.status === "PARTIALLY_PAID" || view.status === "PAID";

  return (
    <Document title={view.number ?? "Invoice"} author={view.businessName}>
      <Page size="A4" style={styles.page}>
        <Letterhead
          docWord="INVOICE"
          number={view.number}
          status={view.status}
          businessName={view.businessName}
          businessAddressLines={view.businessAddressLines}
          businessEmail={view.businessEmail}
          businessPhone={view.businessPhone}
          businessWebsite={view.businessWebsite}
        />
        <Parties
          clientName={view.clientName}
          clientCompany={view.clientCompany}
          clientAddressLines={view.clientAddressLines}
          clientEmail={view.clientEmail}
          meta={[
            ...(view.issueDate ? [{ label: "Issued", value: view.issueDate }] : []),
            ...(view.dueDate ? [{ label: "Due", value: view.dueDate }] : []),
            { value: c },
            ...(view.sourceQuoteNumber ? [{ label: "From quote", value: view.sourceQuoteNumber }] : []),
          ]}
        />

        {view.title ? <Text style={styles.title}>{view.title}</Text> : null}

        <View style={styles.section}>
          <PricedTable items={view.lines} currency={c} />
        </View>

        <View style={styles.totalsWrap}>
          <View style={styles.totals}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalVal}>{money(view.totals.subtotal, c)}</Text>
            </View>
            {discountLabel ? (
              <View style={styles.totalLine}>
                <Text style={[styles.totalLabel, { color: C.accent600 }]}>{discountLabel}</Text>
                <Text style={[styles.totalVal, { color: C.accent600 }]}>−{money(view.totals.discountAmount, c)}</Text>
              </View>
            ) : null}
            {view.taxEnabled ? (
              <View style={styles.totalLine}>
                <Text style={styles.totalLabel}>{view.taxLabel} ({Number(view.taxRate)}%)</Text>
                <Text style={styles.totalVal}>{money(view.totals.taxAmount, c)}</Text>
              </View>
            ) : null}
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>Total</Text>
              <Text style={styles.grandVal}>{money(view.totals.total, c)}</Text>
            </View>
            {showPaid ? (
              <>
                <View style={[styles.totalLine, { marginTop: 3 }]}>
                  <Text style={[styles.totalLabel, { color: C.teal }]}>Amount paid</Text>
                  <Text style={[styles.totalVal, { color: C.teal }]}>−{money(view.amountPaid, c)}</Text>
                </View>
                <View style={styles.grandRow}>
                  <Text style={[styles.grandLabel, { fontSize: 11 }]}>Balance due</Text>
                  <Text style={[styles.grandVal, { fontSize: 11, color: C.ink }]}>{money(view.balanceDue, c)}</Text>
                </View>
                {view.creditBalance && view.creditBalance > 0 ? (
                  <View style={[styles.totalLine, { marginTop: 2 }]}>
                    <Text style={[styles.totalLabel, { color: C.teal }]}>Credit balance</Text>
                    <Text style={[styles.totalVal, { color: C.teal }]}>{money(view.creditBalance, c)}</Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        </View>

        {view.payEtransferEmail || view.payBankDetails ? (
          <View style={styles.payBox} wrap={false}>
            <Text style={styles.payHead}>How to pay</Text>
            {view.payEtransferEmail ? (
              <Text style={{ fontSize: 9.5 }}>
                <Text style={{ color: C.muted }}>e-Transfer: </Text>{view.payEtransferEmail}
              </Text>
            ) : null}
            {view.payBankDetails ? <Text style={[styles.notesText, { marginTop: 2 }]}>{view.payBankDetails}</Text> : null}
          </View>
        ) : null}

        {view.notes ? (
          <View style={styles.block} wrap={false}>
            <Text style={styles.eyebrow}>Notes & terms</Text>
            <Text style={styles.notesText}>{view.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer} fixed>{view.businessName} · {view.number ?? ""}</Text>
      </Page>
    </Document>
  );
}

/** Render an invoice to a PDF Buffer. Server-only. */
export async function renderInvoicePdf(view: InvoiceView): Promise<Buffer> {
  ensureFonts();
  return renderToBuffer(<InvoiceDocument view={view} />);
}
