"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  assignTeacherSchema,
  createAcademicYearSchema,
  createClassSchema,
  createSectionSchema,
  createSubjectSchema,
  createTermSchema,
  removeAssignmentSchema,
} from "@/lib/schemas/academics";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

const SETUP_PATH = "/settings/academic";

/**
 * Turns a unique-constraint violation into a message naming the field.
 *
 * The database constraint is what actually guarantees uniqueness — checking
 * first and inserting after is a race. Catching the violation keeps the
 * guarantee where it belongs while still producing a usable error.
 */
function duplicateFieldError(err: unknown, field: string, message: string) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return actionError(message, { code: "DUPLICATE", fieldErrors: { [field]: message } });
  }
  return null;
}

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export const createAcademicYear = withAction(
  { roles: ["PRINCIPAL"], input: createAcademicYearSchema },
  async (input, ctx) => {
    try {
      const year = await prisma.$transaction(async (tx) => {
        // Exactly one year can be current; clearing the flag first keeps
        // that true rather than relying on whoever writes next.
        if (input.makeCurrent) {
          await tx.academicYear.updateMany({
            where: { isCurrent: true },
            data: { isCurrent: false },
          });
        }

        return tx.academicYear.create({
          data: {
            name: input.name,
            startDate: toUtc(input.startDate),
            endDate: toUtc(input.endDate),
            isCurrent: input.makeCurrent,
          },
          select: { id: true, name: true },
        });
      });

      await logAudit({
        actorId: ctx.user.id,
        action: "USER_UPDATED",
        targetType: "AcademicYear",
        targetId: year.id,
        metadata: { name: year.name, madeCurrent: input.makeCurrent },
      });

      revalidatePath(SETUP_PATH);
      return actionOk({ id: year.id }, `Academic year ${year.name} created.`);
    } catch (err) {
      const duplicate = duplicateFieldError(err, "name", "That academic year already exists.");
      if (duplicate) return duplicate;
      throw err;
    }
  }
);

export const createTerm = withAction(
  { roles: ["PRINCIPAL"], input: createTermSchema },
  async (input, _ctx) => {
    const year = await prisma.academicYear.findUnique({
      where: { id: input.academicYearId },
      select: { startDate: true, endDate: true, name: true },
    });
    if (!year) return actionError("That academic year no longer exists.", { code: "NOT_FOUND" });

    const start = toUtc(input.startDate);
    const end = toUtc(input.endDate);

    // A term outside its year would silently break every report that groups
    // results by term.
    if (start < year.startDate || end > year.endDate) {
      return actionError(`A term must fall inside ${year.name}.`, { code: "OUT_OF_RANGE" });
    }

    try {
      const term = await prisma.term.create({
        data: {
          academicYearId: input.academicYearId,
          name: input.name,
          startDate: start,
          endDate: end,
        },
        select: { id: true, name: true },
      });

      revalidatePath(SETUP_PATH);
      return actionOk({ id: term.id }, `${term.name} added.`);
    } catch (err) {
      const duplicate = duplicateFieldError(err, "name", "That term already exists for this year.");
      if (duplicate) return duplicate;
      throw err;
    }
  }
);

export const createClass = withAction(
  { roles: ["PRINCIPAL"], input: createClassSchema },
  async (input) => {
    try {
      const created = await prisma.class.create({
        data: { name: input.name, sortOrder: input.sortOrder },
        select: { id: true, name: true },
      });

      revalidatePath(SETUP_PATH);
      revalidatePath("/classes");
      return actionOk({ id: created.id }, `${created.name} added.`);
    } catch (err) {
      const duplicate = duplicateFieldError(err, "name", "A class with that name already exists.");
      if (duplicate) return duplicate;
      throw err;
    }
  }
);

export const createSection = withAction(
  { roles: ["PRINCIPAL"], input: createSectionSchema },
  async (input) => {
    const year = await prisma.academicYear.findFirst({ where: { isCurrent: true }, select: { id: true } });
    if (!year) {
      return actionError("Create an academic year before adding sections.", {
        code: "NO_ACADEMIC_YEAR",
      });
    }

    if (input.classTeacherId) {
      const teacher = await prisma.user.findFirst({
        where: { id: input.classTeacherId, role: "TEACHER", status: "ACTIVE" },
        select: { id: true },
      });
      if (!teacher) {
        return actionError("That class teacher isn't an active teacher.", {
          code: "INVALID_TEACHER",
          fieldErrors: { classTeacherId: "Choose an active teacher." },
        });
      }
    }

    try {
      const section = await prisma.section.create({
        data: {
          classId: input.classId,
          academicYearId: year.id,
          name: input.name,
          classTeacherId: input.classTeacherId || null,
          capacity: input.capacity ?? null,
        },
        select: { id: true, name: true, class: { select: { name: true } } },
      });

      revalidatePath(SETUP_PATH);
      revalidatePath("/classes");
      return actionOk({ id: section.id }, `${section.class.name} — ${section.name} added.`);
    } catch (err) {
      const duplicate = duplicateFieldError(
        err,
        "name",
        "That section already exists for this class and year."
      );
      if (duplicate) return duplicate;
      throw err;
    }
  }
);

export const createSubject = withAction(
  { roles: ["PRINCIPAL"], input: createSubjectSchema },
  async (input) => {
    try {
      const subject = await prisma.subject.create({
        data: {
          name: input.name,
          code: input.code,
          description: input.description || null,
        },
        select: { id: true, name: true },
      });

      revalidatePath(SETUP_PATH);
      return actionOk({ id: subject.id }, `${subject.name} added.`);
    } catch (err) {
      const duplicate = duplicateFieldError(
        err,
        "code",
        "A subject with that name or code already exists."
      );
      if (duplicate) return duplicate;
      throw err;
    }
  }
);

export const assignTeacherToSubject = withAction(
  { roles: ["PRINCIPAL"], input: assignTeacherSchema },
  async (input, ctx) => {
    const year = await prisma.academicYear.findFirst({ where: { isCurrent: true }, select: { id: true } });
    if (!year) {
      return actionError("Create an academic year before assigning teachers.", {
        code: "NO_ACADEMIC_YEAR",
      });
    }

    const [teacher, section] = await Promise.all([
      prisma.user.findFirst({
        where: { id: input.teacherId, role: "TEACHER", status: "ACTIVE" },
        select: { id: true, name: true },
      }),
      prisma.section.findFirst({
        where: { id: input.sectionId, academicYearId: year.id },
        select: { id: true, name: true, class: { select: { name: true } } },
      }),
    ]);

    if (!teacher) {
      return actionError("That teacher isn't active.", {
        code: "INVALID_TEACHER",
        fieldErrors: { teacherId: "Choose an active teacher." },
      });
    }
    if (!section) {
      return actionError("That class isn't in the current academic year.", {
        code: "INVALID_SECTION",
        fieldErrors: { sectionId: "Choose a class from the current year." },
      });
    }

    try {
      await prisma.teacherSubjectAssignment.create({
        data: {
          teacherId: input.teacherId,
          subjectId: input.subjectId,
          sectionId: input.sectionId,
          academicYearId: year.id,
        },
      });
    } catch (err) {
      const duplicate = duplicateFieldError(
        err,
        "teacherId",
        "That teacher already teaches this subject to this class."
      );
      if (duplicate) return duplicate;
      throw err;
    }

    await logAudit({
      actorId: ctx.user.id,
      action: "USER_UPDATED",
      targetType: "TeacherSubjectAssignment",
      targetId: input.teacherId,
      metadata: { sectionId: input.sectionId, subjectId: input.subjectId },
    });

    revalidatePath(SETUP_PATH);
    revalidatePath("/classes");
    return actionOk(
      undefined,
      `${teacher.name} assigned to ${section.class.name} — ${section.name}.`
    );
  }
);

export const removeTeacherAssignment = withAction(
  { roles: ["PRINCIPAL"], input: removeAssignmentSchema },
  async (input, ctx) => {
    const assignment = await prisma.teacherSubjectAssignment.findUnique({
      where: { id: input.id },
      select: { id: true, teacherId: true, sectionId: true, subjectId: true },
    });
    if (!assignment) return actionError("That assignment no longer exists.", { code: "NOT_FOUND" });

    /*
     * Timetable slots reference the teacher/subject/section triple directly,
     * so removing the assignment while periods still point at it would leave
     * a timetable naming a teacher who is no longer allowed to touch that
     * class — and no way to mark its register.
     */
    const scheduled = await prisma.timetableSlot.count({
      where: {
        teacherId: assignment.teacherId,
        sectionId: assignment.sectionId,
        subjectId: assignment.subjectId,
      },
    });
    if (scheduled > 0) {
      return actionError(
        `There are still ${scheduled} timetable period${scheduled === 1 ? "" : "s"} using this assignment. Remove them first.`,
        { code: "HAS_TIMETABLE_SLOTS" }
      );
    }

    await prisma.teacherSubjectAssignment.delete({ where: { id: input.id } });

    await logAudit({
      actorId: ctx.user.id,
      action: "USER_UPDATED",
      targetType: "TeacherSubjectAssignment",
      targetId: input.id,
      metadata: { removed: true },
    });

    revalidatePath(SETUP_PATH);
    revalidatePath("/classes");
    return actionOk(undefined, "Assignment removed.");
  }
);
