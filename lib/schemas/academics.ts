import { z } from "zod";
import { dateOnlySchema } from "./attendance";

export const createAcademicYearSchema = z
  .object({
    name: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, "Use the form 2026-2027."),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    makeCurrent: z.boolean().default(true),
  })
  .refine((value) => value.startDate < value.endDate, {
    message: "The year must end after it starts.",
    path: ["endDate"],
  });

export const createTermSchema = z
  .object({
    academicYearId: z.string().min(1, "Choose an academic year."),
    name: z.string().trim().min(2, "Name the term.").max(40, "Name is too long."),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
  })
  .refine((value) => value.startDate < value.endDate, {
    message: "The term must end after it starts.",
    path: ["endDate"],
  });

export const createClassSchema = z.object({
  name: z.string().trim().min(1, "Name the class, e.g. Grade 9.").max(40, "Name is too long."),
  sortOrder: z.coerce
    .number()
    .int("Use a whole number.")
    .min(0, "Must be zero or more.")
    .max(100, "That's too high."),
});

export const createSectionSchema = z.object({
  classId: z.string().min(1, "Choose a class."),
  name: z.string().trim().min(1, "Name the section, e.g. A.").max(10, "Keep it short."),
  classTeacherId: z.string().optional().or(z.literal("")),
  capacity: z.coerce
    .number()
    .int("Use a whole number.")
    .min(1, "Capacity must be at least 1.")
    .max(200, "That's too high.")
    .optional(),
});

export const createSubjectSchema = z.object({
  name: z.string().trim().min(2, "Name the subject.").max(60, "Name is too long."),
  code: z
    .string()
    .trim()
    .min(2, "Give a short code, e.g. MATH.")
    .max(10, "Keep the code short.")
    // Uppercased so "math" and "MATH" can't become two subjects.
    .transform((value) => value.toUpperCase()),
  description: z.string().trim().max(300, "Description is too long.").optional().or(z.literal("")),
});

export const assignTeacherSchema = z.object({
  teacherId: z.string().min(1, "Choose a teacher."),
  subjectId: z.string().min(1, "Choose a subject."),
  sectionId: z.string().min(1, "Choose a class."),
});

export const removeAssignmentSchema = z.object({ id: z.string().min(1) });
