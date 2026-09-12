import { z } from "zod";

export const attendanceStatusSchema = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

/** `<input type="date">` posts this shape; parsed as UTC midnight to match
 *  the `@db.Date` column, which has no time component. */
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Pick a valid date.");

export const markAttendanceSchema = z.object({
  sectionId: z.string().min(1, "Choose a class."),
  date: dateOnlySchema,
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: attendanceStatusSchema,
        remarks: z.string().max(200, "Remarks are too long.").optional(),
      })
    )
    .min(1, "There are no students in this class to mark.")
    // A single section's register; well above any real class size, but it
    // stops a crafted request from asking the server to write unbounded rows.
    .max(200, "Too many students in one submission."),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
