import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export interface StorageDriver {
  /** Saves a file and returns the URL the app should link to. */
  save(key: string, file: Buffer, contentType: string): Promise<string>;
  /**
   * Reads a file back by whatever `save` returned.
   *
   * Needed because not every upload should be servable by URL. Branding
   * images are public by nature; an examination datesheet for one class is
   * not, so those are streamed through a route that re-checks the viewer
   * rather than handed to the browser as a link anyone could forward.
   */
  read(reference: string): Promise<Buffer | null>;
  delete(url: string): Promise<void>;
}

/**
 * Where local uploads live. Deliberately *not* inside `public/`: Next.js
 * builds its static manifest at build time, so a file dropped into public/
 * at runtime is not reliably served. These are served by an explicit route
 * handler instead, which works the same in every deployment.
 */
export const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), "uploads");

/** URL prefix the file route handler is mounted at. */
export const LOCAL_FILE_PREFIX = "/api/files/";

class LocalStorage implements StorageDriver {
  async save(key: string, file: Buffer, _contentType: string): Promise<string> {
    const safeKey = sanitizeKey(key);
    const target = path.join(UPLOAD_ROOT, safeKey);

    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file);

    return `${LOCAL_FILE_PREFIX}${safeKey}`;
  }

  async read(reference: string): Promise<Buffer | null> {
    if (!reference.startsWith(LOCAL_FILE_PREFIX)) return null;
    const key = sanitizeKey(reference.slice(LOCAL_FILE_PREFIX.length));
    const target = path.join(UPLOAD_ROOT, key);

    // Belt and braces over sanitizeKey: confirm the resolved path is still
    // inside the upload root before opening it.
    if (!path.resolve(target).startsWith(UPLOAD_ROOT + path.sep)) return null;

    try {
      return await fs.readFile(target);
    } catch {
      return null;
    }
  }

  async delete(url: string): Promise<void> {
    if (!url.startsWith(LOCAL_FILE_PREFIX)) return;
    const key = sanitizeKey(url.slice(LOCAL_FILE_PREFIX.length));
    await fs.rm(path.join(UPLOAD_ROOT, key), { force: true });
  }
}

/**
 * Files held in the database.
 *
 * The default when no bucket is configured, replacing a local-filesystem
 * fallback that could not work on a serverless host: `process.cwd()` there
 * is read-only, so the first mkdir threw and every upload failed with an
 * unexplained error. This works identically on Vercel, on a school's own
 * server, and on a laptop, with nothing to configure.
 */
class DatabaseStorage implements StorageDriver {
  async save(key: string, file: Buffer, contentType: string): Promise<string> {
    const safeKey = sanitizeKey(key);

    // Imported lazily so this module stays importable from the Edge runtime,
    // which has no Prisma.
    const { prisma } = await import("./db");
    await prisma.storedFile.create({
      data: { key: safeKey, contentType, bytes: file, size: file.length },
    });

    return `${LOCAL_FILE_PREFIX}${safeKey}`;
  }

  async read(reference: string): Promise<Buffer | null> {
    if (!reference.startsWith(LOCAL_FILE_PREFIX)) return null;
    const key = sanitizeKey(reference.slice(LOCAL_FILE_PREFIX.length));

    const { prisma } = await import("./db");
    const row = await prisma.storedFile.findUnique({
      where: { key },
      select: { bytes: true },
    });

    return row ? Buffer.from(row.bytes) : null;
  }

  async delete(reference: string): Promise<void> {
    if (!reference.startsWith(LOCAL_FILE_PREFIX)) return;
    const key = sanitizeKey(reference.slice(LOCAL_FILE_PREFIX.length));

    const { prisma } = await import("./db");
    // deleteMany rather than delete: removing a file that is already gone is
    // success, not an error to propagate into an upload.
    await prisma.storedFile.deleteMany({ where: { key } });
  }

  /** The content type, needed by the route that serves these. */
  async contentType(reference: string): Promise<string | null> {
    if (!reference.startsWith(LOCAL_FILE_PREFIX)) return null;
    const key = sanitizeKey(reference.slice(LOCAL_FILE_PREFIX.length));

    const { prisma } = await import("./db");
    const row = await prisma.storedFile.findUnique({
      where: { key },
      select: { contentType: true },
    });
    return row?.contentType ?? null;
  }
}

class VercelBlobStorage implements StorageDriver {
  async save(key: string, file: Buffer, contentType: string): Promise<string> {
    // Imported lazily so a self-hosted deployment never loads the Vercel SDK.
    const { put } = await import("@vercel/blob");
    const blob = await put(sanitizeKey(key), file, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    return blob.url;
  }

  async read(reference: string): Promise<Buffer | null> {
    // Fetched server-side so the blob URL itself never reaches the browser
    // — on Vercel Blob a "public" URL is public to anyone holding it.
    try {
      const response = await fetch(reference);
      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
    } catch {
      return null;
    }
  }

  async delete(url: string): Promise<void> {
    const { del } = await import("@vercel/blob");
    await del(url);
  }
}

/**
 * Rejects anything that could escape the upload root.
 *
 * Keys are built from a fixed prefix and a generated filename today, but
 * this is the only thing standing between a future caller that forwards a
 * user-supplied name and an arbitrary filesystem write.
 */
function sanitizeKey(key: string): string {
  /*
   * Reject rather than sanitise. Stripping "../" and carrying on would have
   * written `../../etc/evil.png` to `uploads/etc/evil.png` — contained, but
   * silently not the path that was asked for. A caller passing a traversal
   * sequence has a bug or is an attack; either way the write should fail
   * loudly instead of landing somewhere unexpected.
   */
  if (!key || path.isAbsolute(key) || /(^|[/\\])\.\.([/\\]|$)/.test(key)) {
    throw new Error("Invalid upload path.");
  }

  const normalized = path.normalize(key).replace(/^[/\\]+/, "");

  // Belt and braces: normalisation must not have produced a traversal either.
  if (!normalized || normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Invalid upload path.");
  }

  return normalized.split(path.sep).join("/");
}

/**
 * Which driver handles uploads, in order of explicitness.
 *
 * A bucket when one is configured, because that is the right answer at
 * scale. A directory when an operator has deliberately named one, for a
 * school that wants files on its own disk. Otherwise the database — which
 * needs no configuration and cannot fail because of a read-only filesystem
 * or an environment variable that never reached the running app.
 *
 * The previous default was the local filesystem, and it is why uploads
 * failed in production with an unexplained error: a serverless host's
 * working directory is read-only, so the very first write threw.
 */
export const storage: StorageDriver = process.env.BLOB_READ_WRITE_TOKEN
  ? new VercelBlobStorage()
  : process.env.UPLOAD_DIR
    ? new LocalStorage()
    : new DatabaseStorage();

/** Which driver is active, for diagnostics and the environment check. */
export const storageDriverName: "vercel-blob" | "filesystem" | "database" =
  process.env.BLOB_READ_WRITE_TOKEN
    ? "vercel-blob"
    : process.env.UPLOAD_DIR
      ? "filesystem"
      : "database";


/** A collision-free filename that keeps the original extension. */
export function uploadKey(folder: string, extension: string): string {
  const stamp = Date.now().toString(36);
  const noise = randomBytes(6).toString("hex");
  return `${folder}/${stamp}-${noise}.${extension}`;
}

/** Weak ETag for cache validation on served files. */
export function etagFor(buffer: Buffer): string {
  return `"${createHash("sha1").update(buffer).digest("hex").slice(0, 32)}"`;
}

/**
 * Server-side ceilings, deliberately below the 4MB Server Action body limit
 * so an oversized file produces our message rather than the framework's
 * generic one. The browser downscales before sending, so these are a
 * backstop against a direct POST, not the size anything actually arrives at.
 */
export const UPLOAD_LIMITS = {
  logo: {
    maxBytes: 3 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"],
  },
  /** Photographs of a building, so no SVG. */
  photo: {
    maxBytes: 3 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/avif"],
  },
  attachment: { maxBytes: 10 * 1024 * 1024, allowedMimeTypes: [] as string[] },
  /**
   * A photographed datesheet. Larger than a logo because it is a picture of
   * a dense table that has to stay legible when a parent zooms in on a
   * phone, and no SVG — these come from a camera, and an SVG upload is a
   * script upload.
   */
  datesheet: {
    maxBytes: 3 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/avif"],
  },
} as const;
