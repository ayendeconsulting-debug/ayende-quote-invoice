import "server-only";
import path from "path";
import React from "react";
import { Text, View, Font, StyleSheet, Svg, Path } from "@react-pdf/renderer";
import { formatMoney, type Currency } from "@/lib/money";

// ---------------------------------------------------------------------------
// Fonts — bundled TTFs registered from disk (no runtime network fetch).
// Idempotent so repeated renders don't re-register.
// ---------------------------------------------------------------------------
let fontsRegistered = false;
export function ensureFonts() {
  if (fontsRegistered) return;
  const dir = path.join(process.cwd(), "src", "lib", "pdf", "fonts");
  try {
    Font.register({ family: "Fraunces", src: path.join(dir, "Fraunces.ttf") });
    Font.register({ family: "Hanken", src: path.join(dir, "HankenGrotesk.ttf") });
    Font.registerHyphenationCallback((word) => [word]);
  } catch {
    // Falls back to Helvetica/Times if the files are missing.
  }
  fontsRegistered = true;
}

// Brand palette (kept in sync with src/app/globals.css @theme).
export const C = {
  ink: "#0d1b2a",
  ink500: "#3a4d61",
  ink300: "#7e8c9a",
  accent: "#e07b39",
  accent600: "#c4641f",
  line: "#e4e0d8",
  muted: "#6b7280",
  teal: "#0f6e56",
  amber: "#b45309",
  rose: "#b3261e",
  paper: "#f7f5f0",
};

export function money(n: number, c: Currency) {
  return formatMoney(n, c);
}

export const BADGE_COLORS: Record<string, { bg: string; fg: string }> = {
  DRAFT: { bg: "#eceae4", fg: C.ink500 },
  SENT: { bg: "#faece1", fg: C.accent600 },
  ACCEPTED: { bg: "#e7f4ef", fg: C.teal },
  DECLINED: { bg: "#fdecea", fg: C.rose },
  EXPIRED: { bg: "#fdf3e7", fg: C.amber },
  PARTIALLY_PAID: { bg: "#fdf3e7", fg: C.amber },
  PAID: { bg: "#e7f4ef", fg: C.teal },
  OVERDUE: { bg: "#fdecea", fg: C.rose },
};
export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

export interface PdfLine {
  description: string;
  detail?: string | null;
  hours?: number | null;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  amount: number;
}

export const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontFamily: "Hanken",
    fontSize: 9.5,
    color: C.ink,
    lineHeight: 1.4,
  },
  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingBottom: 14,
  },
  bizName: { fontFamily: "Fraunces", fontSize: 16, color: C.ink, lineHeight: 1.2 },
  bizMeta: { fontSize: 8, color: C.muted, marginTop: 3 },
  docWord: { fontFamily: "Fraunces", fontSize: 20, color: C.accent600, textAlign: "right", lineHeight: 1.15 },
  docNum: { fontSize: 10, color: C.ink500, marginTop: 4, textAlign: "right" },
  badge: { marginTop: 4, alignSelf: "flex-end", borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7, fontSize: 8 },
  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  eyebrow: { fontSize: 7.5, letterSpacing: 0.6, color: C.muted, textTransform: "uppercase" },
  partyName: { fontSize: 11, marginTop: 2 },
  partySub: { fontSize: 8.5, color: C.ink500 },
  partyMeta: { fontSize: 8, color: C.muted },
  metaRight: { textAlign: "right", fontSize: 9 },
  title: { fontFamily: "Fraunces", fontSize: 17, marginTop: 22 },
  intro: { fontSize: 9.5, color: C.ink500, marginTop: 4 },
  section: { marginTop: 18 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 5 },
  sectionTitle: { fontFamily: "Fraunces", fontSize: 11.5, color: C.ink },
  projection: { fontSize: 7.5, letterSpacing: 0.5, color: C.ink300, textTransform: "uppercase" },
  thead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 4 },
  th: { fontSize: 7.5, letterSpacing: 0.5, color: C.muted, textTransform: "uppercase" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 5, alignItems: "flex-start" },
  cDesc: { flex: 1, paddingRight: 8 },
  cQty: { width: 70, textAlign: "right" },
  cRate: { width: 80, textAlign: "right" },
  cAmt: { width: 80, textAlign: "right" },
  lineDesc: { fontSize: 9.5, color: C.ink },
  lineDetail: { fontSize: 8, color: C.muted, marginTop: 1 },
  num: { fontSize: 9, color: C.ink500 },
  numInk: { fontSize: 9, color: C.ink },
  checkRow: { flexDirection: "row", marginBottom: 3, alignItems: "flex-start" },
  checkMark: { width: 12 },
  checkText: { flex: 1, fontSize: 9.5 },
  totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 18 },
  totals: { width: 240 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  totalLabel: { fontSize: 9, color: C.muted },
  totalVal: { fontSize: 9 },
  grandRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.line, paddingTop: 5, marginTop: 3 },
  grandLabel: { fontFamily: "Fraunces", fontSize: 13 },
  grandVal: { fontFamily: "Fraunces", fontSize: 13, color: C.accent600 },
  subtleLine: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  subtleText: { fontSize: 8, color: C.ink300 },
  block: { marginTop: 20, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 },
  notesText: { fontSize: 9, color: C.ink500, marginTop: 3 },
  payBox: { marginTop: 14, borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 12, backgroundColor: C.paper },
  payHead: { fontFamily: "Fraunces", fontSize: 11, marginBottom: 6 },
  acceptBox: { marginTop: 14, borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 12, backgroundColor: C.paper },
  acceptHead: { fontFamily: "Fraunces", fontSize: 11, marginBottom: 6 },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 22 },
  sigCell: { width: "47%" },
  sigLine: { borderTopWidth: 1, borderTopColor: C.ink300, paddingTop: 3 },
  sigLabel: { fontSize: 7.5, letterSpacing: 0.5, color: C.muted, textTransform: "uppercase" },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, textAlign: "center", fontSize: 7.5, color: C.ink300 },
});

export function Letterhead({
  docWord,
  number,
  status,
  businessName,
  businessAddressLines,
  businessEmail,
  businessPhone,
  businessWebsite,
  taxNumberLine,
}: {
  docWord: string;
  number?: string | null;
  status: string;
  businessName: string;
  businessAddressLines: string[];
  businessEmail?: string | null;
  businessPhone?: string | null;
  businessWebsite?: string | null;
  taxNumberLine?: string | null;
}) {
  const badge = BADGE_COLORS[status] ?? BADGE_COLORS.DRAFT;
  return (
    <View style={styles.headRow}>
      <View>
        <Text style={styles.bizName}>{businessName}</Text>
        {businessAddressLines.map((l, i) => (
          <Text key={i} style={styles.bizMeta}>{l}</Text>
        ))}
        <Text style={styles.bizMeta}>
          {[businessEmail, businessPhone, businessWebsite].filter(Boolean).join("   ·   ")}
        </Text>
        {taxNumberLine ? <Text style={styles.bizMeta}>{taxNumberLine}</Text> : null}
      </View>
      <View>
        <Text style={styles.docWord}>{docWord}</Text>
        <Text style={styles.docNum}>{number ?? "—"}</Text>
        <Text style={[styles.badge, { backgroundColor: badge.bg, color: badge.fg }]}>
          {STATUS_LABEL[status] ?? status}
        </Text>
      </View>
    </View>
  );
}

export function Parties({
  clientName,
  clientCompany,
  clientAddressLines,
  clientEmail,
  meta,
}: {
  clientName: string;
  clientCompany?: string | null;
  clientAddressLines: string[];
  clientEmail?: string | null;
  meta: { label?: string; value: string }[];
}) {
  return (
    <View style={styles.partiesRow}>
      <View>
        <Text style={styles.eyebrow}>Billed to</Text>
        <Text style={styles.partyName}>{clientName || "—"}</Text>
        {clientCompany ? <Text style={styles.partySub}>{clientCompany}</Text> : null}
        {clientAddressLines.map((l, i) => (
          <Text key={i} style={styles.partyMeta}>{l}</Text>
        ))}
        {clientEmail ? <Text style={styles.partyMeta}>{clientEmail}</Text> : null}
      </View>
      <View style={styles.metaRight}>
        {meta.map((m, i) => (
          <Text key={i}>
            {m.label ? <Text style={{ color: C.muted }}>{m.label} </Text> : null}
            {m.value}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function PricedTable({ items, currency }: { items: PdfLine[]; currency: Currency }) {
  return (
    <View>
      <View style={styles.thead}>
        <Text style={[styles.th, styles.cDesc]}>Description</Text>
        <Text style={[styles.th, styles.cQty]}>Hrs / Qty</Text>
        <Text style={[styles.th, styles.cRate]}>Rate</Text>
        <Text style={[styles.th, styles.cAmt]}>Amount</Text>
      </View>
      {items.map((it, i) => {
        const usesHours = it.hours !== null && it.hours !== undefined;
        return (
          <View key={i} style={styles.row} wrap={false}>
            <View style={styles.cDesc}>
              <Text style={styles.lineDesc}>{it.description || "—"}</Text>
              {it.detail ? <Text style={styles.lineDetail}>{it.detail}</Text> : null}
            </View>
            <Text style={[styles.num, styles.cQty]}>
              {usesHours ? `${Number(it.hours)} hrs` : `${Number(it.quantity)}${it.unit ? ` ${it.unit}` : ""}`}
            </Text>
            <Text style={[styles.num, styles.cRate]}>{money(it.unitPrice, currency)}</Text>
            <Text style={[styles.numInk, styles.cAmt]}>{money(it.amount, currency)}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function Mark({ included }: { included: boolean }) {
  return (
    <Svg width={9} height={9} viewBox="0 0 12 12" style={{ marginTop: 1.5 }}>
      {included ? (
        <Path d="M2.5 6.5 L5 9 L9.5 3.5" stroke={C.teal} strokeWidth={1.6} fill="none" />
      ) : (
        <Path d="M3 3 L9 9 M9 3 L3 9" stroke={C.rose} strokeWidth={1.6} fill="none" />
      )}
    </Svg>
  );
}
