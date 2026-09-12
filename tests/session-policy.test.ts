import { describe, expect, it } from "vitest";
import { classifyDevice, describeDevice } from "../lib/auth/device";
import { isPastAbsoluteDeadline, refreshCookieMaxAge, DESKTOP_SESSION_MAX_MS } from "../lib/auth/tokens";
import type { AccessTokenPayload } from "../lib/auth/tokens";

function headers(values: Record<string, string>): Headers {
  return new Headers(values);
}

/**
 * The device class decides whether a session lasts a day or indefinitely,
 * so a misclassification is a security decision made by accident. These
 * pin the two directions that matter: real phones get the phone policy,
 * and everything ambiguous gets the shorter one.
 */
describe("classifyDevice", () => {
  it("believes the browser's own client hint over the user-agent string", () => {
    // A desktop UA with the mobile hint set — Chrome on Android in
    // "request desktop site" mode sends exactly this combination.
    expect(
      classifyDevice(
        headers({
          "sec-ch-ua-mobile": "?1",
          "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0.0.0 Safari/537.36",
        })
      )
    ).toBe("MOBILE");

    expect(
      classifyDevice(
        headers({ "sec-ch-ua-mobile": "?0", "user-agent": "Mozilla/5.0 (Linux; Android 13) Mobile" })
      )
    ).toBe("DESKTOP");
  });

  it("recognises phones that don't send client hints", () => {
    const iphone =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    const android =
      "Mozilla/5.0 (Linux; Android 13; SM-A155F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

    expect(classifyDevice(headers({ "user-agent": iphone }))).toBe("MOBILE");
    expect(classifyDevice(headers({ "user-agent": android }))).toBe("MOBILE");
  });

  it("treats tablets, unknown clients and empty requests as desktop", () => {
    // Every one of these is a case where guessing wrong in the other
    // direction would hand out an unlimited session.
    const ipad =
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1";
    const androidTablet =
      "Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

    expect(classifyDevice(headers({ "user-agent": ipad }))).toBe("DESKTOP");
    expect(classifyDevice(headers({ "user-agent": androidTablet }))).toBe("DESKTOP");
    expect(classifyDevice(headers({ "user-agent": "curl/8.4.0" }))).toBe("DESKTOP");
    expect(classifyDevice(headers({}))).toBe("DESKTOP");
  });
});

describe("session lifetime policy", () => {
  const base: AccessTokenPayload = {
    sub: "user_1",
    role: "TEACHER",
    sid: "session_1",
    dev: "DESKTOP",
  };

  it("expires a desktop session the moment its deadline passes", () => {
    const deadline = Date.UTC(2026, 8, 12, 9, 0, 0);
    const token: AccessTokenPayload = { ...base, ae: deadline };

    expect(isPastAbsoluteDeadline(token, deadline - 1)).toBe(false);
    expect(isPastAbsoluteDeadline(token, deadline)).toBe(true);
    expect(isPastAbsoluteDeadline(token, deadline + 60_000)).toBe(true);
  });

  it("never expires a phone session, however long ago it started", () => {
    const phone: AccessTokenPayload = { ...base, dev: "MOBILE" };
    const fiveYears = Date.now() + 5 * 365 * 24 * 60 * 60 * 1000;

    // No deadline claim at all is the representation of "no ceiling" — a
    // very distant deadline would still eventually sign someone out.
    expect(phone.ae).toBeUndefined();
    expect(isPastAbsoluteDeadline(phone, fiveYears)).toBe(false);
  });

  it("caps desktop at exactly 24 hours and outlives that on phones", () => {
    expect(DESKTOP_SESSION_MAX_MS).toBe(24 * 60 * 60 * 1000);
    expect(refreshCookieMaxAge("DESKTOP")).toBe(24 * 60 * 60);
    expect(refreshCookieMaxAge("MOBILE")).toBeGreaterThan(refreshCookieMaxAge("DESKTOP") * 300);
  });

  it("applies the ceiling to tokens issued before the policy existed", () => {
    // Such a token has no `dev` claim; verifyAccessToken defaults it to
    // DESKTOP so old sessions don't inherit the unlimited phone policy.
    const legacy = { ...base } as AccessTokenPayload;
    expect(legacy.dev).toBe("DESKTOP");
  });
});

describe("describeDevice", () => {
  it("names the browser even though they all impersonate each other", () => {
    // Edge claims Chrome and Safari; Chrome claims Safari. Testing the
    // order is the point — a naive check labels everything "Safari".
    expect(
      describeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36 Edg/120.0")
    ).toBe("Windows · Edge");
    expect(
      describeDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36")
    ).toBe("Mac · Chrome");
    expect(
      describeDevice(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe("iPhone · Safari");
  });

  it("degrades to something readable rather than blank", () => {
    expect(describeDevice(null)).toBe("Unknown device");
    expect(describeDevice("")).toBe("Unknown device");
    expect(describeDevice("SomeBot/1.0")).toBe("Unknown device");
  });
});
