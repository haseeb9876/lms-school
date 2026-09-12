"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertTeachesSubjectInSection } from "@/lib/auth/rbac";
import { notifyUsers } from "@/lib/notifications";
import { createExamSchema } from "@/lib/schemas/fees";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

/**
 * Schedules an examination for one subject in one section.
 *
 * Scoped the same way grading is: a teacher may only schedule an exam for a
 * subject they actually teach to that class. Without that, any teacher
 * could create an exam against any class and then enter marks for it.
 */
export const createExam = withAction(
  { roles: ["PRINCIPAL", "TEACHER"], input: createExamSchema },
  async (input, ctx) => {
    await assertTeachesSubjectInSection(ctx.session, input.subjectId, input.sectionId);

    const term = await prisma.term.findUnique({
      where: { id: input.termId },
      select: { id: true, name: true, startDate: true, endDate: true },
    });
    if (!term) return actionError("That term no longer exists.", { code: "NOT_FOUND" });

    const examDate = new Date(`${input.examDate}T00:00:00.000Z`);

    // An exam dated outside its term would be filed under a period it didn't
    // happen in, and every term-grouped report would inherit that.
    if (examDate < term.startDate || examDate > term.endDate) {
      return actionError(`The exam date must fall inside ${term.name}.`, {
        code: "OUT_OF_TERM",
        fieldErrors: { examDate: `Must be within ${term.name}.` },
      });
    }

    const exam = await prisma.exam.create({
      data: {
        name: input.name,
        termId: input.termId,
        subjectId: input.subjectId,
        sectionId: input.sectionId,
        totalMarks: input.totalMarks,
        examDate,
        createdById: ctx.user.id,
      },
      select: {
        id: true,
        name: true,
        subject: { select: { name: true } },
        section: { select: { name: true, class: { select: { name: true } } } },
      },
    });

    // Tell the class it's coming — a datesheet nobody sees isn't a datesheet.
    const students = await prisma.enrollment.findMany({
      where: { sectionId: input.sectionId, status: "ACTIVE" },
      select: { student: { select: { userId: true } } },
    });

    await notifyUsers({
      userIds: students.map((enrollment) => enrollment.student.userId),
      type: "GRADE",
      title: `${exam.subject.name} — ${exam.name} scheduled`,
      body: `On ${input.examDate}, out of ${input.totalMarks} marks.`,
      link: "/results",
    });

    revalidatePath("/exams");
    return actionOk(
      { id: exam.id },
      `${exam.name} scheduled for ${exam.section.class.name} — ${exam.section.name}.`
    );
  }
);
