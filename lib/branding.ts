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
  /**
   * Changes whenever any branding changes.
   *
   * Appended to icon URLs so an installed app actually picks up a new logo.
   * Android re-reads the manifest and applies a changed name, but it will
   * happily keep an icon it has already fetched from an unchanged URL — so
   * the URL has to change for the icon to change.
   */
  version: string;
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
  version: "0",
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
      // Base-36 seconds: short enough to sit in a URL, and it only moves
      // when something about the branding was actually saved.
      version: Math.floor(settings.updatedAt.getTime() / 1000).toString(36),
    };
  },
  ["school-branding"],
  {
    tags: [BRANDING_CACHE_TAG],
    /*
     * A ceiling as well as a tag.
     *
     * Saving branding through the app calls revalidateTag, and that is the
     * fast path — the change appears immediately. But with a tag alone and
     * no expiry, anything that changes these rows *without* going through
     * that action leaves the cache wrong permanently: a data import, a
     * correction applied directly to the database, a restore from backup.
     * There is no second event to fix it and no amount of restarting helps,
     * which is exactly the state this was found in.
     *
     * Five minutes costs one query per process per five minutes and means
     * branding can never be more than that far out of date.
     */
    revalidate: 300,
  }
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
