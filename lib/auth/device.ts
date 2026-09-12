import type { DeviceClass } from "./tokens";

export type { DeviceClass };

/**
 * Phone-shaped or desktop-shaped, decided from request headers at sign-in.
 *
 * This choice decides how long the session may live (24 hours on a desktop,
 * unlimited on a phone), so it is worth getting right rather than guessing
 * from a user-agent substring alone.
 *
 * `Sec-CH-UA-Mobile` is a structured header the browser sets itself — "?1"
 * for mobile, "?0" for not — and Chrome, Edge and every Chromium browser on
 * Android send it on the top-level request without the site having to ask.
 * When it is present it is believed, because it is the browser's own answer
 * to exactly this question.
 *
 * Safari and Firefox do not send it, which is most iPhones, so the
 * user-agent fallback still matters. It is checked for the tokens Apple and
 * Mozilla actually put there rather than a general "mobile" match: an iPad
 * reports "Macintosh" in desktop-site mode and a Windows tablet is a
 * desktop, and both of those are shared-device situations where the
 * 24-hour ceiling is the behaviour we want anyway.
 *
 * Anything unrecognised — a crawler, a script, a browser nobody has heard
 * of — is classified DESKTOP. Every ambiguous case therefore lands on the
 * policy with the shorter session, which is the direction to fail in.
 */
export function classifyDevice(headers: Headers): DeviceClass {
  const hint = headers.get("sec-ch-ua-mobile");
  if (hint === "?1") return "MOBILE";
  if (hint === "?0") return "DESKTOP";

  const ua = headers.get("user-agent") ?? "";
  if (!ua) return "DESKTOP";

  // iPadOS deliberately impersonates macOS, so "iPad" alone is not enough;
  // a touch-capable Macintosh is the tell. Either way an iPad is a device
  // that gets passed around a staffroom, so DESKTOP is the right default
  // and only an explicitly phone-shaped UA opts into the phone policy.
  if (/\b(iPhone|iPod)\b/i.test(ua)) return "MOBILE";
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return "MOBILE";
  if (/\b(Windows Phone|IEMobile|Opera Mini|BlackBerry|webOS)\b/i.test(ua)) return "MOBILE";

  return "DESKTOP";
}

/**
 * A short, human label for the device list on the security page. Kept
 * deliberately coarse — enough for someone to recognise "that's my phone"
 * or "that isn't mine", without turning the page into a fingerprint.
 */
export function describeDevice(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  if (!ua) return "Unknown device";

  const platform =
    /\b(iPhone|iPod)\b/i.test(ua) ? "iPhone"
    : /\biPad\b/i.test(ua) ? "iPad"
    : /Android/i.test(ua) ? "Android"
    : /\bWindows\b/i.test(ua) ? "Windows"
    : /\b(Macintosh|Mac OS X)\b/i.test(ua) ? "Mac"
    : /\b(X11|Linux)\b/i.test(ua) ? "Linux"
    : "Unknown device";

  // Order matters: Edge and Opera both claim to be Chrome, and Chrome
  // claims to be Safari, so the most specific name has to be tested first.
  const browser =
    /\bEdg\//i.test(ua) ? "Edge"
    : /\b(OPR|Opera)\//i.test(ua) ? "Opera"
    : /\bSamsungBrowser\//i.test(ua) ? "Samsung Internet"
    : /\bFirefox\//i.test(ua) ? "Firefox"
    : /\bChrome\//i.test(ua) ? "Chrome"
    : /\bSafari\//i.test(ua) ? "Safari"
    : null;

  return browser ? `${platform} · ${browser}` : platform;
}
