import path from "node:path";
import { storage, storageDriverName, etagFor, LOCAL_FILE_PREFIX } from "@/lib/storage";
import { prisma } from "@/lib/db";

/**
 * Serves locally stored *branding* images — the school logo and building
 * photo — and nothing else.
 *
 * It is intentionally unauthenticated, and listed as public in
 * scripts/check-auth-coverage.ts: these images appear on the welcome and
 * login screens, which are themselves public, so requiring a session would
 * leave both pages with broken images. Access is bounded by only ever
 * serving the branding folder — a request for anything else 404s whether or
 * not the file exists.
 *
 * It reads through the storage driver rather than straight off the disk, so
 * the same URL works whether the bytes live in the database (the default),
 * in a directory, or in a bucket.
 */
const SERVABLE_PREFIX = "branding/";

const EXTENSION_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path: segments } = await context.params;
  const key = segments.join("/");

  const notFound = new Response("Not found", { status: 404 });

  if (!key.startsWith(SERVABLE_PREFIX)) return notFound;

  // Rejected before any lookup: a traversal sequence has no business here
  // regardless of which driver would resolve it.
  if (key.includes("..") || path.isAbsolute(key)) return notFound;

  const reference = `${LOCAL_FILE_PREFIX}${key}`;

  const file = await storage.read(reference);
  if (!file) return notFound;

  /*
   * Prefer the type recorded at upload over one guessed from the filename.
   * The browser downscales to WebP before sending, so a file named .jpeg may
   * genuinely hold WebP bytes, and serving it as JPEG would break it.
   */
  const contentType =
    (storageDriverName === "database" ? await storedContentType(key) : null) ??
    EXTENSION_TYPES[path.extname(key).toLowerCase()];

  if (!contentType) return notFound;

  const etag = etagFor(file);
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": contentType,
      ETag: etag,
      // Every stored filename carries a random suffix, so a given URL's
      // bytes never change and can be cached indefinitely.
      "Cache-Control": "public, max-age=31536000, immutable",
      // An uploaded SVG can carry script; this stops one executing against
      // our own origin if it is ever opened directly.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function storedContentType(key: string): Promise<string | null> {
  const row = await prisma.storedFile.findUnique({
    where: { key },
    select: { contentType: true },
  });
  return row?.contentType ?? null;
}
