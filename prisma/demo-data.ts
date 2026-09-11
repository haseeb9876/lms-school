/**
 * Name pools and small helpers for the demo seed.
 *
 * Kept apart from seed.ts so the seeding *logic* stays readable instead of
 * being buried under several hundred lines of literal data.
 */

export const MALE_FIRST_NAMES = [
  "Ahmed", "Ali", "Hamza", "Bilal", "Usman", "Hassan", "Hussain", "Zain", "Umar", "Ibrahim",
  "Saad", "Talha", "Faizan", "Danish", "Arsalan", "Shahzaib", "Rehan", "Mubeen", "Owais", "Haris",
  "Abdullah", "Shayan", "Ayaan", "Zohaib", "Waleed", "Junaid", "Kashif", "Naveed", "Adnan", "Fahad",
];

export const FEMALE_FIRST_NAMES = [
  "Ayesha", "Fatima", "Zainab", "Maryam", "Hira", "Sana", "Iqra", "Areeba", "Noor", "Amna",
  "Rabia", "Sadia", "Mahnoor", "Anaya", "Eman", "Laiba", "Zoya", "Hafsa", "Bushra", "Kinza",
  "Sidra", "Nimra", "Alina", "Warda", "Saba", "Komal", "Tehreem", "Mehak", "Aqsa", "Rimsha",
];

export const LAST_NAMES = [
  "Khan", "Ahmed", "Malik", "Butt", "Sheikh", "Qureshi", "Chaudhry", "Raza", "Hussain", "Iqbal",
  "Siddiqui", "Farooq", "Javed", "Nawaz", "Tariq", "Aslam", "Bhatti", "Mehmood", "Rashid", "Sultan",
];

export const SUBJECTS = [
  { name: "Mathematics", code: "MATH", description: "Arithmetic, algebra, geometry and problem solving." },
  { name: "English", code: "ENG", description: "Language, comprehension, grammar and composition." },
  { name: "Urdu", code: "URD", description: "Urdu language, literature and composition." },
  { name: "Physics", code: "PHY", description: "Mechanics, heat, light, sound and electricity." },
  { name: "Chemistry", code: "CHEM", description: "Matter, reactions, and the periodic table." },
  { name: "Biology", code: "BIO", description: "Living organisms, cells, and human physiology." },
  { name: "General Science", code: "GSCI", description: "Introductory science for the primary years." },
  { name: "Computer Science", code: "CS", description: "Computing fundamentals and programming." },
  { name: "Islamiyat", code: "ISL", description: "Islamic studies, ethics and history." },
  { name: "Pakistan Studies", code: "PST", description: "History, geography and civics of Pakistan." },
];

/** Which subjects are taught at which grade level. */
export function subjectsForGrade(grade: number): string[] {
  if (grade <= 5) return ["MATH", "ENG", "URD", "GSCI", "ISL"];
  if (grade <= 8) return ["MATH", "ENG", "URD", "GSCI", "CS", "ISL", "PST"];
  return ["MATH", "ENG", "URD", "PHY", "CHEM", "BIO", "CS", "ISL", "PST"];
}

export const FEE_CATEGORIES = ["Tuition Fee", "Admission Fee", "Examination Fee", "Transport", "Library & Lab"];

export const ASSIGNMENT_TITLES: Record<string, string[]> = {
  MATH: ["Quadratic Equations Worksheet", "Trigonometric Ratios Practice", "Geometry Construction Set", "Algebra Word Problems"],
  ENG: ["Essay: My Role Model", "Book Report — The Old Man and the Sea", "Comprehension Exercise 4", "Letter Writing Practice"],
  URD: ["Nazm Tashreeh", "Mazmoon Nigari", "Grammar Worksheet", "Khat Nawesi"],
  PHY: ["Newton's Laws Problem Set", "Ohm's Law Lab Report", "Refraction Ray Diagrams", "Work & Energy Numericals"],
  CHEM: ["Periodic Trends Worksheet", "Balancing Equations Practice", "Titration Lab Report", "Organic Nomenclature"],
  BIO: ["Cell Structure Diagram", "Photosynthesis Summary", "Human Digestive System", "Genetics Problem Set"],
  GSCI: ["States of Matter Poster", "Simple Machines Worksheet", "Weather Observation Log", "Plant Life Cycle"],
  CS: ["Flowchart Design Task", "Python Loops Exercise", "HTML Portfolio Page", "Database Table Design"],
  ISL: ["Seerat-un-Nabi Notes", "Surah Translation Exercise", "Islamic Ethics Essay", "Hadith Memorisation"],
  PST: ["Map of Pakistan Exercise", "Pakistan Movement Timeline", "Constitution Summary", "Geography Worksheet"],
};

export const ANNOUNCEMENTS = [
  {
    title: "Parent–Teacher Meeting: Saturday, 26 September",
    body:
      "The first parent–teacher meeting of the session will be held this Saturday from 9:00 AM to 1:00 PM. " +
      "Class teachers will share first-term progress, attendance summaries and subject-wise feedback. " +
      "Parents are requested to collect their child's progress slip from the class teacher before leaving.",
    audience: "PARENTS" as const,
  },
  {
    title: "Mid-Term Examinations Begin 12 October",
    body:
      "The mid-term examination schedule has been published. Examinations begin on Monday, 12 October and " +
      "conclude on Friday, 23 October. The datesheet is available on the notice board and in the exams section " +
      "of the portal. Students must bring their own stationery and school ID card to every paper.",
    audience: "ALL" as const,
  },
  {
    title: "Annual Sports Day — Registrations Open",
    body:
      "Registrations for Annual Sports Day are now open for athletics, cricket, football, badminton and table tennis. " +
      "Interested students should submit their entries to their class teacher by 30 September. " +
      "Practice sessions will be held every Tuesday and Thursday after school hours.",
    audience: "STUDENTS" as const,
  },
  {
    title: "Staff Meeting: Assessment Policy Review",
    body:
      "All teaching staff are requested to attend a meeting in the conference room on Friday at 2:30 PM. " +
      "Agenda: review of the continuous assessment policy, grading moderation for the mid-term, and " +
      "a walkthrough of the new gradebook and attendance modules in the portal.",
    audience: "TEACHERS" as const,
  },
  {
    title: "Fee Submission Deadline — 10 October",
    body:
      "Parents are reminded that the quarterly fee is due by 10 October. Payments may be made by bank transfer, " +
      "JazzCash, Easypaisa or at the school accounts office. A late fee will be applied to invoices " +
      "outstanding after the due date. Fee challans can be downloaded from the fees section of the portal.",
    audience: "PARENTS" as const,
  },
];

/**
 * Deterministic pseudo-random generator.
 *
 * The seed script must produce the *same* school every time it runs —
 * otherwise screenshots, demos and any test written against the seed data
 * drift on each reseed. Math.random() can't offer that, so this is a small
 * seeded LCG instead.
 */
export class Rng {
  private state: number;

  constructor(seed = 20260912) {
    this.state = seed >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    // Numerical Recipes LCG constants.
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  int(minInclusive: number, maxInclusive: number): number {
    return minInclusive + Math.floor(this.next() * (maxInclusive - minInclusive + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  /** True with the given probability. */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

/** Weekdays only — Pakistani schools run Monday–Saturday, closed Sunday. */
export function isSchoolDay(date: Date): boolean {
  return date.getDay() !== 0;
}

/** The last `count` school days up to (and including) `end`. */
export function recentSchoolDays(end: Date, count: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date(end);
  while (days.length < count) {
    if (isSchoolDay(cursor)) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return days.reverse();
}

// Re-exported from the app's own grading module so seeded results use the
// exact scale the app awards, rather than a copy that can drift from it.
export { gradeForPercentage } from "../lib/grading";
