import { Topbar } from "@/components/topbar";
import { getBusinessProfile } from "@/lib/profile";
import { SettingsForm } from "./settings-form";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getBusinessProfile();

  return (
    <>
      <Topbar title="Settings" subtitle="Business profile, branding, tax, and numbering." />
      <div className="p-4 sm:p-6 lg:p-8">
        <Link
          href="/settings/catalog"
          className="mb-6 flex max-w-2xl items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white px-5 py-4 transition hover:border-[var(--color-accent)]"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-600)]">
              <BookOpen size={18} />
            </span>
            <span>
              <span className="block font-medium text-[var(--color-ink)]">Line-item catalog</span>
              <span className="block text-sm text-[var(--color-muted)]">Manage reusable items you can insert into quotes.</span>
            </span>
          </span>
          <ChevronRight size={18} className="text-[var(--color-ink-300)]" />
        </Link>

        <SettingsForm
          profile={{
            businessName: profile.businessName,
            addressLine1: profile.addressLine1,
            addressLine2: profile.addressLine2,
            city: profile.city,
            province: profile.province,
            postalCode: profile.postalCode,
            country: profile.country,
            email: profile.email,
            phone: profile.phone,
            website: profile.website,
            logoUrl: profile.logoUrl,
            etransferEmail: profile.etransferEmail,
            bankDetails: profile.bankDetails,
            defaultCurrency: profile.defaultCurrency,
            defaultTaxRate: String(profile.defaultTaxRate),
            taxLabel: profile.taxLabel,
            quotePrefix: profile.quotePrefix,
            invoicePrefix: profile.invoicePrefix,
            accentColor: profile.accentColor,
          }}
        />
      </div>
    </>
  );
}
