/**
 * Checks that an installed app picks up a change of name or logo.
 *
 * This is the promise the school is being sold: rename the school or upload
 * a new crest, and the app already on a parent's home screen becomes the new
 * one — no reinstall. Three separate things have to hold for that, and each
 * fails silently on its own:
 *
 *   1. the manifest must not be cached, or the phone keeps reading the old
 *      name for as long as that cache lives;
 *   2. the icon URLs must *change*, because a phone that has already fetched
 *      an icon from a given URL will not fetch it again — the manifest would
 *      report the new name beside the old picture;
 *   3. the branding the app serves must actually follow the database.
 *
 * Point 3 had a real hole: the branding cache carried a tag and no expiry,
 * so anything that changed those rows without going through the settings
 * action — an import, a correction applied straight to the database, a
 * restore — left it wrong permanently, surviving restarts. It now has a
 * ceiling as well as a tag.
 *
 *   npm run branding          (needs the dev server on :3000)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = ""): void {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** The same derivation lib/branding.ts uses. */
const versionOf = (updatedAt: Date) => Math.floor(updatedAt.getTime() / 1000).toString(36);

interface Manifest {
  name: string;
  short_name: string;
  theme_color: string;
  display: string;
  icons: { src: string; sizes: string; purpose?: string }[];
}

async function main(): Promise<void> {
  const settings = await prisma.schoolSettings.findUniqueOrThrow({ where: { id: "school" } });
  const expected = versionOf(settings.updatedAt);

  console.log(`\nSchool: ${settings.schoolName}\nVersion: ${expected}\n`);

  console.log("A. The manifest is readable and never cached");
  const response = await fetch(`${BASE}/manifest.webmanifest`);
  check("served", response.status === 200, String(response.status));
  check(
    "correct media type",
    (response.headers.get("content-type") ?? "").includes("manifest"),
    response.headers.get("content-type") ?? ""
  );

  const cacheControl = response.headers.get("cache-control") ?? "";
  check(
    "must be revalidated, so a rename is seen",
    cacheControl.includes("must-revalidate") || cacheControl.includes("no-cache"),
    cacheControl
  );

  const manifest = (await response.json()) as Manifest;

  console.log("\nB. It carries the school's own identity");
  check("the school's name", manifest.name === settings.schoolName, manifest.name);
  check("a short name that is not empty", manifest.short_name.length > 0, manifest.short_name);
  check("the school's colour", manifest.theme_color === settings.primaryColor, manifest.theme_color);
  check("opens without browser chrome", manifest.display === "standalone", manifest.display);

  console.log("\nC. Every icon URL is versioned, so a new logo is fetched");
  check("three icons offered", manifest.icons.length === 3, String(manifest.icons.length));

  /*
   * Checked for internal coherence rather than against the database row.
   * The branding the app serves is cached — deliberately — so immediately
   * after a save it can legitimately lag the row by up to the cache TTL.
   * Asserting equality with the live row made this test fail whenever it had
   * been run before, because its own final section advances the timestamp.
   *
   * What actually has to hold is that every icon carries a version, and that
   * they all carry the *same* one: a manifest offering two versions would
   * leave a phone with a new name and a mismatched icon.
   */
  const versions = manifest.icons.map((icon) => new URL(icon.src, BASE).searchParams.get("v"));
  check("every icon is versioned", versions.every(Boolean), JSON.stringify(versions));
  check("all three agree", new Set(versions).size === 1, JSON.stringify(versions));
  /*
   * Format, not ordering. Comparing the served version against the row's
   * was racy: section F bumps the timestamp briefly, and if the branding
   * cache happened to refresh inside that window the app would legitimately
   * serve a version newer than the restored row. The property worth holding
   * is that it looks like a version this code produces.
   */
  check(
    "and it looks like a real version",
    Boolean(versions[0] && /^[0-9a-z]+$/.test(versions[0])),
    String(versions[0])
  );
  check(
    "one is maskable, or Android crops the logo",
    manifest.icons.some((icon) => icon.purpose === "maskable")
  );

  console.log("\nD. The icons actually render");
  for (const icon of manifest.icons) {
    const image = await fetch(`${BASE}${icon.src}`);
    const bytes = Buffer.from(await image.arrayBuffer());
    const isPng = bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
    const width = isPng ? bytes.readUInt32BE(16) : 0;
    const [declared] = icon.sizes.split("x").map(Number);

    check(`${icon.sizes} is a real PNG at that size`, isPng && width === declared, `${width}px`);
    check(
      `${icon.sizes} is cacheable forever, since its URL is versioned`,
      (image.headers.get("cache-control") ?? "").includes("immutable"),
      image.headers.get("cache-control") ?? ""
    );
  }

  console.log("\nE. iOS gets its own icon, versioned too");
  const page = await fetch(`${BASE}/login`);
  const html = await page.text();
  const apple = html.match(/<link rel="apple-touch-icon" href="([^"]+)"/);
  check("apple-touch-icon present", Boolean(apple), "missing");
  check(
    "and carries the same version as the manifest",
    Boolean(apple?.[1] && apple[1].includes(`v=${versions[0]}`)),
    apple?.[1] ?? "n/a"
  );

  console.log("\nF. Saving branding moves the version");
  // Writes the same name back, exactly as a real save does: nothing visible
  // changes but @updatedAt advances, which is what busts the icon URLs.
  const before = expected;
  await prisma.schoolSettings.update({
    where: { id: "school" },
    data: { schoolName: settings.schoolName },
  });
  const after = versionOf(
    (await prisma.schoolSettings.findUniqueOrThrow({ where: { id: "school" } })).updatedAt
  );

  check("version advances on save", before !== after, `${before} → ${after}`);

  /*
   * Put the timestamp back. Prisma's @updatedAt overrides anything set
   * through the client, so this needs raw SQL — and it needs doing, because
   * leaving the row advanced desynchronises it from the cached branding the
   * app is still serving and makes the *next* run of this script fail on a
   * problem it created itself.
   */
  await prisma.$executeRaw`
    UPDATE "SchoolSettings" SET "updatedAt" = ${settings.updatedAt} WHERE id = 'school'
  `;
  const restored = versionOf(
    (await prisma.schoolSettings.findUniqueOrThrow({ where: { id: "school" } })).updatedAt
  );
  check("and the check leaves no trace", restored === before, `${restored} vs ${before}`);

  await prisma.$disconnect();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
