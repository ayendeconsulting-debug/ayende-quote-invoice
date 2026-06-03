"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Input, Textarea, Select, SubmitButton, FormMessage } from "@/components/ui/form";
import { SECTION_KINDS, sectionMeta } from "@/lib/quote-template";
import { createCatalogItem, updateCatalogItem, type CatalogState } from "./actions";

export interface CatalogItemValues {
  id?: string;
  sectionKind: string;
  description: string;
  detail: string;
  hours: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  sortOrder: string;
}

export function CatalogItemForm({ initial }: { initial?: CatalogItemValues }) {
  const isEdit = Boolean(initial?.id);
  const action = isEdit ? updateCatalogItem : createCatalogItem;
  const [state, formAction] = useActionState<CatalogState, FormData>(action, {});
  const v = initial;

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {isEdit ? <input type="hidden" name="id" value={v!.id} /> : null}

      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Section" htmlFor="sectionKind" required hint="Which section this item belongs to.">
            <Select id="sectionKind" name="sectionKind" defaultValue={v?.sectionKind ?? "SCOPE"}>
              {SECTION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {sectionMeta(k).label} ({k})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sort order" htmlFor="sortOrder" hint="Lower numbers list first.">
            <Input id="sortOrder" name="sortOrder" type="number" step="1" defaultValue={v?.sortOrder ?? "0"} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="description" required>
              <Input id="description" name="description" defaultValue={v?.description ?? ""} required autoFocus />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Detail" htmlFor="detail" hint="Optional second line shown under the description.">
              <Textarea id="detail" name="detail" defaultValue={v?.detail ?? ""} />
            </Field>
          </div>
          <Field label="Hours" htmlFor="hours" hint="If set, the line bills as hours × rate.">
            <Input id="hours" name="hours" type="number" min="0" step="0.25" defaultValue={v?.hours ?? ""} />
          </Field>
          <Field label="Quantity" htmlFor="quantity" hint="Used when Hours is blank.">
            <Input id="quantity" name="quantity" type="number" min="0" step="1" defaultValue={v?.quantity ?? "1"} />
          </Field>
          <Field label="Unit" htmlFor="unit" hint="e.g. hrs, ea, mo, yr.">
            <Input id="unit" name="unit" defaultValue={v?.unit ?? ""} />
          </Field>
          <Field label="Unit price / rate" htmlFor="unitPrice">
            <Input id="unitPrice" name="unitPrice" type="number" min="0" step="0.01" defaultValue={v?.unitPrice ?? "0"} />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton>{isEdit ? "Save changes" : "Add item"}</SubmitButton>
        <Link href="/settings/catalog" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          Cancel
        </Link>
        {state.error ? <FormMessage type="error">{state.error}</FormMessage> : null}
      </div>
    </form>
  );
}
