import { ImageResponse } from "next/og";
import { getBrandingSettings } from "@/lib/branding";
import { readableTextColor } from "@/lib/color";

/**
 * The installed app's icon, drawn from whatever the school has uploaded.
 *
 * Generated rather than shipped as a file, because the whole point is that a
 * principal changing the logo changes the icon on every phone that installed
 * the app. A static PNG in `public/` could not do that.
 *
 * Two shapes are produced from the same source:
 *
 *   - the plain icon, used where the platform draws it as-is;
 *   - a *maskable* one, which Android crops to whatever shape the launcher
 *     uses — a circle, a squircle, a rounded square. A maskable icon must
 *     keep its content inside the middle ~80%, or the launcher slices the
 *     edges off the logo. That is why it is padded onto a filled background
 *     rather than being the same image at a different size.
 *
 * When no logo has been uploaded the monogram stands in, matching the
 * favicon so an installed app never shows a stranger's placeholder.
 */
export const runtime = "nodejs";

const ALLOWED_SIZES = [192, 512];

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;

  const requested = Number(params.get("size") ?? 512);
  const size = ALLOWED_SIZES.includes(requested) ? requested : 512;
  const maskable = params.get("maskable") === "1";
  const versioned = params.has("v");

  const branding = await getBrandingSettings();
  const background = branding.primaryColor;
  const ink = readableTextColor(background);

  /*
   * Fetched here rather than handed to ImageResponse as a URL, for two
   * reasons. It lets a relative path (local filesystem storage) be resolved
   * against this request's own origin, which is correct on localhost, on a
   * preview deployment and on the real domain without configuring any of
   * them. And it means a logo that cannot be loaded — the exact situation
   * when an image uploaded to one host is served from another — falls back
   * to the monogram instead of throwing, which would leave the installed app
   * with no icon at all.
   */
  const logo = await loadLogo(branding.logoUrl, request.url);

  // Safe zone for maskable icons: content occupies the middle 80%.
  const inset = maskable ? Math.round(size * 0.1) : 0;
  const inner = size - inset * 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // A maskable icon is cropped, so it must be opaque to the edges.
          // A plain icon carrying a logo stays transparent-ish behind it.
          background: maskable || !logo ? background : "transparent",
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            width={inner}
            height={inner}
            style={{ width: inner, height: inner, objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              width: inner,
              height: inner,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: ink,
              fontSize: Math.round(inner * 0.58),
              fontWeight: 700,
              fontFamily: "sans-serif",
            }}
          >
            {branding.schoolName.trim().charAt(0).toUpperCase() || "S"}
          </div>
        )}
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        /*
         * Safe to cache hard *because* the URL carries the branding version:
         * a new logo produces a different URL, so nothing has to expire for
         * the change to appear. A request without a version is treated as
         * unversioned and revalidated, since it could be anyone's bookmark.
         */
        "Cache-Control": versioned
          ? "public, max-age=31536000, immutable"
          : "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}

async function loadLogo(logoUrl: string | null, requestUrl: string): Promise<string | null> {
  if (!logoUrl) return null;

  // An SVG cannot be rasterised here, so the monogram stands in rather than
  // the icon rendering empty.
  if (logoUrl.toLowerCase().endsWith(".svg")) return null;

  const absolute = /^https?:\/\//i.test(logoUrl)
    ? logoUrl
    : new URL(logoUrl, requestUrl).toString();

  try {
    // Bounded: an icon request must not hang because storage is slow.
    const response = await fetch(absolute, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;

    const type = response.headers.get("content-type") ?? "image/png";
    if (!type.startsWith("image/")) return null;

    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
