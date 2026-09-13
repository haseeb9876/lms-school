import { describe, expect, it } from "vitest";
import { parseTheme, themeClass, DEFAULT_THEME } from "../components/theme/constants";

/**
 * The theme is decided on the server from a cookie, because the previous
 * design could not work: a class applied by a pre-paint script is reconciled
 * away when React hydrates <html>, so every choice silently reset on reload.
 * These pin the three states that decision rests on.
 */
describe("parseTheme", () => {
  it("defaults to light when nothing has been chosen", () => {
    // Deliberately not "system": a parent whose phone is in dark mode should
    // not meet a dark ledger of fees the first time they sign in.
    expect(parseTheme(undefined)).toBe("light");
    expect(parseTheme(null)).toBe("light");
    expect(parseTheme("")).toBe("light");
    expect(DEFAULT_THEME).toBe("light");
  });

  it("honours each real choice", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("system")).toBe("system");
  });

  it("falls back rather than trusting the cookie", () => {
    // A cookie is user-editable, and its value is interpolated into a class
    // attribute — so anything unrecognised has to become the default.
    expect(parseTheme("Dark")).toBe("light");
    expect(parseTheme("dark light")).toBe("light");
    expect(parseTheme('" onload="alert(1)')).toBe("light");
    expect(parseTheme("../../etc")).toBe("light");
  });
});

describe("themeClass", () => {
  it("names the class for an explicit choice", () => {
    expect(themeClass("light")).toBe("light");
    expect(themeClass("dark")).toBe("dark");
  });

  it("writes no class for system, so the media query applies", () => {
    // globals.css styles :root:not(.light):not(.dark) for the device
    // preference — a class here would stop that ever matching.
    expect(themeClass("system")).toBe("");
  });

  it("only ever produces a known class name", () => {
    const allowed = new Set(["light", "dark", ""]);
    for (const value of ["light", "dark", "system", "nonsense", "", null, undefined]) {
      expect(allowed.has(themeClass(parseTheme(value as string)))).toBe(true);
    }
  });
});
