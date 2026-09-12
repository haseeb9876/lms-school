import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { readableTextColor, softTint } from "@/lib/color";

export interface BrandingSettings {
  schoolName: string;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  /** Photograph used as the welcome screen's backdrop. */
  buildingImageUrl: string | null;
  primaryColor: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

const DEFAULT_BRANDING: BrandingSettings = {
  schoolName: "My School",
  tagline: null,
  logoUrl: null,
  faviconUrl: null,
  buildingImageUrl: null,
  primaryColor: "#0e6e68",
  address: null,
  phone: null,
  email: null,
  website: null,
};

export const BRANDING_CACHE_TAG = "branding";
export const SCHOOL_SETTINGS_ID = "school";

const loadBranding = unstable_cache(
  async (): Promise<BrandingSettings> => {
    const settings = await prisma.schoolSettings.findUnique({ where: { id: SCHOOL_SETTINGS_ID } });
    if (!settings) return DEFAULT_BRANDING;
    return {
      schoolName: settings.schoolName,
      tagline: settings.tagline,
      logoUrl: settings.logoUrl,
      faviconUrl: settings.faviconUrl,
      buildingImageUrl: settings.buildingImageUrl,
      primaryColor: settings.primaryColor,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
    };
  },
  ["school-branding"],
  { tags: [BRANDING_CACHE_TAG] }
);

export async function getBrandingSettings(): Promise<BrandingSettings> {
  return loadBranding();
}

/** CSS custom properties to inject server-side so the brand accent resolves
 * on first paint with no flash of default branding. */
export function brandingCssVariables(branding: BrandingSettings): Record<string, string> {
  return {
    "--brand-primary": branding.primaryColor,
    "--brand-primary-fg": readableTextColor(branding.primaryColor),
    "--brand-primary-soft": softTint(branding.primaryColor),
  };
}
