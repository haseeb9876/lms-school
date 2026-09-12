import { z } from "zod";
import { dateOnlySchema } from "./attendance";

export const createExamSchema = z.object({
  name: z.string().trim().min(3, "Name the examination.").max(80, "Name is too long."),
  termId: z.string().min(1, "Choose a term."),
  subjectId: z.string().min(1, "Choose a subject."),
  sectionId: z.string().min(1, "Choose a class."),
  examDate: dateOnlySchema,
  totalMarks: z.coerce
    .number()
    .positive("Total marks must be greater than zero.")
    .max(1000, "That looks too high."),
});

export const createFeeStructureSchema = z.object({
  sectionId: z.string().min(1, "Choose a class."),
  feeCategoryId: z.string().min(1, "Choose a fee type."),
  amount: z.coerce.number().positive("Enter an amount greater than zero.").max(1_000_000),
  frequency: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL", "ONE_TIME"]),
  dueDayOfMonth: z.coerce.number().int().min(1).max(28).optional(),
});

export const generateInvoicesSchema = z.object({
  sectionId: z.string().min(1, "Choose a class."),
  termId: z.string().optional().or(z.literal("")),
  dueDate: dateOnlySchema,
  /** Human label for the billing period, e.g. "October 2026". */
  note: z.string().trim().max(60).optional().or(z.literal("")),
});

export const createFeeCategorySchema = z.object({
  name: z.string().trim().min(2, "Name the fee type.").max(60, "Name is too long."),
});
