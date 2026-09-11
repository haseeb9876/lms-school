import { describe, expect, it } from "vitest";
import { buildHref, readEnum, readPage, readParam } from "@/lib/search-params";

describe("readEnum", () => {
  const STATUSES = ["ACTIVE", "GRADUATED", "WITHDRAWN"] as const;

  it("accepts a value from the allowed set", () => {
    expect(readEnum({ status: "ACTIVE" }, "status", STATUSES)).toBe("ACTIVE");
  });

  it("rejects anything not in the allowed set", () => {
    /*
     * These values flow straight into a Prisma `where` clause, so an
     * unrecognised one has to become undefined (no filter) rather than
     * reaching the query. This is the guard that makes a hand-edited URL
     * inert instead of interesting.
     */
    expect(readEnum({ status: "DROP TABLE users" }, "status", STATUSES)).toBeUndefined();
    expect(readEnum({ status: "active" }, "status", STATUSES)).toBeUndefined();
    expect(readEnum({}, "status", STATUSES)).toBeUndefined();
  });
});

describe("readParam", () => {
  it("takes the first value when a param repeats", () => {
    expect(readParam({ q: ["first", "second"] }, "q")).toBe("first");
  });

  it("treats blank and whitespace-only values as absent", () => {
    expect(readParam({ q: "   " }, "q")).toBeUndefined();
    expect(readParam({ q: "" }, "q")).toBeUndefined();
  });

  it("trims surrounding whitespace", () => {
    expect(readParam({ q: "  Ayesha  " }, "q")).toBe("Ayesha");
  });
});

describe("readPage", () => {
  it("defaults to the first page", () => {
    expect(readPage({})).toBe(1);
  });

  it("refuses zero, negative and non-numeric pages", () => {
    // A page of 0 or -1 would become a negative Prisma `skip` and throw.
    expect(readPage({ page: "0" })).toBe(1);
    expect(readPage({ page: "-3" })).toBe(1);
    expect(readPage({ page: "abc" })).toBe(1);
  });

  it("reads a valid page", () => {
    expect(readPage({ page: "4" })).toBe(4);
  });
});

describe("buildHref", () => {
  it("keeps existing filters when changing one value", () => {
    const href = buildHref("/students", { q: "ayesha", section: "s1" }, { page: 3 });
    expect(href).toContain("q=ayesha");
    expect(href).toContain("section=s1");
    expect(href).toContain("page=3");
  });

  it("removes a param when given undefined", () => {
    const href = buildHref("/students", { q: "ayesha", page: "2" }, { q: undefined });
    expect(href).not.toContain("q=");
    expect(href).toContain("page=2");
  });

  it("returns a bare path when nothing is left", () => {
    expect(buildHref("/students", {}, {})).toBe("/students");
  });
});
