// Isomorphic (client + server safe) configuration for quote sections.
// No server-only imports here — the editor, the live preview, and the
// server actions all import this so totals math stays identical everywhere.

export type SectionKind =
  | "SCOPE"
  | "INVESTMENT"
  | "INFRASTRUCTURE"
  | "INCLUDED"
  | "EXCLUDED"
  | "TCO"
  | "GENERIC";

export interface SectionMeta {
  label: string;
  /** Priced sections show qty/hours/price/amount columns. */
  priced: boolean;
  /** Informational priced sections (e.g. TCO) show amounts but DO NOT add to the payable total. */
  informational?: boolean;
  /** Whether the "hours" column is offered by default for new rows. */
  allowHours?: boolean;
  hint?: string;
}

export const SECTION_META: Record<SectionKind, SectionMeta> = {
  SCOPE: {
    label: "Scope of Work",
    priced: true,
    allowHours: true,
    hint: "Modules / deliverables. Fill Hours to price a line as hours × rate (KSQ style), or leave blank to use Qty × unit price.",
  },
  INVESTMENT: {
    label: "Investment",
    priced: true,
    hint: "Phased or packaged pricing.",
  },
  INFRASTRUCTURE: {
    label: "Infrastructure & Hosting",
    priced: true,
    hint: "Recurring or one-off infrastructure costs.",
  },
  INCLUDED: {
    label: "What's Included",
    priced: false,
    hint: "Bullet list of what the engagement covers. Not priced.",
  },
  EXCLUDED: {
    label: "Not Included",
    priced: false,
    hint: "Bullet list of what falls outside scope. Not priced.",
  },
  TCO: {
    label: "3-Year Cost of Ownership",
    priced: true,
    informational: true,
    hint: "Projection only — shown to the client but excluded from the quote total.",
  },
  GENERIC: {
    label: "Section",
    priced: true,
  },
};

export const SECTION_KINDS = Object.keys(SECTION_META) as SectionKind[];

export function sectionMeta(kind: string): SectionMeta {
  return SECTION_META[kind as SectionKind] ?? SECTION_META.GENERIC;
}

/** A section's line items count toward the payable total unless it's unpriced or informational. */
export function contributesToTotal(kind: string): boolean {
  const m = sectionMeta(kind);
  return m.priced && !m.informational;
}

/** Section skeleton pre-loaded when a Detailed (KSQ-style) quote is created. TCO is added on demand. */
export const DETAILED_SKELETON: { kind: SectionKind; title: string }[] = [
  { kind: "SCOPE", title: "Scope of Work" },
  { kind: "INVESTMENT", title: "Investment" },
  { kind: "INFRASTRUCTURE", title: "Infrastructure & Hosting" },
  { kind: "INCLUDED", title: "What's Included" },
  { kind: "EXCLUDED", title: "Not Included" },
];
