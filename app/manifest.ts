import type { MetadataRoute } from "next";
import { getBrandingSettings } from "@/lib/branding";

/**
 * Rendered per request rather than frozen at build time.
 *
 * Next treats a manifest as a static route by default, which would bake the
 * school's name, colour and icons into the deployment — so a principal
 * renaming the school or changing its logo would see no change until the
 * next deploy, which for a school that has bought this app may be never.
 *
 * The underlying branding read is itself cached and tag-invalidated, so this
 * costs a cache lookup rather than a database round trip on each fetch, and
 * the manifest is requested about once per visitor per install.
 */
export const dynamic = "force-dynamic";

/**
 * What makes the site installable as an app.
 *
 * Built from the school's own branding rather than hard-coded, so the thing
 * that lands on a phone's home screen carries that school's name, colour and
 * logo — which is the difference between "a website someone bookmarked" and
 * something that reads as the school's own app.
 *
 * `display: standalone` is what removes the browser chrome once installed:
 * no address bar, no tabs, its own entry in the app switcher.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await getBrandingSettings();

  return {
    name: branding.schoolName,
    // Home screens truncate hard, and this school's full name is 47
    // characters. The first clause of it is what people recognise.
    short_name: shortName(branding.schoolName),
    description:
      branding.tagline ??
      `${branding.schoolName} — timetable, attendance, results and fees for students, guardians and staff.`,
    start_url: "/",
    /*
     * Opening on the dashboard would be wrong: an installed app is launched
     * by people who may not be signed in, and "/" already sends a signed-in
     * user onward while giving everyone else the welcome screen.
     */
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fafaf8",
    theme_color: branding.primaryColor,
    categories: ["education", "productivity"],
    lang: "en",
    dir: "ltr",
    icons: [
      { src: "/app-icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops this one to the launcher's shape; it is padded so the
      // logo survives the crop.
      {
        src: "/app-icon?size=512&maskable=1",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Dashboard", url: "/dashboard" },
      { name: "Exam Datesheets", url: "/datesheets" },
      { name: "Announcements", url: "/announcements" },
    ],
  };
}

/**
 * The label under the icon on a home screen.
 *
 * Launchers ellipsize this themselves, and they are better at it than we
 * are — so the goal is a name that is *recognisable*, not one squeezed under
 * some guessed character count. Packing words into twelve characters turned
 * "City University of Science & IT Peshawar Pakistan" into "City", which
 * identifies nothing; two or three words identify the school.
 *
 * Cut at a natural break first (a dash or comma usually separates the name
 * from its location), then keep whole words up to a generous cap.
 */
const SHORT_NAME_MAX = 22;

function shortName(full: string): string {
  const trimmed = full.trim();
  if (trimmed.length <= SHORT_NAME_MAX) return trimmed;

  const firstClause = trimmed.split(/\s[–—-]\s|,/)[0].trim();
  if (firstClause.length <= SHORT_NAME_MAX) return firstClause;

  const words = firstClause.split(/\s+/);
  let out = "";
  for (const word of words) {
    const candidate = out ? `${out} ${word}` : word;
    if (candidate.length > SHORT_NAME_MAX) break;
    out = candidate;
  }

  // A single word longer than the cap still has to be cut somewhere.
  return trimConnectors(out) || firstClause.slice(0, SHORT_NAME_MAX);
}

/**
 * Words that cannot end a name. Cutting "City University of Science" at the
 * character budget leaves "City University of", which reads as a sentence
 * someone forgot to finish.
 */
const CONNECTORS = new Set(["of", "and", "&", "the", "for", "in", "at", "on", "de", "du"]);

function trimConnectors(value: string): string {
  const words = value.split(/\s+/);
  while (words.length > 1 && CONNECTORS.has(words[words.length - 1].toLowerCase())) {
    words.pop();
  }
  return words.join(" ");
}
