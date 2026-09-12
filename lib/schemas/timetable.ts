import { z } from "zod";

export const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export const dayOfWeekSchema = z.enum(DAYS_OF_WEEK);

/** Stored as "HH:MM" strings so a period is a wall-clock time, not an instant. */
export const timeOfDaySchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time such as 08:30.");

const periodShape = {
  sectionId: z.string().min(1, "Choose a class."),
  subjectId: z.string().min(1, "Choose a subject."),
  teacherId: z.string().min(1, "Choose a teacher."),
  dayOfWeek: dayOfWeekSchema,
  startTime: timeOfDaySchema,
  endTime: timeOfDaySchema,
  room: z.string().trim().max(40, "Room name is too long.").optional().or(z.literal("")),
};

export const createPeriodSchema = z
  .object(periodShape)
  .refine((value) => value.startTime < value.endTime, {
    message: "The period must end after it starts.",
    path: ["endTime"],
  });

export const updatePeriodSchema = z
  .object({ id: z.string().min(1), ...periodShape })
  .refine((value) => value.startTime < value.endTime, {
    message: "The period must end after it starts.",
    path: ["endTime"],
  });

export const deletePeriodSchema = z.object({ id: z.string().min(1) });

/**
 * Moving a teaching assignment — the same teacher and subject, a different
 * class, or a different teacher for the same slot in the timetable.
 */
export const updateAssignmentSchema = z.object({
  id: z.string().min(1),
  teacherId: z.string().min(1, "Choose a teacher."),
  subjectId: z.string().min(1, "Choose a subject."),
  sectionId: z.string().min(1, "Choose a class."),
  /** Move the teacher's existing timetable periods across with them. */
  movePeriods: z.boolean().default(true),
});

export type CreatePeriodInput = z.infer<typeof createPeriodSchema>;
export type UpdatePeriodInput = z.infer<typeof updatePeriodSchema>;
