"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assertTeachesSubjectInSection } from "@/lib/auth/rbac";
import { notifyUsers } from "@/lib/notifications";
import { gradeForPercentage } from "@/lib/grading";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

const enterResultsSchema = z.object({
  examId: z.string().min(1),
  results: z
    .array(
      z.object({
        studentId: z.string().min(1),
        // Null clears a previously entered mark — an empty box means "not
        // sat / not marked", which is not the same as scoring zero.
        marksObtained: z.number().min(0).nullable(),
        remarks: z.string().trim().max(200).optional(),
      })
    )
    .min(1, "There are no students to record marks for.")
    .max(200, "Too many students in one submission."),
});

/**
 * Saves a whole subject's marks in one call, the way a teacher works
 * through a pile of papers — rather than one request per student.
 */
export const enterExamResults = withAction(
  { roles: ["PRINCIPAL", "TEACHER"], input: enterResultsSchema },
  async (input, ctx) => {
    const exam = await prisma.exam.findUnique({
      where: { id: input.examId },
      select: {
        id: true,
        name: true,
        sectionId: true,
        subjectId: true,
        totalMarks: true,
        subject: { select: { name: true } },
      },
    });

    if (!exam) return actionError("That exam no longer exists.", { code: "NOT_FOUND" });

    await assertTeachesSubjectInSection(ctx.session, exam.subjectId, exam.sectionId);

    const overMax = input.results.find(
      (result) => result.marksObtained !== null && result.marksObtained > exam.totalMarks
    );
    if (overMax) {
      return actionError(`Marks can't exceed the total of ${exam.totalMarks}.`, {
        code: "MARKS_TOO_HIGH",
      });
    }

    // Submitted student ids are checked against the section roster rather
    // than trusted, so a crafted request can't attach a result to a student
    // who isn't in this class.
    const enrolled = await prisma.enrollment.findMany({
      where: { sectionId: exam.sectionId },
      select: { studentId: true },
    });
    const enrolledIds = new Set(enrolled.map((enrollment) => enrollment.studentId));

    if (input.results.some((result) => !enrolledIds.has(result.studentId))) {
      return actionError("Some students aren't in this class.", { code: "NOT_IN_SECTION" });
    }

    const toRecord = input.results.filter((result) => result.marksObtained !== null);
    const toClear = input.results.filter((result) => result.marksObtained === null);

    await prisma.$transaction([
      ...(toClear.length > 0
        ? [
            prisma.examResult.deleteMany({
              where: { examId: exam.id, studentId: { in: toClear.map((r) => r.studentId) } },
            }),
          ]
        : []),
      // Replace rather than upsert row by row: one delete plus one insert is
      // two statements regardless of class size, and the pair being inside a
      // transaction means a half-saved mark sheet can't happen.
      ...(toRecord.length > 0
        ? [
            prisma.examResult.deleteMany({
              where: { examId: exam.id, studentId: { in: toRecord.map((r) => r.studentId) } },
            }),
            prisma.examResult.createMany({
              data: toRecord.map((result) => ({
                examId: exam.id,
                studentId: result.studentId,
                marksObtained: result.marksObtained!,
                grade: gradeForPercentage((result.marksObtained! / exam.totalMarks) * 100),
                remarks: result.remarks || null,
                enteredById: ctx.user.id,
              })),
            }),
          ]
        : []),
    ]);

    await logAudit({
      actorId: ctx.user.id,
      action: "GRADE_ENTERED",
      targetType: "Exam",
      targetId: exam.id,
      metadata: { recorded: toRecord.length, cleared: toClear.length, totalMarks: exam.totalMarks },
    });

    if (toRecord.length > 0) {
      const students = await prisma.studentProfile.findMany({
        where: { id: { in: toRecord.map((r) => r.studentId) } },
        select: { userId: true },
      });

      await notifyUsers({
        userIds: students.map((student) => student.userId),
        type: "GRADE",
        title: `${exam.subject.name} result published`,
        body: `Your result for ${exam.name} is now available.`,
        link: "/results",
      });
    }

    revalidatePath(`/exams/${exam.id}`);
    revalidatePath("/exams");

    return actionOk(
      { recorded: toRecord.length },
      `Saved marks for ${toRecord.length} student${toRecord.length === 1 ? "" : "s"}.`
    );
  }
);
