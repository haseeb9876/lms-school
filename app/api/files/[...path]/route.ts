import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_ROOT, etagFor } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

/**
 * Serves locally stored *branding* images — the school logo and building
 * photo — and nothing else.
 *
 * Uploads live outside `public/` because Next.js resolves static assets from
 * a manifest built at build time, so a file written at runtime isn't
 * reliably served from there. This route reads them explicitly, which
 * behaves the same on every host.
 *
 * It is intentionally unauthenticated, and listed as public in
 * scripts/check-auth-coverage.ts: these images appear on the welcome and
 * login screens, which are themselves public, so requiring a session would
 * leave both pages with broken images. Access is bounded by only ever
 * serving the branding folder — a request for anything else 404s whether or
 * not the file exists.
 */
const SERVABLE_PREFIX = "branding/";

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path: segments } = await context.params;
  const key = segments.join("/");

  const notFound = new Response("Not found", { status: 404 });

  if (!key.startsWith(SERVABLE_PREFIX)) return notFound;

  /*
   * Resolve first, then confirm the result is still inside the upload root.
   * Checking the raw string for ".." would miss encoded and normalised
   * variants; comparing the resolved path cannot be tricked the same way.
   */
  const target = path.resolve(UPLOAD_ROOT, key);
  if (!target.startsWith(UPLOAD_ROOT + path.sep)) return notFound;

  const extension = path.extname(target).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) return notFound;

  let file: Buffer;
  try {
    file = await fs.readFile(target);
  } catch {
    return notFound;
  }

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
