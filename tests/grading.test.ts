import { describe, expect, it } from "vitest";
import { GRADE_BANDS, gradeForPercentage, gradeTone, isPassing } from "@/lib/grading";

describe("gradeForPercentage", () => {
  it("awards the documented grade for each band", () => {
    expect(gradeForPercentage(95)).toBe("A+");
    expect(gradeForPercentage(75)).toBe("A");
    expect(gradeForPercentage(65)).toBe("B");
    expect(gradeForPercentage(55)).toBe("C");
    expect(gradeForPercentage(45)).toBe("D");
    expect(gradeForPercentage(10)).toBe("F");
  });

  it("treats each threshold as inclusive", () => {
    // A student on exactly 80 gets the A+, not the grade below it — the
    // off-by-one here is the difference between a distinction and not.
    for (const band of GRADE_BANDS) {
      expect(gradeForPercentage(band.minPercent)).toBe(band.grade);
    }
  });

  it("handles the edges without falling through", () => {
    expect(gradeForPercentage(100)).toBe("A+");
    expect(gradeForPercentage(0)).toBe("F");
    // Marks can't legitimately be negative, but a grade is still better than
    // an undefined here.
    expect(gradeForPercentage(-5)).toBe("F");
  });
});

describe("isPassing", () => {
  it("passes at the 40% pass mark and fails below it", () => {
    expect(isPassing(40)).toBe(true);
    expect(isPassing(39.9)).toBe(false);
  });
});

describe("gradeTone", () => {
  it("maps grades to a consistent badge tone", () => {
    expect(gradeTone("A+")).toBe("success");
    expect(gradeTone("A")).toBe("success");
    expect(gradeTone("B")).toBe("info");
    expect(gradeTone("D")).toBe("warning");
    expect(gradeTone("F")).toBe("danger");
  });

  it("stays neutral for an ungraded result", () => {
    expect(gradeTone(null)).toBe("neutral");
  });
});
