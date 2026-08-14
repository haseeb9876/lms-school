import { put, del } from "@vercel/blob";

export interface StorageDriver {
  /** Saves a file and returns its public URL. */
  save(path: string, file: Buffer | Blob, contentType: string): Promise<string>;
  delete(url: string): Promise<void>;
}

class VercelBlobStorage implements StorageDriver {
  async save(path: string, file: Buffer | Blob, contentType: string): Promise<string> {
    const blob = await put(path, file, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    return blob.url;
  }

  async delete(url: string): Promise<void> {
    await del(url);
  }
}

/**
 * Swappable behind this interface so a self-hosted deployment could later
 * point STORAGE_DRIVER at a different implementation (e.g. S3/R2) without
 * touching call sites.
 */
export const storage: StorageDriver = new VercelBlobStorage();

export const UPLOAD_LIMITS: {
  logo: { maxBytes: number; allowedMimeTypes: string[] };
  attachment: { maxBytes: number; allowedMimeTypes: string[] };
} = {
  logo: { maxBytes: 2 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"] },
  attachment: { maxBytes: 10 * 1024 * 1024, allowedMimeTypes: [] }, // validated by magic bytes at call site
};
