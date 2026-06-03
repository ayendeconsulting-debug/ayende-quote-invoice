import "server-only";
import React from "react";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { sectionMeta } from "@/lib/quote-template";
import type { QuoteView } from "@/components/quote-preview";
import {
  ensureFonts,
  C,
  money,
  styles,
  Letterhead,
  Parties,
  PricedTable,
  Mark,
  type PdfLine,
} from "./base";

function Checklist({ items, kind }: { items: PdfLine[]; kind: string }) {
  const included = kind === "INCLUDED";
  return (
    <View>
      {items.map((it, i) => (
        <View key={i} style={styles.checkRow} wrap={false}>
          <View style={styles.checkMark}>
            <Mark included={included} />
          </View>
          <Text style={styles.checkText}>
            {it.description || "—"}
            {it.detail ? <Text style={{ color: C.muted }}> — {it.detail}</Text> : null}
          </Text>
        </View>
      ))}
    </View>
  );
}

function AcceptanceBlock({ view }: { view: QuoteView }) {
  if (view.status === "ACCEPTED") {
    return (
      <View style={styles.acceptBox} wrap={false}>
        <Text style={styles.acceptHead}>Accepted</Text>
        <Text style={{ fontSize: 9.5 }}>
          {view.acceptedByName ? `Accepted by ${view.acceptedByName}` : "Marked as accepted"}
          {view.acceptedByEmail ? ` (${view.acceptedByEmail})` : ""}
          {view.acceptedAt ? ` on ${view.acceptedAt}` : ""}.
        </Text>
      </View>
    );
  }
  if (view.status === "DECLINED") {
    return (
      <View style={styles.acceptBox} wrap={false}>
        <Text style={styles.acceptHead}>Declined</Text>
        <Text style={{ fontSize: 9.5 }}>This quote was declined{view.declinedAt ? ` on ${view.declinedAt}` : ""}.</Text>
        {view.declineReason ? <Text style={styles.notesText}>Reason: {view.declineReason}</Text> : null}
      </View>
    );
  }
  return (
    <View style={styles.acceptBox} wrap={false}>
      <Text style={styles.acceptHead}>Acceptance</Text>
      <Text style={{ fontSize: 9, color: C.ink500 }}>
        To accept this quote, sign below or accept online via the secure link provided.
      </Text>
      <View style={styles.sigRow}>
        <View style={styles.sigCell}>
          <View style={styles.sigLine}><Text style={styles.sigLabel}>Authorized signature</Text></View>
        </View>
        <View style={styles.sigCell}>
          <View style={styles.sigLine}><Text style={styles.sigLabel}>Name & date</Text></View>
        </View>
      </View>
    </View>
  );
}

function QuoteDocument({ view }: { view: QuoteView }) {
  const c = view.currency;
  const discountLabel =
    view.discountType === "PERCENT"
      ? `Discount (${Number(view.discountValue)}%)`
      : view.discountType === "FIXED"
        ? "Discount"
        : null;

  return (
    <Document title={view.number ?? "Quote"} author={view.businessName}>
      <Page size="A4" style={styles.page}>
        <Letterhead
          docWord="QUOTE"
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
            ...(view.validUntil ? [{ label: "Valid until", value: view.validUntil }] : []),
            { value: `${c} · ${view.template === "DETAILED" ? "Detailed" : "Simple"}` },
          ]}
        />

        {view.title ? <Text style={styles.title}>{view.title}</Text> : null}
        {view.introText ? <Text style={styles.intro}>{view.introText}</Text> : null}

        {view.sections.map((s, i) => {
          if (s.items.length === 0) return null;
          const meta = sectionMeta(s.kind);
          return (
            <View key={i} style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{s.title}</Text>
                {meta.informational ? <Text style={styles.projection}>Projection — not in total</Text> : null}
              </View>
              {meta.priced ? <PricedTable items={s.items} currency={c} /> : <Checklist items={s.items} kind={s.kind} />}
            </View>
          );
        })}

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
            {view.tcoTotal !== undefined ? (
              <View style={styles.subtleLine}>
                <Text style={styles.subtleText}>3-yr cost of ownership (projection)</Text>
                <Text style={styles.subtleText}>{money(view.tcoTotal, c)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {view.notes ? (
          <View style={styles.block} wrap={false}>
            <Text style={styles.eyebrow}>Notes & terms</Text>
            <Text style={styles.notesText}>{view.notes}</Text>
          </View>
        ) : null}

        <AcceptanceBlock view={view} />

        <Text style={styles.footer} fixed>{view.businessName} · {view.number ?? ""}</Text>
      </Page>
    </Document>
  );
}

/** Render a quote to a PDF Buffer. Server-only. */
export async function renderQuotePdf(view: QuoteView): Promise<Buffer> {
  ensureFonts();
  return renderToBuffer(<QuoteDocument view={view} />);
}
