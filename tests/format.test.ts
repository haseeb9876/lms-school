import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatCurrency,
  formatPercent,
  formatRelativeTime,
  formatTimeOfDay,
  humanizeEnum,
  toDateInputValue,
  toSchoolDateString,
  todaySchoolDate,
} from "@/lib/format";

afterEach(() => {
  vi.useRealTimers();
});

describe("todaySchoolDate", () => {
  it("uses the school's calendar day, not the server's UTC day", () => {
    /*
     * This is the bug this function exists for. At 19:36 UTC it is already
     * the next day in Karachi (UTC+5), so a UTC-derived "today" would offer
     * a teacher yesterday's date for the register they are standing in —
     * and the future-date guard would then reject the correct one.
     */
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T19:36:00.000Z"));

    expect(todaySchoolDate()).toBe("2026-09-12");
  });

  it("agrees with UTC during the rest of the day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-12T08:00:00.000Z"));

    expect(todaySchoolDate()).toBe("2026-09-12");
  });

  it("returns the shape a date input requires", () => {
    expect(todaySchoolDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("toDateInputValue", () => {
  it("reads UTC components so a stored @db.Date never shifts a day", () => {
    // Attendance dates are stored at UTC midnight; converting them to a
    // local calendar day would move them in any negative-offset zone.
    expect(toDateInputValue(new Date("2026-09-12T00:00:00.000Z"))).toBe("2026-09-12");
  });
});

describe("toSchoolDateString", () => {
  it("maps an instant to the school-local day it falls on", () => {
    expect(toSchoolDateString(new Date("2026-09-11T19:36:00.000Z"))).toBe("2026-09-12");
    expect(toSchoolDateString(new Date("2026-09-11T10:00:00.000Z"))).toBe("2026-09-11");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-09-12T12:00:00.000Z");

  it("describes the past in the past tense", () => {
    expect(formatRelativeTime(new Date("2026-09-10T12:00:00.000Z"), now)).toContain("days ago");
  });

  it("describes the future in the future tense", () => {
    expect(formatRelativeTime(new Date("2026-09-14T12:00:00.000Z"), now)).toMatch(/in \d+ days/);
  });

  it("collapses anything under a minute to 'just now'", () => {
    expect(formatRelativeTime(new Date("2026-09-12T11:59:30.000Z"), now)).toBe("just now");
  });
});

describe("formatTimeOfDay", () => {
  it("converts stored 24-hour slot times to a readable clock", () => {
    expect(formatTimeOfDay("08:00")).toBe("8:00 AM");
    expect(formatTimeOfDay("12:05")).toBe("12:05 PM");
    expect(formatTimeOfDay("13:30")).toBe("1:30 PM");
    // Midnight is 12 AM, not 0 AM.
    expect(formatTimeOfDay("00:15")).toBe("12:15 AM");
  });

  it("returns malformed input unchanged rather than NaN", () => {
    expect(formatTimeOfDay("not-a-time")).toBe("not-a-time");
  });
});

describe("formatCurrency", () => {
  it("renders whole rupees", () => {
    const formatted = formatCurrency(7700);
    expect(formatted).toContain("7,700");
    expect(formatted).not.toContain(".");
  });
});

describe("formatPercent", () => {
  it("honours the requested precision", () => {
    expect(formatPercent(92.456, 1)).toBe("92.5%");
    expect(formatPercent(92.456, 0)).toBe("92%");
  });
});

describe("humanizeEnum", () => {
  it("turns an enum constant into a sentence-case label", () => {
    expect(humanizeEnum("IN_PROGRESS")).toBe("In progress");
    expect(humanizeEnum("BANK_TRANSFER")).toBe("Bank transfer");
  });
});
