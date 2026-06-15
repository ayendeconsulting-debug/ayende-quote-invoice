"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type SignState = { ok?: boolean; error?: string };

function trim(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

export async function signCloseout(_prev: SignState, formData: FormData): Promise<SignState> {
  const token = trim(formData.get("token"));
  const name = trim(formData.get("name"));
  const email = trim(formData.get("email"));
  const agreed = formData.get("agree") != null;

  if (!name) return { error: "Please enter your full name." };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (!agreed) return { error: "Please tick the box to confirm the deliverables are complete." };

  let checkedIds: string[] = [];
  try {
    const raw = JSON.parse(String(formData.get("checkedIds") ?? "[]"));
    if (Array.isArray(raw)) checkedIds = raw.filter((x): x is string => typeof x === "string");
  } catch {
    checkedIds = [];
  }

  if (!token) return { error: "Invalid link." };
  const closeout = await prisma.closeout.findUnique({ where: { shareToken: token }, select: { id: true, status: true } });
  if (!closeout) return { error: "This closeout could not be found." };
  if (closeout.status === "SIGNED") return { error: "This closeout has already been signed off." };

  try {
    await prisma.$transaction([
      prisma.closeoutItem.updateMany({
        where: { closeoutId: closeout.id, id: { in: checkedIds } },
        data: { checked: true, completedAt: new Date() },
      }),
      prisma.closeoutItem.updateMany({
        where: { closeoutId: closeout.id, id: { notIn: checkedIds } },
        data: { checked: false, completedAt: null },
      }),
      prisma.closeout.update({
        where: { id: closeout.id },
        data: { status: "SIGNED", signedByName: name, signedByEmail: email, signedAt: new Date() },
      }),
    ]);
  } catch {
    return { error: "Something went wrong saving your sign-off. Please try again." };
  }

  revalidatePath(`/closeout/${token}`);
  return { ok: true };
}
