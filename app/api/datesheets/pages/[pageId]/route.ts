import { withAuth } from "@/lib/auth/with-auth";
import { findVisibleDatesheetPage } from "@/lib/queries/datesheets";
import { storage, etagFor } from "@/lib/storage";

/**
 * Streams one page of a datesheet, to someone allowed to see it.
 *
 * Deliberately not served by the public /api/files route the way branding
 * images are. A datesheet can be addressed to a single class, and its
 * images are the actual content — a URL that served them to anyone holding
 * it would make the scoping on the surrounding page decorative, and these
 * URLs get forwarded in WhatsApp groups.
 *
 * The check is the same visibility clause the list and the detail page use,
 * reached from the page id, so there is one rule rather than three copies
 * that can drift apart.
 */
const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

export const GET = withAuth(
  null,
  async (request, { session, params }: { params: Promise<{ pageId: string }> } & any) => {
    const { pageId } = await params;

    const page = await findVisibleDatesheetPage(pageId, {
      userId: session.userId,
      role: session.role,
    });

    // 404 rather than 403 for a page this viewer may not see: a 403 would
    // confirm that the id is real and that another class has a datesheet.
    if (!page) return new Response("Not found", { status: 404 });

    const file = await storage.read(page.storageRef);
    if (!file) return new Response("Not found", { status: 404 });

    const extension = page.storageRef.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";

    const etag = etagFor(file);
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        ETag: etag,
        /*
         * Private, not public: the bytes are the same for everyone who may
         * see them, but a shared cache in front of this must never hand a
         * class's datesheet to the next person who asks for the same URL.
         * Immutable because the stored filename carries a random suffix, so
         * a given URL's content never changes.
         */
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
);
