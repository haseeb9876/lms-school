/**
 * Shrinks an image in the browser before it is uploaded.
 *
 * Two problems this solves, one of which was breaking uploads outright.
 *
 * A Server Action caps its request body at 1MB by default, and every host
 * puts its own ceiling on top of that — Vercel's serverless functions stop
 * at 4.5MB however the framework is configured. Meanwhile the actual inputs
 * are phone photographs: a picture of a datesheet pinned to a wall comes off
 * a modern camera at 4000×3000 and four to eight megabytes. Those uploads
 * could not succeed, and the error arrived after the whole file had been
 * sent.
 *
 * The second problem is the one that matters even when uploads work. This
 * school is in Peshawar and the people using it are on mobile data. Sending
 * six megabytes to store a picture that will be displayed 800 pixels wide is
 * slow, expensive for them, and pointless.
 *
 * So the file is decoded, resized to something generous but sane, and
 * re-encoded before it leaves the device. A datesheet photograph typically
 * lands somewhere around 300–500KB and stays completely legible when zoomed,
 * which is the only thing it has to do.
 *
 * Deliberately not a Vercel-specific direct-to-blob upload: that would fix
 * the size limit and nothing else, and it would not work on the ordinary
 * server a school runs this on after buying it.
 */

export interface CompressOptions {
  /** Longest edge, in pixels. Images already smaller are not enlarged. */
  maxEdge: number;
  /** Target size. Quality steps down until the result fits, or runs out. */
  maxBytes: number;
  /**
   * Keep transparency. Logos need it — a transparent PNG flattened onto
   * white looks fine on the login card and wrong on a dark sidebar.
   */
  preserveAlpha?: boolean;
}

export interface CompressResult {
  file: File;
  /** False when the original was already small enough to send untouched. */
  changed: boolean;
  originalBytes: number;
  bytes: number;
}

/** Quality ladder, tried in order until the result fits the budget. */
const QUALITY_STEPS = [0.9, 0.82, 0.72, 0.62, 0.5];

/**
 * The target dimensions for an image, preserving aspect ratio.
 *
 * Exported so the arithmetic can be tested without a canvas. The rule that
 * matters is that images are never *enlarged*: a 200px logo asked to fit a
 * 512px box must stay 200px, because upscaling invents detail that was never
 * there and makes a crisp small logo look soft.
 */
export function planResize(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number; scale: number } {
  const longest = Math.max(width, height);
  const scale = longest > 0 ? Math.min(1, maxEdge / longest) : 1;

  return {
    scale,
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Whether an image can be sent exactly as it is.
 *
 * Only when it needs no resizing *and* already fits the byte budget.
 * Re-encoding something that is already small enough risks making it larger
 * and always loses a little quality for nothing.
 */
export function canSendUntouched(bytes: number, maxBytes: number, scale: number): boolean {
  return scale === 1 && bytes <= maxBytes;
}

export async function compressImage(
  file: File,
  options: CompressOptions
): Promise<CompressResult> {
  const originalBytes = file.size;

  /*
   * SVG is vector: it has no pixels to resample, drawing it to a canvas
   * would rasterise it and lose the thing that makes it worth uploading.
   * It is also tiny already. Passed through untouched.
   */
  if (file.type === "image/svg+xml") {
    return { file, changed: false, originalBytes, bytes: originalBytes };
  }

  const bitmap = await decode(file);
  if (!bitmap) {
    // Undecodable here does not mean invalid — let the server judge it, so a
    // format this browser lacks a decoder for still gets a real error.
    return { file, changed: false, originalBytes, bytes: originalBytes };
  }

  const { width, height, scale } = planResize(bitmap.width, bitmap.height, options.maxEdge);

  if (canSendUntouched(originalBytes, options.maxBytes, scale)) {
    bitmap.close?.();
    return { file, changed: false, originalBytes, bytes: originalBytes };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close?.();
    return { file, changed: false, originalBytes, bytes: originalBytes };
  }

  // Browsers default to a fast, blocky downscale. A datesheet is dense text,
  // so quality here is the difference between readable and not.
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const wantsAlpha = options.preserveAlpha === true;
  const format = await pickFormat(wantsAlpha);

  // JPEG has no alpha, so transparent pixels would otherwise come out black.
  if (format === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let best: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    const blob = await toBlob(canvas, format, quality);
    if (!blob) break;
    best = blob;
    if (blob.size <= options.maxBytes) break;
  }

  if (!best) {
    return { file, changed: false, originalBytes, bytes: originalBytes };
  }

  /*
   * If all that work produced something larger than what we started with —
   * which happens with an already-optimised PNG of flat colour — keep the
   * original. Re-encoding is a means, not the goal.
   */
  if (best.size >= originalBytes && scale === 1) {
    return { file, changed: false, originalBytes, bytes: originalBytes };
  }

  const extension = format === "image/png" ? "png" : format === "image/webp" ? "webp" : "jpg";
  const renamed = `${stripExtension(file.name) || "upload"}.${extension}`;

  return {
    file: new File([best], renamed, { type: format, lastModified: Date.now() }),
    changed: true,
    originalBytes,
    bytes: best.size,
  };
}

/**
 * `createImageBitmap` with `imageOrientation: "from-image"` applies the EXIF
 * rotation a phone camera records instead of embedding. Without it, a photo
 * taken in portrait is stored on its side — and the person who took it will
 * reasonably conclude the upload is broken.
 */
async function decode(file: File): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      // Older Safari rejects the options argument rather than ignoring it.
      return await createImageBitmap(file);
    } catch {
      return null;
    }
  }
}

/**
 * WebP where it exists: it is markedly smaller than JPEG at the same visual
 * quality and, unlike JPEG, it keeps transparency — so one format covers
 * both a photograph and a logo cut out against nothing.
 */
async function pickFormat(wantsAlpha: boolean): Promise<string> {
  if (await supportsWebp()) return "image/webp";
  return wantsAlpha ? "image/png" : "image/jpeg";
}

let webpSupport: Promise<boolean> | null = null;

function supportsWebp(): Promise<boolean> {
  if (!webpSupport) {
    webpSupport = (async () => {
      try {
        const probe = document.createElement("canvas");
        probe.width = 1;
        probe.height = 1;
        const blob = await toBlob(probe, "image/webp", 0.9);
        // A browser that cannot encode WebP silently hands back a PNG.
        return blob?.type === "image/webp";
      } catch {
        return false;
      }
    })();
  }
  return webpSupport;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

/** Human-readable size, for telling someone what actually happened. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
