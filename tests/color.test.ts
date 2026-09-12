import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  isBrandColorAccessible,
  isValidHexColor,
  readableTextColor,
  softTint,
} from "@/lib/color";
import { firstNameOf } from "@/components/dashboards/Greeting";

describe("readableTextColor", () => {
  it("picks the foreground that actually contrasts", () => {
    // A principal can set any brand colour, and every button label in the
    // app is then painted with whatever this returns.
    expect(readableTextColor("#0e6e68")).toBe("#FFFFFF");
    expect(readableTextColor("#ffeb3b")).toBe("#111111");
    expect(readableTextColor("#000000")).toBe("#FFFFFF");
    expect(readableTextColor("#ffffff")).toBe("#111111");
  });

  it("always returns a foreground that clears 4.5:1", () => {
    for (const hex of ["#0e6e68", "#ffeb3b", "#2064b4", "#c23b2c", "#7d4bc4", "#eda100"]) {
      expect(contrastRatio(hex, readableTextColor(hex))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("isBrandColorAccessible", () => {
  it("accepts colours dark enough to read as text on a white card", () => {
    expect(isBrandColorAccessible("#0e6e68")).toBe(true);
    expect(isBrandColorAccessible("#2064b4")).toBe(true);
    expect(isBrandColorAccessible("#c23b2c")).toBe(true);
  });

  it("rejects pale colours that vanish when used as text", () => {
    // These are exactly the colours the previous implementation waved
    // through: `bg-brand` buttons still look fine with them, while every
    // `text-brand` link becomes unreadable.
    expect(isBrandColorAccessible("#ffeb3b")).toBe(false);
    expect(isBrandColorAccessible("#a8e6cf")).toBe(false);
    expect(isBrandColorAccessible("#ffffff")).toBe(false);
  });

  it("actually rejects something — the check is not vacuous", () => {
    /*
     * The bug this replaced: the old rule asked whether *some* foreground
     * read against the brand, which is true for every colour that exists,
     * so the branding form validated nothing. Sampling the RGB cube keeps
     * any future rewrite honest.
     */
    let rejected = 0;
    for (let r = 0; r < 256; r += 17) {
      for (let g = 0; g < 256; g += 17) {
        for (let b = 0; b < 256; b += 17) {
          const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
          if (!isBrandColorAccessible(hex)) rejected++;
        }
      }
    }
    expect(rejected).toBeGreaterThan(0);
  });
});

describe("isValidHexColor", () => {
  it("accepts three and six digit hex", () => {
    expect(isValidHexColor("#abc")).toBe(true);
    expect(isValidHexColor("#0e6e68")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isValidHexColor("0e6e68")).toBe(false);
    expect(isValidHexColor("#12345")).toBe(false);
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("#ggg")).toBe(false);
  });
});

describe("softTint", () => {
  it("produces a valid, lighter hex", () => {
    const tint = softTint("#0e6e68");
    expect(isValidHexColor(tint)).toBe(true);
    expect(contrastRatio(tint, "#ffffff")).toBeLessThan(contrastRatio("#0e6e68", "#ffffff"));
  });
});

describe("firstNameOf", () => {
  it("skips an honorific rather than greeting the title", () => {
    expect(firstNameOf("Dr. Sameena Iqbal")).toBe("Sameena");
    expect(firstNameOf("Mrs Ayesha Khan")).toBe("Ayesha");
    expect(firstNameOf("Syed Bilal Shah")).toBe("Bilal");
  });

  it("returns the given name when there is no title", () => {
    expect(firstNameOf("Ali Ahmed")).toBe("Ali");
    expect(firstNameOf("Rimsha")).toBe("Rimsha");
  });

  it("falls back rather than greeting nobody", () => {
    expect(firstNameOf("Dr.")).toBe("Dr.");
  });
});
