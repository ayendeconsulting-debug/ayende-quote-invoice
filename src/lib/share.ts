import "server-only";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/** Base URL for public links. Falls back to localhost for dev. */
export function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/** Public share URL for a given token. */
export function shareUrl(token: string): string {
  return `${appBaseUrl()}/q/${token}`;
}

/** Generate a URL-safe random share token. */
export function newShareToken(): string {
  return randomBytes(18).toString("base64url");
}

/**
 * Flip any SENT quotes whose validUntil has passed to EXPIRED so list filters
 * and badges stay truthful. Cheap; safe to call on every list/detail load.
 * (validUntil = null is never matched by `lt`, so undated quotes never expire.)
 */
export async function expireOverdueQuotes(): Promise<void> {
  try {
    await prisma.quote.updateMany({
      where: { status: "SENT", validUntil: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });
  } catch {
    // Non-fatal (e.g. DB cold start); the next load retries.
  }
}

/**
 * Flip any SENT invoices whose dueDate has passed to OVERDUE. (Partially-paid
 * handling arrives with payments in Phase 7.) Safe to call on every load.
 */
export async function markOverdueInvoices(): Promise<void> {
  try {
    await prisma.invoice.updateMany({
      where: { status: "SENT", dueDate: { lt: new Date() } },
      data: { status: "OVERDUE" },
    });
  } catch {
    // Non-fatal.
  }
}
