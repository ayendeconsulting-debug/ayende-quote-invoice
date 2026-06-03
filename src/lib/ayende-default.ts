// Single source of truth for the "Ayende Default" template + the seeded catalog.
// Pure data (no server/prisma imports) so the editor (client), the loaders (server),
// and the seed/reseed scripts can all import it.
//
// Rate: the KSQ "friend rate" of $40/hr is pre-filled on hours-based lines (Scope + phases).
// Discount is intentionally left blank — set it per quote.
//
// IMPORTANT — avoiding a double-count: Scope (hours × $40) and the Investment phases bill the
// SAME work. The template therefore prices via Scope only and OMITS the phase section, so the
// payable total isn't counted twice. The phase items still ship in the catalog (at $40/hr) for
// anyone who prefers to quote by phase instead.

import type { SectionKind } from "./quote-template";

const RATE = 40; // KSQ friend rate, $40/hr

export interface PresetItem {
  description: string;
  detail?: string;
  hours?: number;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
}
export interface PresetSection {
  kind: SectionKind;
  title: string;
  items: PresetItem[];
}

const SCOPE: PresetSection = {
  kind: "SCOPE",
  title: "Scope of Work",
  items: [
    { description: "Project Setup & Infrastructure", detail: "Repo, schema, CI/CD, Supabase, Vercel config", hours: 12, unitPrice: RATE },
    { description: "Public Website", detail: "All public pages: Home, Enroll, Location, FAQs, Downloads, Contact", hours: 20, unitPrice: RATE },
    { description: "Staff Authentication", detail: "Login, TOTP 2FA, password reset, staff invite, route guards", hours: 15, unitPrice: RATE },
    { description: "Custom In-App Booking Engine", detail: "Availability config, slot generator, booking UI, double-booking lock", hours: 30, unitPrice: RATE },
    { description: "Admin: Applications", detail: "Application queue, detail view, status management, bulk actions", hours: 28, unitPrice: RATE },
    { description: "Admin: Documents", detail: "Officer upload, inline viewer, review queue, version history", hours: 18, unitPrice: RATE },
    { description: "Admin: Appointments & Check-In", detail: "Calendar view, check-in flow, reschedule, NIN issuance", hours: 22, unitPrice: RATE },
    { description: "Email System", detail: "10 branded templates, Resend integration, reminder cron job", hours: 18, unitPrice: RATE },
    { description: "Reporting & Analytics", detail: "5 metric dashboards, officer stats, 6 export formats", hours: 26, unitPrice: RATE },
    { description: "Staff Management & Settings", detail: "Staff accounts, system config, availability editor, fee settings", hours: 15, unitPrice: RATE },
    { description: "Security Hardening", detail: "Rate limiting, AES-256 PII encryption, CSP headers, input validation", hours: 8, unitPrice: RATE },
    { description: "QA, UAT & Launch", detail: "E2E tests, WCAG audit, UAT sessions, DNS cutover, runbook", hours: 20, unitPrice: RATE },
  ],
};

const INVESTMENT: PresetSection = {
  kind: "INVESTMENT",
  title: "Development Investment",
  items: [
    { description: "Phase 1 — Foundation", detail: "Modules 1, 2, 3", hours: 47, unitPrice: RATE },
    { description: "Phase 2 — Custom Booking Engine", detail: "Module 4", hours: 30, unitPrice: RATE },
    { description: "Phase 3 — Admin Core Operations", detail: "Modules 5, 6, 7", hours: 68, unitPrice: RATE },
    { description: "Phase 4 — Email & Communications", detail: "Module 8", hours: 18, unitPrice: RATE },
    { description: "Phase 5 — Reporting & Management", detail: "Modules 9, 10", hours: 41, unitPrice: RATE },
    { description: "Phase 6 — Security & Launch", detail: "Modules 11, 12", hours: 28, unitPrice: RATE },
  ],
};

const INFRASTRUCTURE: PresetSection = {
  kind: "INFRASTRUCTURE",
  title: "Infrastructure & Hosting",
  items: [
    { description: "Vercel", detail: "Hosting, API, cron jobs · Hobby (Free)", unit: "mo", unitPrice: 0 },
    { description: "Supabase", detail: "Database + file storage · Free tier", unit: "mo", unitPrice: 0 },
    { description: "Resend", detail: "Transactional email · Free (3,000/mo)", unit: "mo", unitPrice: 0 },
    { description: "Upstash", detail: "Rate limiting (Redis) · Free (10,000 req/day)", unit: "mo", unitPrice: 0 },
    { description: "Cloudflare", detail: "DNS + DDoS protection · Free", unit: "mo", unitPrice: 0 },
    { description: "Zoho Mail", detail: "Staff email · Free (up to 5 users)", unit: "mo", unitPrice: 0 },
    { description: "GitHub", detail: "Source code + CI/CD · Free", unit: "mo", unitPrice: 0 },
    { description: "Sentry", detail: "Error monitoring · Free (5,000 err/mo)", unit: "mo", unitPrice: 0 },
    { description: "Domain renewal", detail: "Annual ÷ 12", unit: "mo", unitPrice: 1.5 },
  ],
};

const INCLUDED: PresetSection = {
  kind: "INCLUDED",
  title: "What's Included",
  items: [
    { description: "Full source code (GitHub repository transferred at launch)" },
    { description: "All environment credentials and API keys documented" },
    { description: "Deployment pipeline (Vercel + Supabase + GitHub Actions)" },
    { description: "Custom in-app booking engine — no third-party dependency" },
    { description: "10 branded HTML email templates" },
    { description: "Automated appointment reminder cron jobs" },
    { description: "Reporting dashboard with 5 metric categories" },
    { description: "6 CSV/XLSX export report types" },
    { description: "Staff management (invite, roles, 2FA)" },
    { description: "AES-256 PII field encryption" },
    { description: "WCAG 2.1 AA accessibility compliance (public pages)" },
    { description: "2 UAT sessions with center staff" },
    { description: "Runbook: deployment steps, env vars, upgrade triggers" },
    { description: "2 weeks post-launch bug-fix support" },
  ],
};

const EXCLUDED: PresetSection = {
  kind: "EXCLUDED",
  title: "Not Included",
  items: [
    { description: "Online payment processing (Stripe) — receipt-only in v1.0" },
    { description: "SMS notifications (Twilio)" },
    { description: "Multi-language support (Yoruba, Igbo, Hausa)" },
    { description: "Multi-location / tenant architecture" },
    { description: "Mobile application (iOS / Android)" },
    { description: "Ongoing maintenance after 2-week support window" },
    { description: "Content updates after launch (FAQ edits, fee changes)" },
    { description: "NIMC legal / compliance advisory review" },
  ],
};

const TCO: PresetSection = {
  kind: "TCO",
  title: "Three-Year Cost of Ownership",
  items: [
    { description: "Domain renewal (ksqbrampton.ca)", detail: "Per year", unit: "yr", unitPrice: 18 },
    { description: "All hosting & services", detail: "Free-tier", unit: "yr", unitPrice: 0 },
  ],
};

/** Everything — used to seed the catalog (the full reusable library, phases included). */
const ALL_SECTIONS: PresetSection[] = [SCOPE, INVESTMENT, INFRASTRUCTURE, INCLUDED, EXCLUDED, TCO];

/**
 * The "Ayende Default" one-click template. Prices via Scope; the phase section is omitted
 * here to avoid double-counting the same work (phases remain available in the catalog).
 */
export const AYENDE_DEFAULT_PRESET: PresetSection[] = [SCOPE, INFRASTRUCTURE, INCLUDED, EXCLUDED, TCO];

/** Flattened rows for seeding/reseeding CatalogItem (includes the phase items). */
export const AYENDE_DEFAULT_CATALOG = ALL_SECTIONS.flatMap((section) =>
  section.items.map((it, i) => ({
    sectionKind: section.kind,
    description: it.description,
    detail: it.detail ?? null,
    hours: it.hours ?? null,
    quantity: it.quantity ?? 1,
    unit: it.unit ?? null,
    unitPrice: it.unitPrice ?? 0,
    sortOrder: i,
  })),
);
