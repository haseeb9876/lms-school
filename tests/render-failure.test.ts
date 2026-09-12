import { describe, expect, it } from "vitest";
import {
  threwWhileRendering,
  renderFailureDetail,
  streamedRedirectTarget,
} from "../scripts/lib/render-failure";

/**
 * These payload shapes are copied from real responses this app produced, not
 * invented. The distinction they encode — a thrown error versus a redirect,
 * both of which React serializes as an error row — is the one that decides
 * whether the verification suite can see a broken page at all.
 */
const REAL_ERROR_DEV =
  'self.__next_f.push([1,"2c2:E{\\"digest\\":\\"2396966603\\",\\"name\\":\\"Error\\",\\"message\\":\\"Cannot read properties of undefined (reading \'findFirst\')\\",\\"stack\\":[[\\"getUpcomingDatesheet\\"]]}\\n"])';

// Production withholds the message and stack; only the digest survives.
const REAL_ERROR_PROD = 'self.__next_f.push([1,"2c2:E{\\"digest\\":\\"2396966603\\"}\\n"])';

const REDIRECT =
  'self.__next_f.push([1,"4b6:E{\\"digest\\":\\"NEXT_REDIRECT;replace;/attendance/mark?section=seed_sect_0000025\\u0026date=2026-09-13;307;\\"}\\n"])';

const NOT_FOUND = 'self.__next_f.push([1,"3a1:E{\\"digest\\":\\"NEXT_NOT_FOUND\\"}\\n"])';

const HEALTHY =
  'self.__next_f.push([1,"2:[\\"$\\",\\"main\\",null,{\\"id\\":\\"main-content\\"}]\\n"])<div>Good evening, Sameena</div>';

describe("threwWhileRendering", () => {
  it("sees a real failure that the status code cannot show", () => {
    // Both of these were served as HTTP 200 with the error inside.
    expect(threwWhileRendering(REAL_ERROR_DEV)).toBe(true);
    expect(threwWhileRendering(REAL_ERROR_PROD)).toBe(true);
  });

  it("does not mistake a redirect for a failure", () => {
    // redirect() and notFound() are implemented by throwing, so they produce
    // an identically-shaped row. Treating them as breakage reported a
    // correctly-defaulting register page as broken.
    expect(threwWhileRendering(REDIRECT)).toBe(false);
    expect(threwWhileRendering(NOT_FOUND)).toBe(false);
  });

  it("leaves a healthy page alone", () => {
    expect(threwWhileRendering(HEALTHY)).toBe(false);
    expect(threwWhileRendering("")).toBe(false);
  });

  it("still reports a real failure that accompanies a redirect", () => {
    // A page can redirect in one boundary and throw in another; the throw is
    // what matters and must not be masked by the redirect sitting next to it.
    expect(threwWhileRendering(REDIRECT + REAL_ERROR_PROD)).toBe(true);
  });
});

describe("streamedRedirectTarget", () => {
  it("extracts the destination, decoding the escaped ampersand", () => {
    expect(streamedRedirectTarget(REDIRECT)).toBe(
      "/attendance/mark?section=seed_sect_0000025&date=2026-09-13"
    );
  });

  it("returns nothing when the page did not redirect", () => {
    expect(streamedRedirectTarget(HEALTHY)).toBeNull();
    expect(streamedRedirectTarget(REAL_ERROR_PROD)).toBeNull();
  });
});

describe("renderFailureDetail", () => {
  it("quotes the message in development, where one is given", () => {
    expect(renderFailureDetail(REAL_ERROR_DEV)).toContain("findFirst");
  });

  it("falls back to the digest in production, which is what the log carries", () => {
    expect(renderFailureDetail(REAL_ERROR_PROD)).toBe("page threw (digest 2396966603)");
  });
});
