"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getBusinessProfile } from "@/lib/profile";

export type SettingsState = { ok?: boolean; error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function orNull(v: string): string | null {
  return v.length ? v : null;
}

export async function updateProfile(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const profile = await getBusinessProfile();

  const businessName = str(formData, "businessName");
  if (!businessName) return { error: "Business name is required." };

  const currency = str(formData, "defaultCurrency");
  if (currency !== "CAD" && currency !== "USD") return { error: "Currency must be CAD or USD." };

  const taxRateRaw = str(formData, "defaultTaxRate");
  const taxRate = Number(taxRateRaw);
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    return { error: "Tax rate must be a number between 0 and 100." };
  }

  const accentColor = str(formData, "accentColor") || "#E07B39";
  if (!/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    return { error: "Accent colour must be a 6-digit hex value like #E07B39." };
  }

  try {
    await prisma.businessProfile.update({
      where: { id: profile.id },
      data: {
        businessName,
        addressLine1: orNull(str(formData, "addressLine1")),
        addressLine2: orNull(str(formData, "addressLine2")),
        city: orNull(str(formData, "city")),
        province: orNull(str(formData, "province")),
        postalCode: orNull(str(formData, "postalCode")),
        country: orNull(str(formData, "country")) ?? "Canada",
        email: orNull(str(formData, "email")),
        phone: orNull(str(formData, "phone")),
        website: orNull(str(formData, "website")),
        logoUrl: orNull(str(formData, "logoUrl")),
        etransferEmail: orNull(str(formData, "etransferEmail")),
        bankDetails: orNull(str(formData, "bankDetails")),
        defaultCurrency: currency,
        defaultTaxRate: taxRate,
        taxLabel: orNull(str(formData, "taxLabel")) ?? "HST",
        quotePrefix: orNull(str(formData, "quotePrefix")) ?? "AYC-Q",
        invoicePrefix: orNull(str(formData, "invoicePrefix")) ?? "AYC-INV",
        accentColor,
      },
    });
  } catch {
    return { error: "Could not save. Is the database connected (DATABASE_URL set)?" };
  }

  revalidatePath("/settings");
  return { ok: true };
}
