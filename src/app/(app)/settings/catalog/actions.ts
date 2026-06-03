"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SECTION_KINDS, type SectionKind } from "@/lib/quote-template";

export type CatalogState = { error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function orNull(v: string): string | null {
  return v.length ? v : null;
}
function numOrNull(v: string): number | null {
  if (!v.length) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parse(formData: FormData):
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string } {
  const sectionKind = str(formData, "sectionKind");
  if (!SECTION_KINDS.includes(sectionKind as SectionKind)) return { ok: false, error: "Pick a valid section." };

  const description = str(formData, "description");
  if (!description) return { ok: false, error: "Description is required." };

  const hours = numOrNull(str(formData, "hours"));
  if (hours !== null && hours < 0) return { ok: false, error: "Hours cannot be negative." };

  const quantityRaw = str(formData, "quantity");
  const quantity = quantityRaw.length ? Number(quantityRaw) : 1;
  if (!Number.isFinite(quantity) || quantity < 0) return { ok: false, error: "Quantity must be a non-negative number." };

  const unitPriceRaw = str(formData, "unitPrice");
  const unitPrice = unitPriceRaw.length ? Number(unitPriceRaw) : 0;
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return { ok: false, error: "Unit price must be a non-negative number." };

  const sortRaw = str(formData, "sortOrder");
  const sortOrder = sortRaw.length ? Math.trunc(Number(sortRaw)) : 0;

  return {
    ok: true,
    data: {
      sectionKind,
      description,
      detail: orNull(str(formData, "detail")),
      hours,
      quantity,
      unit: orNull(str(formData, "unit")),
      unitPrice,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    },
  };
}

export async function createCatalogItem(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  const parsed = parse(formData);
  if (!parsed.ok) return { error: parsed.error };
  try {
    await prisma.catalogItem.create({ data: parsed.data as never });
  } catch {
    return { error: "Could not save. Is the database connected (DATABASE_URL set)?" };
  }
  revalidatePath("/settings/catalog");
  redirect("/settings/catalog");
}

export async function updateCatalogItem(_prev: CatalogState, formData: FormData): Promise<CatalogState> {
  const id = str(formData, "id");
  if (!id) return { error: "Missing item id." };
  const parsed = parse(formData);
  if (!parsed.ok) return { error: parsed.error };
  try {
    await prisma.catalogItem.update({ where: { id }, data: parsed.data as never });
  } catch {
    return { error: "Could not save changes." };
  }
  revalidatePath("/settings/catalog");
  redirect("/settings/catalog");
}

export async function deleteCatalogItem(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  if (!id) return;
  await prisma.catalogItem.delete({ where: { id } });
  revalidatePath("/settings/catalog");
  redirect("/settings/catalog");
}
