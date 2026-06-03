import "server-only";
import { prisma } from "@/lib/prisma";

type Kind = "QUOTE" | "INVOICE";

/**
 * Generate the next document number for a given kind, e.g. "AYC-Q-2026-001".
 * Uses an atomic upsert + increment on DocumentCounter so concurrent
 * requests never collide on the same sequence value.
 */
export async function nextDocumentNumber(kind: Kind, prefix: string): Promise<string> {
  const year = new Date().getFullYear();

  const counter = await prisma.documentCounter.upsert({
    where: { kind_year: { kind, year } },
    create: { kind, year, seq: 1 },
    update: { seq: { increment: 1 } },
  });

  const padded = String(counter.seq).padStart(3, "0");
  return `${prefix}-${year}-${padded}`;
}
