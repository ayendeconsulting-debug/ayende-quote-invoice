"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type RespondState = { ok?: boolean; error?: string };

function trim(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

async function findOpenQuote(token: string) {
  if (!token) return { error: "Invalid link." as const };
  const q = await prisma.quote.findUnique({
    where: { shareToken: token },
    select: { id: true, status: true },
  });
  if (!q) return { error: "This quote could not be found." as const };
  if (q.status === "ACCEPTED") return { error: "This quote has already been accepted." as const };
  if (q.status === "DECLINED") return { error: "This quote has already been declined." as const };
  if (q.status === "EXPIRED") return { error: "This quote has expired. Please contact us for an updated quote." as const };
  return { quote: q };
}

export async function acceptQuote(_prev: RespondState, formData: FormData): Promise<RespondState> {
  const token = trim(formData.get("token"));
  const name = trim(formData.get("name"));
  const email = trim(formData.get("email"));
  const agreed = formData.get("agree") != null;

  if (!name) return { error: "Please enter your full name." };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (!agreed) return { error: "Please tick the box to confirm you accept this quote." };

  const found = await findOpenQuote(token);
  if ("error" in found) return { error: found.error };

  try {
    await prisma.quote.update({
      where: { id: found.quote.id },
      data: { status: "ACCEPTED", acceptedByName: name, acceptedByEmail: email, acceptedAt: new Date() },
    });
  } catch {
    return { error: "Something went wrong saving your response. Please try again." };
  }

  revalidatePath(`/q/${token}`);
  revalidatePath(`/quotes/${found.quote.id}`);
  revalidatePath("/quotes");
  return { ok: true };
}

export async function declineQuote(_prev: RespondState, formData: FormData): Promise<RespondState> {
  const token = trim(formData.get("token"));
  const reason = trim(formData.get("reason"));

  const found = await findOpenQuote(token);
  if ("error" in found) return { error: found.error };

  try {
    await prisma.quote.update({
      where: { id: found.quote.id },
      data: { status: "DECLINED", declinedAt: new Date(), declineReason: reason || null },
    });
  } catch {
    return { error: "Something went wrong saving your response. Please try again." };
  }

  revalidatePath(`/q/${token}`);
  revalidatePath(`/quotes/${found.quote.id}`);
  revalidatePath("/quotes");
  return { ok: true };
}
