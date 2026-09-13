/**
 * Checks that uploads actually work, all the way from storing bytes to
 * serving them back over HTTP.
 *
 * This exists because the failure it guards against was invisible until a
 * principal tried to change the school logo in production and got
 * "Something went wrong". The cause was structural: with no bucket
 * configured the driver fell back to the local filesystem, and a serverless
 * host's working directory is read-only, so the first write threw. Nothing
 * in the test suite touched that path, because every test ran on a laptop
 * where the filesystem is perfectly writable.
 *
 * So this exercises the real driver, the real route, and the two rules that
 * keep a public file endpoint safe.
 *
 *   npm run storage          (needs the dev server on :3000)
 */
import { PrismaClient } from "@prisma/client";
import { storage, storageDriverName, uploadKey, LOCAL_FILE_PREFIX } from "../lib/storage";

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

/** A real 1×1 PNG, so content sniffing and image decoding both see something valid. */
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c" +
    "6360000002000100ffff03000006000557bfabd40000000049454e44ae426082",
  "hex"
);

async function main(): Promise<void> {
  console.log(`\nStorage driver: ${storageDriverName}\n`);

  console.log("A. Bytes survive a round trip through the driver");
  const key = uploadKey("branding", "png");
  const url = await storage.save(key, PNG, "image/png");

  check("save returns a servable URL", url.startsWith(`${LOCAL_FILE_PREFIX}branding/`), url);
  const readBack = await storage.read(url);
  check("read returns identical bytes", Boolean(readBack?.equals(PNG)));

  if (storageDriverName === "database") {
    const row = await prisma.storedFile.findUnique({ where: { key } });
    check(
      "the row records its type and size",
      row?.contentType === "image/png" && row?.size === PNG.length
    );
  }

  console.log("\nB. The public route serves it, as the login screen needs");
  // Deliberately unauthenticated: the welcome and login screens show the
  // logo before anyone has signed in.
  const served = await fetch(`${BASE}${url}`);
  check("200 without a session", served.status === 200, String(served.status));
  check(
    "served as the type it was stored as",
    served.headers.get("content-type") === "image/png",
    served.headers.get("content-type") ?? "none"
  );

  const bytes = Buffer.from(await served.arrayBuffer());
  check("bytes match what was uploaded", bytes.equals(PNG));
  check(
    "cacheable forever, since the filename is unique",
    (served.headers.get("cache-control") ?? "").includes("immutable")
  );

  const revalidated = await fetch(`${BASE}${url}`, {
    headers: { "if-none-match": served.headers.get("etag") ?? "" },
  });
  check("revalidates to 304", revalidated.status === 304, String(revalidated.status));

  console.log("\nC. It stays a branding-only endpoint");
  /*
   * This route is public, so its bounds are the whole of its security. A
   * datesheet is addressed to one class and must never be reachable here —
   * it has its own authenticated route.
   */
  const wrongFolder = await fetch(`${BASE}/api/files/datesheets/anything.png`);
  check("non-branding folders are refused", wrongFolder.status === 404, String(wrongFolder.status));

  /*
   * What matters is that no file is served, not that the status is 404.
   * An unescaped "../" is normalised away by the client before the request
   * is even sent, so it arrives as a different path entirely and gets the
   * proxy's redirect to the sign-in screen — a 200, and perfectly safe.
   * Asserting the status code marked that as a failure; asserting that no
   * file came back is the actual security property.
   */
  for (const attack of [
    "/api/files/branding/..%2F..%2Fetc%2Fpasswd",
    "/api/files/branding/../../../etc/passwd",
    "/api/files/../datesheets/secret.png",
    "/api/files/branding/%2e%2e%2f%2e%2e%2fetc%2fpasswd",
  ]) {
    const response = await fetch(`${BASE}${attack}`);
    const type = response.headers.get("content-type") ?? "";
    const body = await response.text();

    const servedAFile = type.startsWith("image/") || type.startsWith("application/octet-stream");
    const leakedSystemFile = body.includes("root:x:") || body.includes("/bin/bash");

    check(
      `no file served for ${attack.slice(11)}`,
      !servedAFile && !leakedSystemFile,
      `${response.status} ${type}`
    );
  }

  console.log("\nD. Deleting is clean and idempotent");
  await storage.delete(url);
  check("gone from the driver", (await storage.read(url)) === null);
  check("404 over HTTP", (await fetch(`${BASE}${url}`)).status === 404);

  let deletedTwice = true;
  try {
    await storage.delete(url);
  } catch {
    deletedTwice = false;
  }
  // Removing a file that is already gone is success — an upload that
  // replaces an image must not fail because the old one vanished first.
  check("deleting an absent file is not an error", deletedTwice);

  await prisma.$disconnect();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
