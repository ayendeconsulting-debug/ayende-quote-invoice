"use client";

import { useActionState } from "react";
import { Field, Input, Textarea, Select, SubmitButton, FormMessage } from "@/components/ui/form";
import { updateProfile, type SettingsState } from "./actions";

type Profile = {
  businessName: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  etransferEmail: string | null;
  bankDetails: string | null;
  defaultCurrency: string;
  defaultTaxRate: string; // serialized Decimal
  taxLabel: string;
  quotePrefix: string;
  invoicePrefix: string;
  accentColor: string;
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-6">
      <h2 className="mb-4 font-display text-lg text-[var(--color-ink)]">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<SettingsState, FormData>(updateProfile, {});

  return (
    <form action={action} className="max-w-3xl space-y-6">
      <SectionCard title="Business identity">
        <div className="sm:col-span-2">
          <Field label="Business name" htmlFor="businessName" required>
            <Input id="businessName" name="businessName" defaultValue={profile.businessName} required />
          </Field>
        </div>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={profile.email ?? ""} />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} />
        </Field>
        <Field label="Website" htmlFor="website">
          <Input id="website" name="website" defaultValue={profile.website ?? ""} />
        </Field>
        <Field label="Logo URL" htmlFor="logoUrl" hint="Paste a hosted image link; file upload comes later.">
          <Input id="logoUrl" name="logoUrl" defaultValue={profile.logoUrl ?? ""} />
        </Field>
      </SectionCard>

      <SectionCard title="Address">
        <div className="sm:col-span-2">
          <Field label="Address line 1" htmlFor="addressLine1">
            <Input id="addressLine1" name="addressLine1" defaultValue={profile.addressLine1 ?? ""} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Address line 2" htmlFor="addressLine2">
            <Input id="addressLine2" name="addressLine2" defaultValue={profile.addressLine2 ?? ""} />
          </Field>
        </div>
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" defaultValue={profile.city ?? ""} />
        </Field>
        <Field label="Province / State" htmlFor="province">
          <Input id="province" name="province" defaultValue={profile.province ?? ""} />
        </Field>
        <Field label="Postal code" htmlFor="postalCode">
          <Input id="postalCode" name="postalCode" defaultValue={profile.postalCode ?? ""} />
        </Field>
        <Field label="Country" htmlFor="country">
          <Input id="country" name="country" defaultValue={profile.country} />
        </Field>
      </SectionCard>

      <SectionCard title="Payment details">
        <Field label="E-transfer email" htmlFor="etransferEmail">
          <Input id="etransferEmail" name="etransferEmail" type="email" defaultValue={profile.etransferEmail ?? ""} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Bank transfer details" htmlFor="bankDetails" hint="Shown on invoices for clients paying by bank transfer.">
            <Textarea id="bankDetails" name="bankDetails" defaultValue={profile.bankDetails ?? ""} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Document defaults">
        <Field label="Default currency" htmlFor="defaultCurrency">
          <Select id="defaultCurrency" name="defaultCurrency" defaultValue={profile.defaultCurrency}>
            <option value="CAD">CAD</option>
            <option value="USD">USD</option>
          </Select>
        </Field>
        <Field label="Tax label" htmlFor="taxLabel">
          <Input id="taxLabel" name="taxLabel" defaultValue={profile.taxLabel} />
        </Field>
        <Field label="Default tax rate (%)" htmlFor="defaultTaxRate">
          <Input id="defaultTaxRate" name="defaultTaxRate" type="number" step="0.01" min="0" max="100" defaultValue={profile.defaultTaxRate} />
        </Field>
        <Field label="Accent colour" htmlFor="accentColor" hint="6-digit hex, e.g. #E07B39">
          <Input id="accentColor" name="accentColor" defaultValue={profile.accentColor} />
        </Field>
        <Field label="Quote number prefix" htmlFor="quotePrefix" hint="e.g. AYC-Q → AYC-Q-2026-001">
          <Input id="quotePrefix" name="quotePrefix" defaultValue={profile.quotePrefix} />
        </Field>
        <Field label="Invoice number prefix" htmlFor="invoicePrefix" hint="e.g. AYC-INV → AYC-INV-2026-001">
          <Input id="invoicePrefix" name="invoicePrefix" defaultValue={profile.invoicePrefix} />
        </Field>
      </SectionCard>

      <div className="flex items-center gap-4">
        <SubmitButton>Save settings</SubmitButton>
        {state.ok ? <FormMessage type="success">Settings saved.</FormMessage> : null}
        {state.error ? <FormMessage type="error">{state.error}</FormMessage> : null}
      </div>
    </form>
  );
}
