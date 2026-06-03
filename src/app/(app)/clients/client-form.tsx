"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Input, Textarea, Select, SubmitButton, FormMessage } from "@/components/ui/form";
import { createClient, updateClient, type ClientState } from "./actions";

export type ClientFormValues = {
  id?: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  currency: string;
  notes: string | null;
};

export function ClientForm({ initial }: { initial?: ClientFormValues }) {
  const isEdit = Boolean(initial?.id);
  const action = isEdit ? updateClient : createClient;
  const [state, formAction] = useActionState<ClientState, FormData>(action, {});

  const v = initial;

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {isEdit ? <input type="hidden" name="id" value={v!.id} /> : null}

      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Name" htmlFor="name" required>
              <Input id="name" name="name" defaultValue={v?.name ?? ""} required autoFocus />
            </Field>
          </div>
          <Field label="Company" htmlFor="company">
            <Input id="company" name="company" defaultValue={v?.company ?? ""} />
          </Field>
          <Field label="Default currency" htmlFor="currency">
            <Select id="currency" name="currency" defaultValue={v?.currency ?? "CAD"}>
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={v?.email ?? ""} />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" defaultValue={v?.phone ?? ""} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address line 1" htmlFor="addressLine1">
              <Input id="addressLine1" name="addressLine1" defaultValue={v?.addressLine1 ?? ""} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Address line 2" htmlFor="addressLine2">
              <Input id="addressLine2" name="addressLine2" defaultValue={v?.addressLine2 ?? ""} />
            </Field>
          </div>
          <Field label="City" htmlFor="city">
            <Input id="city" name="city" defaultValue={v?.city ?? ""} />
          </Field>
          <Field label="Province / State" htmlFor="province">
            <Input id="province" name="province" defaultValue={v?.province ?? ""} />
          </Field>
          <Field label="Postal code" htmlFor="postalCode">
            <Input id="postalCode" name="postalCode" defaultValue={v?.postalCode ?? ""} />
          </Field>
          <Field label="Country" htmlFor="country">
            <Input id="country" name="country" defaultValue={v?.country ?? "Canada"} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" name="notes" defaultValue={v?.notes ?? ""} />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton>{isEdit ? "Save changes" : "Create client"}</SubmitButton>
        <Link
          href={isEdit ? `/clients/${v!.id}` : "/clients"}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          Cancel
        </Link>
        {state.error ? <FormMessage type="error">{state.error}</FormMessage> : null}
      </div>
    </form>
  );
}
