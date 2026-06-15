"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { newShareToken } from "@/lib/share";

export type CloseoutState = { error?: string };

function s(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

/** Create a closeout from a quote's Scope items (idempotent: reuse if present). */
export async function generateCloseout(formData: FormData): Promise<void> {
  const quoteId = s(formData.get("quoteId"));
  if (!quoteId) return;

  const existing = await prisma.closeout.findUnique({ where: { quoteId }, select: { id: true } });
  if (existing) redirect(`/quotes/${quoteId}/closeout`);

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { sections: { where: { kind: "SCOPE" }, include: { items: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!quote) redirect("/quotes");

  const scopeItems = quote!.sections.flatMap((sec: (typeof quote.sections)[number]) => sec.items);
  const items = scopeItems
    .filter((it: (typeof scopeItems)[number]) => (it.description ?? "").trim().length > 0)
    .map((it: (typeof scopeItems)[number], i: number) => ({
      label: it.description,
      detail: it.detail,
      sortOrder: i,
    }));

  await prisma.closeout.create({
    data: {
      quoteId,
      shareToken: newShareToken(),
      title: quote!.title || "Project closeout",
      status: "DRAFT",
      items: { create: items },
    },
  });

  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/quotes/${quoteId}/closeout`);
}

interface PayloadItem { label?: string; detail?: string }
interface Payload { title?: string; introNote?: string; items?: PayloadItem[] }

export async function updateCloseout(_prev: CloseoutState, formData: FormData): Promise<CloseoutState> {
  const id = s(formData.get("id"));
  const quoteId = s(formData.get("quoteId"));
  if (!id) return { error: "Missing closeout id." };

  let p: Payload;
  try {
    p = JSON.parse(String(formData.get("payload") ?? "")) as Payload;
  } catch {
    return { error: "Could not read the checklist. Please retry." };
  }

  const items = (Array.isArray(p.items) ? p.items : [])
    .filter((it) => (it.label ?? "").trim().length > 0)
    .map((it, i) => ({ label: (it.label ?? "").trim(), detail: (it.detail ?? "").trim() || null, sortOrder: i }));

  if (items.length === 0) return { error: "Add at least one checklist item." };

  try {
    await prisma.$transaction([
      prisma.closeoutItem.deleteMany({ where: { closeoutId: id } }),
      prisma.closeout.update({
        where: { id },
        data: {
          title: (p.title ?? "").trim() || "Project closeout",
          introNote: (p.introNote ?? "").trim() || null,
          items: { create: items },
        },
      }),
    ]);
  } catch {
    return { error: "Could not save the checklist." };
  }

  revalidatePath(`/quotes/${quoteId}/closeout`);
  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/quotes/${quoteId}/closeout?saved=1`);
}

export async function setCloseoutStatus(formData: FormData): Promise<void> {
  const id = s(formData.get("id"));
  const quoteId = s(formData.get("quoteId"));
  const status = s(formData.get("status"));
  if (!id || (status !== "DRAFT" && status !== "SENT")) return;
  // Never override a SIGNED closeout from here.
  const current = await prisma.closeout.findUnique({ where: { id }, select: { status: true } });
  if (!current || current.status === "SIGNED") {
    redirect(`/quotes/${quoteId}/closeout`);
  }
  await prisma.closeout.update({ where: { id }, data: { status: status as "DRAFT" | "SENT" } });
  revalidatePath(`/quotes/${quoteId}/closeout`);
  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/quotes/${quoteId}/closeout`);
}

export async function deleteCloseout(formData: FormData): Promise<void> {
  const id = s(formData.get("id"));
  const quoteId = s(formData.get("quoteId"));
  if (!id) return;
  await prisma.closeout.delete({ where: { id } });
  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/quotes/${quoteId}`);
}
