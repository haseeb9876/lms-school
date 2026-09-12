"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assertTeachesSubjectInSection } from "@/lib/auth/rbac";
import { notifyUsers } from "@/lib/notifications";
import { createAssignmentSchema, gradeSubmissionSchema } from "@/lib/schemas/assignments";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

export const createAssignment = withAction(
  { roles: ["PRINCIPAL", "TEACHER"], input: createAssignmentSchema },
  async (input, ctx) => {
    // Checks subject *and* section together: a teacher who takes Maths in
    // 9A must not be able to post a Physics assignment to 9A, nor a Maths
    // assignment to 9B.
    await assertTeachesSubjectInSection(ctx.session, input.subjectId, input.sectionId);

    const assignment = await prisma.assignment.create({
      data: {
        title: input.title,
        description: input.description || null,
        sectionId: input.sectionId,
        subjectId: input.subjectId,
        teacherId: ctx.user.id,
        dueDate: new Date(`${input.dueDate}T23:59:59.000Z`),
        maxMarks: input.maxMarks,
      },
      select: {
        id: true,
        title: true,
        subject: { select: { name: true } },
        section: { select: { name: true, class: { select: { name: true } } } },
      },
    });

    // Tell the class it exists. An assignment nobody is told about is just a
    // row in a table.
    const students = await prisma.enrollment.findMany({
      where: { sectionId: input.sectionId, status: "ACTIVE" },
      select: { student: { select: { user: { select: { id: true } } } } },
    });

    await notifyUsers({
      userIds: students.map((enrollment) => enrollment.student.user.id),
      type: "ASSIGNMENT",
      title: `New ${assignment.subject.name} assignment`,
      body: assignment.title,
      link: `/assignments/${assignment.id}`,
    });

    revalidatePath("/assignments");
    return actionOk({ id: assignment.id }, "Assignment posted.");
  }
);

export const gradeSubmission = withAction(
  { roles: ["PRINCIPAL", "TEACHER"], input: gradeSubmissionSchema },
  async (input, ctx) => {
    const assignment = await prisma.assignment.findUnique({
      where: { id: input.assignmentId },
      select: { id: true, sectionId: true, subjectId: true, maxMarks: true, title: true },
    });

    if (!assignment) {
      return actionError("That assignment no longer exists.", { code: "NOT_FOUND" });
    }

    await assertTeachesSubjectInSection(ctx.session, assignment.subjectId, assignment.sectionId);

    if (input.marksObtained !== null && input.marksObtained > assignment.maxMarks) {
      return actionError(`Marks can't exceed the total of ${assignment.maxMarks}.`, {
        code: "MARKS_TOO_HIGH",
        fieldErrors: { marksObtained: `Maximum is ${assignment.maxMarks}.` },
      });
    }

    // The student must actually be on this assignment's roster.
    const enrolled = await prisma.enrollment.findFirst({
      where: { sectionId: assignment.sectionId, studentId: input.studentId },
      select: { id: true },
    });
    if (!enrolled) {
      return actionError("That student isn't in this class.", { code: "NOT_IN_SECTION" });
    }

    const graded = input.marksObtained !== null;

    await prisma.submission.upsert({
      where: {
        assignmentId_studentId: { assignmentId: input.assignmentId, studentId: input.studentId },
      },
      create: {
        assignmentId: input.assignmentId,
        studentId: input.studentId,
        // A teacher grading work handed in on paper is the normal case here,
        // so a grade can exist without a digital submission.
        status: graded ? "GRADED" : "MISSING",
        marksObtained: input.marksObtained,
        feedback: input.feedback || null,
        gradedById: graded ? ctx.user.id : null,
        gradedAt: graded ? new Date() : null,
      },
      update: {
        status: graded ? "GRADED" : "SUBMITTED",
        marksObtained: input.marksObtained,
        feedback: input.feedback || null,
        gradedById: graded ? ctx.user.id : null,
        gradedAt: graded ? new Date() : null,
      },
    });

    await logAudit({
      actorId: ctx.user.id,
      action: "GRADE_ENTERED",
      targetType: "Submission",
      targetId: `${input.assignmentId}:${input.studentId}`,
      metadata: { marks: input.marksObtained, maxMarks: assignment.maxMarks },
    });

    if (graded) {
      const student = await prisma.studentProfile.findUnique({
        where: { id: input.studentId },
        select: { userId: true },
      });
      if (student) {
        await notifyUsers({
          userIds: [student.userId],
          type: "GRADE",
          title: "Assignment graded",
          body: `${assignment.title}: ${input.marksObtained}/${assignment.maxMarks}`,
          link: `/assignments/${assignment.id}`,
        });
      }
    }

    revalidatePath(`/assignments/${input.assignmentId}`);
    return actionOk(undefined, graded ? "Grade saved." : "Grade cleared.");
  }
);
