import { z } from "zod";

/** "09:00" — a wall-clock time, matching the timetable's convention. */
const timeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time like 09:00.");

const dateOnly = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);

/** Optional text fields arrive from an untouched input as "", not undefined. */
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const datesheetEntrySchema = z.object({
  subjectId: z.string().optional().nullable(),
  subjectName: z.string().trim().min(1, "Name the paper.").max(120),
  examDate: dateOnly("Choose a date."),
  startTime: timeOfDay.optional().or(z.literal("")),
  endTime: timeOfDay.optional().or(z.literal("")),
  room: optionalText(60),
});

const SECTION_AUDIENCES = ["SECTION", "SECTION_WITH_GUARDIANS", "SECTION_TEACHERS"] as const;

const datesheetFields = {
  title: z.string().trim().min(3, "Give the datesheet a title.").max(140),
  termId: z.string().optional().or(z.literal("")),
  audience: z.enum([
    "ALL",
    "STUDENTS_AND_TEACHERS",
    "TEACHERS",
    "STUDENTS",
    "PARENTS",
    ...SECTION_AUDIENCES,
  ]),
  sectionId: z.string().optional().or(z.literal("")),
  startsOn: dateOnly("Choose the first day of the examinations.").optional().or(z.literal("")),
  notes: optionalText(2000),
  // Capped because a datesheet is one examination season, not a year's worth
  // of papers — a runaway paste should be refused rather than stored.
  entries: z.array(datesheetEntrySchema).max(200).default([]),
};

interface DatesheetShape {
  audience: string;
  sectionId?: string | null;
  entries: { startTime?: string | null; endTime?: string | null }[];
}

/**
 * A class-targeted datesheet without a class is not a narrower notice — it
 * is one that reaches nobody, silently. Checked here rather than trusted
 * from the form, since the action is reachable by direct POST.
 */
function hasClassWhenNeeded(value: DatesheetShape): boolean {
  return (
    !SECTION_AUDIENCES.includes(value.audience as (typeof SECTION_AUDIENCES)[number]) ||
    Boolean(value.sectionId)
  );
}

function timesAreOrdered(value: DatesheetShape): boolean {
  return value.entries.every(
    (entry) => !entry.startTime || !entry.endTime || entry.startTime < entry.endTime
  );
}

const CLASS_REQUIRED = {
  message: "Choose which class this datesheet is for.",
  path: ["sectionId"],
};
const TIMES_ORDERED = {
  message: "A paper can't finish before it starts.",
  path: ["entries"],
};

/*
 * The two schemas are refined independently rather than one extending the
 * other: applying `.refine` returns a schema that is no longer a plain
 * object, so it can't then be extended with an id.
 */
export const createDatesheetSchema = z
  .object(datesheetFields)
  .refine(hasClassWhenNeeded, CLASS_REQUIRED)
  .refine(timesAreOrdered, TIMES_ORDERED);

export const updateDatesheetSchema = z
  .object({ ...datesheetFields, id: z.string().min(1) })
  .refine(hasClassWhenNeeded, CLASS_REQUIRED)
  .refine(timesAreOrdered, TIMES_ORDERED);

export const publishDatesheetSchema = z.object({
  id: z.string().min(1),
  /**
   * Publishing can notify every family in the school, so it is a deliberate
   * second step rather than a side effect of saving. Re-sending is allowed
   * but has to be asked for — a corrected datesheet that reaches nobody is
   * worse than one notification too many.
   */
  notify: z.boolean().default(true),
});

export const datesheetIdSchema = z.object({ id: z.string().min(1) });

export type CreateDatesheetInput = z.infer<typeof createDatesheetSchema>;
export type DatesheetEntryInput = z.infer<typeof datesheetEntrySchema>;
