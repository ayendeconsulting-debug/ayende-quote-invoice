import "server-only";
import React from "react";
import { Document, Page, View, Text, renderToBuffer } from "@react-pdf/renderer";
import { ensureFonts, C, money, styles, Letterhead, Parties } from "./base";
import type { ReceiptView } from "@/lib/receipts";

function ReceiptDocument({ view }: { view: ReceiptView }) {
  const c = view.currency;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Letterhead
          docWord="RECEIPT"
          number={view.invoiceNumber}
          status={view.paidInFull ? "PAID" : "PARTIALLY_PAID"}
          businessName={view.businessName}
          businessAddressLines={view.businessAddressLines}
          businessEmail={view.businessEmail}
          businessPhone={view.businessPhone}
          businessWebsite={view.businessWebsite}
          taxNumberLine={view.taxNumberLine}
        />

        <Parties
          clientName={view.clientName}
          clientCompany={view.clientCompany}
          clientAddressLines={view.clientAddressLines}
          clientEmail={view.clientEmail}
          meta={[
            { label: "Receipt for", value: view.invoiceNumber },
            { label: "Payment date", value: view.paymentDatePretty },
          ]}
        />

        {/* Payment received box */}
        <View style={styles.payBox}>
          <Text style={styles.payHead}>Payment received</Text>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Date</Text>
            <Text style={styles.totalVal}>{view.paymentDatePretty}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Method</Text>
            <Text style={styles.totalVal}>{view.paymentMethod}</Text>
          </View>
          {view.paymentReference ? (
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Reference</Text>
              <Text style={styles.totalVal}>{view.paymentReference}</Text>
            </View>
          ) : null}
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Amount received</Text>
            <Text style={styles.grandVal}>{money(view.paymentAmount, c)}</Text>
          </View>
        </View>

        {/* Reconciliation */}
        <View style={styles.totalsWrap}>
          <View style={styles.totals}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Invoice total</Text>
              <Text style={styles.totalVal}>{money(view.invoiceTotal, c)}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Total paid to date</Text>
              <Text style={styles.totalVal}>{money(view.totalPaidToDate, c)}</Text>
            </View>
            {view.creditBalance > 0 ? (
              <View style={styles.grandRow}>
                <Text style={styles.grandLabel}>Credit balance</Text>
                <Text style={styles.grandVal}>{money(view.creditBalance, c)}</Text>
              </View>
            ) : (
              <View style={styles.grandRow}>
                <Text style={[styles.grandLabel, view.paidInFull ? { color: C.teal } : {}]}>
                  {view.paidInFull ? "Paid in full" : "Balance remaining"}
                </Text>
                <Text style={[styles.grandVal, view.paidInFull ? { color: C.teal } : {}]}>
                  {money(view.balanceRemaining, c)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.notesText}>
            {view.paidInFull
              ? `Thank you — this payment settles ${view.invoiceNumber} in full.`
              : `Thank you. This receipt acknowledges your payment toward ${view.invoiceNumber}. A balance of ${money(view.balanceRemaining, c)} remains outstanding.`}
          </Text>
        </View>

        <Text style={styles.footer}>{view.businessName} · Payment receipt for {view.invoiceNumber}</Text>
      </Page>
    </Document>
  );
}

export async function renderReceiptPdf(view: ReceiptView): Promise<Buffer> {
  await ensureFonts();
  return renderToBuffer(<ReceiptDocument view={view} />);
}
