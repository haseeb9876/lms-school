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
 * WCAG-ish sanity check for a brand color against both text colors it might
 * pair with — stops a principal from picking something that renders
 * effectively invisible against every reasonable foreground.
 */
export function isBrandColorAccessible(hex: string): boolean {
  return contrastRatio(hex, "#FFFFFF") >= 3 || contrastRatio(hex, "#111111") >= 3;
}

/** A soft tint of the brand color for subtle backgrounds (badges, hover states). */
export function softTint(hex: string, mixWithWhite = 0.88): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * mixWithWhite);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
