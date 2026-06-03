import "server-only";
import { prisma } from "@/lib/prisma";

/** Return the single business profile row, creating it with schema defaults if absent. */
export async function getBusinessProfile() {
  const existing = await prisma.businessProfile.findFirst();
  if (existing) return existing;
  return prisma.businessProfile.create({ data: {} });
}
