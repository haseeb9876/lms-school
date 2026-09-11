import { z } from "zod";
import { normalizeCnic } from "@/lib/crypto/identifiers";
import { dateOnlySchema } from "./attendance";

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

export const createTeacherSchema = z.object({
  name: nameSchema,
  cnic: cnicSchema,
  employeeId: z.string().trim().min(1, "Enter an employee ID.").max(30),
  qualification: z.string().trim().max(120).optional().or(z.literal("")),
  email: optionalEmail,
  phone: optionalPhone,
});

export const setUserStatusSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
