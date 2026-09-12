import { z } from "zod";
import { normalizeCnic } from "@/lib/crypto/identifiers";
import { dateOnlySchema } from "./attendance";
import { DAYS_OF_WEEK } from "./timetable";

/**
 * CNIC is the login identifier for every account in this app, so it's
 * normalised to bare digits before validation — the same person typed as
 * "42101-1234567-1" and "4210112345671" must not become two accounts.
 */
const cnicSchema = z
  .string()
  .trim()
  .transform(normalizeCnic)
  .refine((value) => value.length === 13, "A CNIC or B-Form number is 13 digits.");

const optionalEmail = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .optional()
  .or(z.literal(""));

const optionalPhone = z
  .string()
  .trim()
  .max(20, "Phone number is too long.")
  .optional()
  .or(z.literal(""));

const nameSchema = z
  .string()
  .trim()
  .min(3, "Enter the full name.")
  .max(100, "Name is too long.");

export const createStudentSchema = z.object({
  name: nameSchema,
  cnic: cnicSchema,
  sectionId: z.string().min(1, "Choose a class."),
  rollNumber: z.string().trim().max(10).optional().or(z.literal("")),
  dateOfBirth: dateOnlySchema.optional().or(z.literal("")),
  gender: z.enum(["Male", "Female"]).optional().or(z.literal("")),
  address: z.string().trim().max(300, "Address is too long.").optional().or(z.literal("")),
  email: optionalEmail,

  // Guardian details are part of creating a student rather than a separate
  // step: a student record with nobody able to see it is the state this
  // school ends up in if the link is left as a follow-up task.
  guardianName: nameSchema,
  guardianCnic: cnicSchema,
  guardianPhone: optionalPhone,
  guardianRelationship: z.enum(["FATHER", "MOTHER", "GUARDIAN"]),
});

/**
 * One class a teacher is given at the moment their account is created,
 * optionally with its first timetable period.
 *
 * The subject and class are what actually grant access — a teacher can only
 * mark registers and enter marks for the pairs listed here — so they are
 * required. The period is optional: a school often knows who teaches what
 * before the timetable is finalised, and forcing a day and time would mean
 * inventing one.
 */
export const teacherAssignmentInputSchema = z
  .object({
    subjectId: z.string().min(1, "Choose a subject."),
    sectionId: z.string().min(1, "Choose a class."),
    dayOfWeek: z.enum(DAYS_OF_WEEK).optional().or(z.literal("")),
    startTime: z.string().optional().or(z.literal("")),
    endTime: z.string().optional().or(z.literal("")),
    room: z.string().trim().max(40).optional().or(z.literal("")),
  })
  .refine(
    (value) =>
      // A period is all-or-nothing: a start with no day, or an end with no
      // start, would be stored as a lesson nobody could attend.
      (!value.dayOfWeek && !value.startTime && !value.endTime) ||
      Boolean(value.dayOfWeek && value.startTime && value.endTime),
    { message: "Give the day, start and end together, or leave all three blank.", path: ["startTime"] }
  )
  .refine(
    (value) => !value.startTime || !value.endTime || value.startTime < value.endTime,
    { message: "The period must end after it starts.", path: ["endTime"] }
  );

export const createTeacherSchema = z.object({
  name: nameSchema,
  cnic: cnicSchema,
  employeeId: z.string().trim().min(1, "Enter an employee ID.").max(30),
  qualification: z.string().trim().max(120).optional().or(z.literal("")),
  email: optionalEmail,
  phone: optionalPhone,
  assignments: z
    .array(teacherAssignmentInputSchema)
    .max(40, "That's more classes than one teacher can take.")
    .default([]),
});

export const setUserStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
