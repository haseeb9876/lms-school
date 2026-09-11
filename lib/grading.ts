/**
 * The school's grading scale, in one place.
 *
 * Grades are stored on ExamResult rather than derived at read time, so that
 * a result card issued last term still shows the grade the school actually
 * awarded even if the scale is changed later. That makes it important that
 * everything writing a grade uses the same function — hence this module
 * rather than a copy of the thresholds at each call site.
 */

export interface GradeBand {
  grade: string;
  minPercent: number;
  label: string;
}

/** Ordered highest first; the first band a percentage clears wins. */
export const GRADE_BANDS: GradeBand[] = [
  { grade: "A+", minPercent: 80, label: "Outstanding" },
  { grade: "A", minPercent: 70, label: "Excellent" },
  { grade: "B", minPercent: 60, label: "Good" },
  { grade: "C", minPercent: 50, label: "Satisfactory" },
  { grade: "D", minPercent: 40, label: "Needs improvement" },
  { grade: "F", minPercent: 0, label: "Fail" },
];

export function gradeForPercentage(percentage: number): string {
  return GRADE_BANDS.find((band) => percentage >= band.minPercent)?.grade ?? "F";
}

export function isPassing(percentage: number): boolean {
  return percentage >= 40;
}

/** Badge tone for a grade, so results read consistently across screens. */
export function gradeTone(grade: string | null): "success" | "info" | "warning" | "danger" | "neutral" {
  if (!grade) return "neutral";
  if (grade.startsWith("A")) return "success";
  if (grade === "B") return "info";
  if (grade === "C" || grade === "D") return "warning";
  return "danger";
}
