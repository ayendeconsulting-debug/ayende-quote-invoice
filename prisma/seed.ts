import { PrismaClient } from "@prisma/client";
import { AYENDE_DEFAULT_CATALOG } from "../src/lib/ayende-default";

const prisma = new PrismaClient();

async function main() {
  const existingProfile = await prisma.businessProfile.findFirst();
  if (existingProfile) {
    console.log("Business profile already exists — skipping profile seed.");
  } else {
    await prisma.businessProfile.create({
      data: {
        businessName: "Ayende Consulting Inc.",
        country: "Canada",
        province: "Ontario",
        city: "Toronto",
        defaultCurrency: "CAD",
        defaultTaxRate: 13,
        taxLabel: "HST",
        quotePrefix: "AYC-Q",
        invoicePrefix: "AYC-INV",
        accentColor: "#E07B39",
      },
    });
    console.log("Seeded Ayende Consulting business profile.");
  }

  // Catalog: seed the KSQ reusable items only if the catalog is empty, so re-running
  // the seed never duplicates rows or clobbers items the user has since edited/added.
  const catalogCount = await prisma.catalogItem.count();
  if (catalogCount === 0) {
    await prisma.catalogItem.createMany({ data: AYENDE_DEFAULT_CATALOG });
    console.log(`Seeded ${AYENDE_DEFAULT_CATALOG.length} catalog items (Ayende Default).`);
  } else {
    console.log(`Catalog already has ${catalogCount} item(s) — skipping catalog seed. Run npm run db:reseed to refresh defaults.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
