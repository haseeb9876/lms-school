function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const value = parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function isValidHexColor(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexToRgb(hexA));
  const lB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Picks readable foreground text/icon color for a given background color. */
export function readableTextColor(backgroundHex: string): "#FFFFFF" | "#111111" {
  const whiteContrast = contrastRatio(backgroundHex, "#FFFFFF");
  const blackContrast = contrastRatio(backgroundHex, "#111111");
  return whiteContrast >= blackContrast ? "#FFFFFF" : "#111111";
}

/**
 * The light surface the brand color is painted *onto* when it's used as a
 * foreground — links, the active nav item, "view details" affordances.
 * `--brand-primary-soft` is a 88% white mix of the brand, so white is a
 * close enough stand-in for both.
 */
const LIGHT_SURFACE = "#FFFFFF";

/** WCAG's minimum for large text, icons and other non-text UI. */
const UI_CONTRAST_MIN = 3;

/**
 * Whether a brand color is usable as a foreground.
 *
 * The obvious check — "does *some* foreground read against this color" — is
 * worthless here, and provably so: because `readableTextColor` picks black
 * or white per color, every color in the RGB cube passes it (the worst case
 * still clears 4.3:1). It rejected nothing, while appearing to validate.
 *
 * The contrast that can actually fail is the other direction. The brand is
 * used *as* the ink in plenty of places — `text-brand` on a white card, the
 * active nav label, link hovers — and a pale brand makes all of those
 * unreadable while `bg-brand` buttons still look fine. So this measures the
 * brand against the surface it's drawn on, which is the case that breaks.
 *
 * Known limitation: only the light surface is checked. A very dark brand is
 * still poor as ink on the dark theme's surface; fixing that properly means
 * deriving a lightened brand step for dark mode rather than rejecting the
 * color outright.
 */
export function isBrandColorAccessible(hex: string): boolean {
  return contrastRatio(hex, LIGHT_SURFACE) >= UI_CONTRAST_MIN;
}

/** A soft tint of the brand color for subtle backgrounds (badges, hover states). */
export function softTint(hex: string, mixWithWhite = 0.88): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * mixWithWhite);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
