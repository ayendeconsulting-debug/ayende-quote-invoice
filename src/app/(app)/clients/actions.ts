"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type ClientState = { error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function orNull(v: string): string | null {
  return v.length ? v : null;
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseClient(formData: FormData):
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string } {
  const name = str(formData, "name");
  if (!name) return { ok: false, error: "Client name is required." };

  const email = str(formData, "email");
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email address." };

  const currency = str(formData, "currency");
  if (currency !== "CAD" && currency !== "USD") return { ok: false, error: "Currency must be CAD or USD." };

  return {
    ok: true,
    data: {
      name,
      company: orNull(str(formData, "company")),
      email: orNull(email),
      phone: orNull(str(formData, "phone")),
      addressLine1: orNull(str(formData, "addressLine1")),
      addressLine2: orNull(str(formData, "addressLine2")),
      city: orNull(str(formData, "city")),
      province: orNull(str(formData, "province")),
      postalCode: orNull(str(formData, "postalCode")),
      country: orNull(str(formData, "country")),
      currency,
      notes: orNull(str(formData, "notes")),
    },
  };
}

export async function createClient(_prev: ClientState, formData: FormData): Promise<ClientState> {
  const parsed = parseClient(formData);
  if (!parsed.ok) return { error: parsed.error };

  let id: string;
  try {
    const created = await prisma.client.create({ data: parsed.data as never });
    id = created.id;
  } catch {
    return { error: "Could not save. Is the database connected (DATABASE_URL set)?" };
  }

  revalidatePath("/clients");
  redirect(`/clients/${id}`);
}

export async function updateClient(_prev: ClientState, formData: FormData): Promise<ClientState> {
  const id = str(formData, "id");
  if (!id) return { error: "Missing client id." };

  const parsed = parseClient(formData);
  if (!parsed.ok) return { error: parsed.error };

  try {
    await prisma.client.update({ where: { id }, data: parsed.data as never });
  } catch {
    return { error: "Could not save changes." };
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export async function deleteClient(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  if (!id) return;

  // Guard: never wipe a client that has quotes or invoices on file.
  const [quotes, invoices] = await Promise.all([
    prisma.quote.count({ where: { clientId: id } }),
    prisma.invoice.count({ where: { clientId: id } }),
  ]);

  if (quotes + invoices > 0) {
    const params = new URLSearchParams({ error: "has-documents" });
    redirect(`/clients/${id}?${params.toString()}`);
  }

  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
  redirect("/clients");
}
