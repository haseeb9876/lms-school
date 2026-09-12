"use server";

import type { DayOfWeek } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { formatTimeOfDay } from "@/lib/format";
import {
  createPeriodSchema,
  deletePeriodSchema,
  updateAssignmentSchema,
  updatePeriodSchema,
} from "@/lib/schemas/timetable";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

interface ConflictCandidate {
  sectionId: string;
  teacherId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room?: string | null;
  /** Excluded from the search when editing an existing period. */
  ignoreId?: string;
}

/**
 * Finds anything that would clash with a period.
 *
 * Three ways a timetable can contradict itself, and a school hits all three
 * in practice: the same teacher booked into two rooms at once, a class given
 * two lessons in the same slot, and two classes sent to the same room.
 * Times are "HH:MM" strings, so a plain string comparison orders them
 * correctly and two periods overlap when each starts before the other ends.
 */
async function findConflict(candidate: ConflictCandidate): Promise<string | null> {
  const overlapping = await prisma.timetableSlot.findMany({
    where: {
      dayOfWeek: candidate.dayOfWeek,
      ...(candidate.ignoreId ? { id: { not: candidate.ignoreId } } : {}),
      startTime: { lt: candidate.endTime },
      endTime: { gt: candidate.startTime },
      OR: [
        { teacherId: candidate.teacherId },
        { sectionId: candidate.sectionId },
        ...(candidate.room ? [{ room: candidate.room }] : []),
      ],
    },
    select: {
      startTime: true,
      endTime: true,
      room: true,
      teacherId: true,
      sectionId: true,
      teacher: { select: { name: true } },
      subject: { select: { name: true } },
      section: { select: { name: true, class: { select: { name: true } } } },
    },
  });

  for (const slot of overlapping) {
    const when = `${formatTimeOfDay(slot.startTime)}–${formatTimeOfDay(slot.endTime)}`;
    const where = `${slot.section.class.name} — ${slot.section.name}`;

    if (slot.teacherId === candidate.teacherId) {
      return `${slot.teacher.name} already teaches ${slot.subject.name} to ${where} at ${when}.`;
    }
    if (slot.sectionId === candidate.sectionId) {
      return `${where} already has ${slot.subject.name} at ${when}.`;
    }
    if (candidate.room && slot.room === candidate.room) {
      return `${slot.room} is already in use by ${where} at ${when}.`;
    }
  }

  return null;
}

/**
 * A period can only be timetabled for a teacher who is actually assigned to
 * teach that subject in that class — otherwise the timetable would grant
 * access the staffing table never did, and that teacher could mark a
 * register they have no claim to.
 */
async function assertAssigned(teacherId: string, subjectId: string, sectionId: string) {
  return prisma.teacherSubjectAssignment.findFirst({
    where: { teacherId, subjectId, sectionId },
    select: { id: true },
  });
}

export const createPeriod = withAction(
  { roles: ["PRINCIPAL"], input: createPeriodSchema },
  async (input, ctx) => {
    if (!(await assertAssigned(input.teacherId, input.subjectId, input.sectionId))) {
      return actionError(
        "That teacher isn't assigned to this subject in this class. Add the assignment first, under Staffing.",
        { code: "NOT_ASSIGNED" }
      );
    }

    const conflict = await findConflict({ ...input, room: input.room || null });
    if (conflict) return actionError(conflict, { code: "TIMETABLE_CONFLICT" });

    const slot = await prisma.timetableSlot.create({
      data: {
        sectionId: input.sectionId,
        subjectId: input.subjectId,
        teacherId: input.teacherId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        room: input.room || null,
      },
      select: { id: true },
    });

    await logAudit({
      actorId: ctx.user.id,
      action: "USER_UPDATED",
      targetType: "TimetableSlot",
      targetId: slot.id,
      metadata: { sectionId: input.sectionId, day: input.dayOfWeek, start: input.startTime },
    });

    revalidatePath(`/classes/${input.sectionId}`);
    revalidatePath("/timetable");
    return actionOk({ id: slot.id }, "Period added.");
  }
);

export const updatePeriod = withAction(
  { roles: ["PRINCIPAL"], input: updatePeriodSchema },
  async (input, ctx) => {
    const existing = await prisma.timetableSlot.findUnique({
      where: { id: input.id },
      select: { id: true, sectionId: true },
    });
    if (!existing) return actionError("That period no longer exists.", { code: "NOT_FOUND" });

    if (!(await assertAssigned(input.teacherId, input.subjectId, input.sectionId))) {
      return actionError(
        "That teacher isn't assigned to this subject in this class. Add the assignment first, under Staffing.",
        { code: "NOT_ASSIGNED" }
      );
    }

    const conflict = await findConflict({ ...input, room: input.room || null, ignoreId: input.id });
    if (conflict) return actionError(conflict, { code: "TIMETABLE_CONFLICT" });

    await prisma.timetableSlot.update({
      where: { id: input.id },
      data: {
        sectionId: input.sectionId,
        subjectId: input.subjectId,
        teacherId: input.teacherId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        room: input.room || null,
      },
    });

    await logAudit({
      actorId: ctx.user.id,
      action: "USER_UPDATED",
      targetType: "TimetableSlot",
      targetId: input.id,
      metadata: { day: input.dayOfWeek, start: input.startTime, end: input.endTime },
    });

    revalidatePath(`/classes/${input.sectionId}`);
    revalidatePath(`/classes/${existing.sectionId}`);
    revalidatePath("/timetable");
    return actionOk(undefined, "Period updated.");
  }
);

export const deletePeriod = withAction(
  { roles: ["PRINCIPAL"], input: deletePeriodSchema },
  async (input, ctx) => {
    const slot = await prisma.timetableSlot.findUnique({
      where: { id: input.id },
      select: { id: true, sectionId: true },
    });
    if (!slot) return actionOk(undefined, "Already removed.");

    await prisma.timetableSlot.delete({ where: { id: input.id } });

    await logAudit({
      actorId: ctx.user.id,
      action: "USER_UPDATED",
      targetType: "TimetableSlot",
      targetId: input.id,
      metadata: { removed: true },
    });

    revalidatePath(`/classes/${slot.sectionId}`);
    revalidatePath("/timetable");
    return actionOk(undefined, "Period removed.");
  }
);

/**
 * Reassigns a teacher — the case of "move the Grade 1 English teacher to
 * Grade 2 and take them off Grade 1".
 *
 * By default their timetable periods move with them, because leaving the
 * periods behind would strand lessons pointing at a teacher who is no
 * longer allowed to take that class. Moving them is also where conflicts
 * surface, so every period is checked against the destination before
 * anything is written.
 */
export const updateTeacherAssignment = withAction(
  { roles: ["PRINCIPAL"], input: updateAssignmentSchema },
  async (input, ctx) => {
    const existing = await prisma.teacherSubjectAssignment.findUnique({
      where: { id: input.id },
      select: { id: true, teacherId: true, subjectId: true, sectionId: true, academicYearId: true },
    });
    if (!existing) return actionError("That assignment no longer exists.", { code: "NOT_FOUND" });

    const unchanged =
      existing.teacherId === input.teacherId &&
      existing.subjectId === input.subjectId &&
      existing.sectionId === input.sectionId;
    if (unchanged) return actionOk(undefined, "Nothing to change.");

    const duplicate = await prisma.teacherSubjectAssignment.findFirst({
      where: {
        id: { not: input.id },
        teacherId: input.teacherId,
        subjectId: input.subjectId,
        sectionId: input.sectionId,
        academicYearId: existing.academicYearId,
      },
      select: { id: true },
    });
    if (duplicate) {
      return actionError("That teacher already teaches this subject to this class.", {
        code: "DUPLICATE",
      });
    }

    const periods = await prisma.timetableSlot.findMany({
      where: {
        teacherId: existing.teacherId,
        subjectId: existing.subjectId,
        sectionId: existing.sectionId,
      },
      select: { id: true, dayOfWeek: true, startTime: true, endTime: true, room: true },
    });

    if (input.movePeriods) {
      // Every period is validated against the destination first: a partial
      // move that leaves half the lessons behind is worse than a refusal.
      for (const period of periods) {
        const conflict = await findConflict({
          sectionId: input.sectionId,
          teacherId: input.teacherId,
          dayOfWeek: period.dayOfWeek,
          startTime: period.startTime,
          endTime: period.endTime,
          room: period.room,
          ignoreId: period.id,
        });
        if (conflict) {
          return actionError(`Can't move the timetable: ${conflict}`, { code: "TIMETABLE_CONFLICT" });
        }
      }
    }

    await prisma.$transaction([
      prisma.teacherSubjectAssignment.update({
        where: { id: input.id },
        data: {
          teacherId: input.teacherId,
          subjectId: input.subjectId,
          sectionId: input.sectionId,
        },
      }),
      ...(periods.length > 0
        ? [
            input.movePeriods
              ? prisma.timetableSlot.updateMany({
                  where: { id: { in: periods.map((period) => period.id) } },
                  data: {
                    teacherId: input.teacherId,
                    subjectId: input.subjectId,
                    sectionId: input.sectionId,
                  },
                })
              : // Not moving them means deleting them: a period whose teacher
                // is no longer assigned to that class would be unteachable.
                prisma.timetableSlot.deleteMany({
                  where: { id: { in: periods.map((period) => period.id) } },
                }),
          ]
        : []),
    ]);

    await logAudit({
      actorId: ctx.user.id,
      action: "USER_UPDATED",
      targetType: "TeacherSubjectAssignment",
      targetId: input.id,
      metadata: {
        from: { teacherId: existing.teacherId, sectionId: existing.sectionId, subjectId: existing.subjectId },
        to: { teacherId: input.teacherId, sectionId: input.sectionId, subjectId: input.subjectId },
        periodsAffected: periods.length,
        periodsMoved: input.movePeriods,
      },
    });

    revalidatePath("/settings/academic");
    revalidatePath(`/classes/${existing.sectionId}`);
    revalidatePath(`/classes/${input.sectionId}`);
    revalidatePath("/timetable");

    const moved = periods.length > 0
      ? input.movePeriods
        ? ` ${periods.length} timetable period${periods.length === 1 ? "" : "s"} moved with them.`
        : ` ${periods.length} timetable period${periods.length === 1 ? "" : "s"} removed.`
      : "";

    return actionOk(undefined, `Assignment updated.${moved}`);
  }
);
