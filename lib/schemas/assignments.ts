import { z } from "zod";
import { dateOnlySchema } from "./attendance";

export const createAssignmentSchema = z.object({
  title: z.string().trim().min(3, "Give the assignment a title.").max(160, "Title is too long."),
  description: z.string().trim().max(4000, "Description is too long.").optional(),
  sectionId: z.string().min(1, "Choose a class."),
  subjectId: z.string().min(1, "Choose a subject."),
  dueDate: dateOnlySchema,
  maxMarks: z.coerce
    .number()
    .positive("Total marks must be greater than zero.")
    .max(1000, "Total marks looks too high."),
});

export const gradeSubmissionSchema = z.object({
  assignmentId: z.string().min(1),
  studentId: z.string().min(1),
  // Null clears a grade — a teacher who graded the wrong student needs a way
  // back, and an empty box should mean "ungraded", not zero.
  marksObtained: z.coerce.number().min(0, "Marks can't be negative.").nullable(),
  feedback: z.string().trim().max(2000, "Feedback is too long.").optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
