// Replaces ALL catalog items with the current Ayende Default set.
// Use this to pick up changes to the default catalog (e.g. the $40/hr rate).
// WARNING: this discards manual catalog edits — it's a clean reset, not a merge.

import { PrismaClient } from "@prisma/client";
import { AYENDE_DEFAULT_CATALOG } from "../src/lib/ayende-default";

const prisma = new PrismaClient();

async function main() {
  const removed = await prisma.catalogItem.deleteMany({});
  await prisma.catalogItem.createMany({ data: AYENDE_DEFAULT_CATALOG });
  console.log(`Removed ${removed.count} item(s); reseeded ${AYENDE_DEFAULT_CATALOG.length} Ayende Default catalog items.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
