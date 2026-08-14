import { prisma } from "@/lib/db";
import { SCHOOL_SETTINGS_ID } from "@/lib/branding";
import { BrandingSettingsForm } from "@/components/settings/BrandingSettingsForm";

export default async function BrandingSettingsPage() {
  const settings = await prisma.schoolSettings.findUnique({ where: { id: SCHOOL_SETTINGS_ID } });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Branding &amp; settings</h1>
        <p className="text-sm text-neutral-500">
          This is shown across the entire app — the sign-in page, sidebar, browser tab, and printed documents.
        </p>
      </div>
      <BrandingSettingsForm initialSettings={settings} />
    </div>
  );
}
