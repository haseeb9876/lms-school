"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { assertCanMarkAttendance } from "@/lib/auth/rbac";
import { getCurrentAcademicYear } from "@/lib/queries/academics";
import { markAttendanceSchema } from "@/lib/schemas/attendance";
import { todaySchoolDate } from "@/lib/format";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

/**
 * Saves a whole register in one call.
 *
 * Re-marking a day has to be possible — a teacher fixes a mistake, or a
 * student turns up late after the register was taken — and the schema
 * enforces one record per student per day. Rather than upserting row by row
 * (which would be one round trip per student and could half-apply), the
 * day's records for these students are replaced inside a transaction, so a
 * register is always saved whole or not at all.
 */
export const markAttendance = withAction(
  { roles: ["PRINCIPAL", "TEACHER"], input: markAttendanceSchema },
  async (input, ctx) => {
    await assertCanMarkAttendance(ctx.session, input.sectionId);

    const date = new Date(`${input.date}T00:00:00.000Z`);

    /*
     * Attendance for a day that hasn't happened yet is always a mistake, and
     * it would quietly distort every attendance percentage in the app.
     *
     * "Today" is the school's own calendar day, not the server's UTC day.
     * Deriving it from UTC would reject the current day's register for the
     * five hours each night when Karachi has already rolled over — exactly
     * the early-morning window when registers get taken.
     */
    if (input.date > todaySchoolDate()) {
      return actionError("You can't mark attendance for a future date.", { code: "FUTURE_DATE" });
    }

    const year = await getCurrentAcademicYear();
    if (!year) {
      return actionError("No academic year is set up yet.", { code: "NO_ACADEMIC_YEAR" });
    }

    /*
     * The submitted student ids are checked against the section's actual
     * roster instead of being trusted. Without this, a crafted request could
     * name any student in the school and write an attendance record for them
     * under a section the teacher does happen to teach.
     */
    const enrolled = await prisma.enrollment.findMany({
      where: { sectionId: input.sectionId, academicYearId: year.id },
      select: { studentId: true },
    });
    const enrolledIds = new Set(enrolled.map((enrollment) => enrollment.studentId));

    const entries = input.entries.filter((entry) => enrolledIds.has(entry.studentId));
    if (entries.length !== input.entries.length) {
      return actionError("Some students aren't enrolled in this class.", { code: "NOT_IN_SECTION" });
    }
    if (entries.length === 0) {
      return actionError("There are no students in this class to mark.", { code: "EMPTY_ROSTER" });
    }

    const studentIds = entries.map((entry) => entry.studentId);

    await prisma.$transaction([
      prisma.attendanceRecord.deleteMany({
        where: { studentId: { in: studentIds }, date },
      }),
      prisma.attendanceRecord.createMany({
        data: entries.map((entry) => ({
          studentId: entry.studentId,
          sectionId: input.sectionId,
          date,
          status: entry.status,
          remarks: entry.remarks?.trim() || null,
          markedById: ctx.user.id,
        })),
      }),
    ]);

    await logAudit({
      actorId: ctx.user.id,
      action: "ATTENDANCE_MARKED",
      targetType: "Section",
      targetId: input.sectionId,
      metadata: {
        date: input.date,
        studentCount: entries.length,
        // Counts only — never the per-student detail, which would duplicate
        // the attendance table inside the audit log.
        present: entries.filter((e) => e.status === "PRESENT").length,
        absent: entries.filter((e) => e.status === "ABSENT").length,
      },
    });

    revalidatePath("/attendance");
    revalidatePath("/");

    const present = entries.filter((e) => e.status === "PRESENT" || e.status === "LATE").length;
    return actionOk(
      { marked: entries.length },
      `Register saved — ${present} of ${entries.length} present.`
    );
  }
);
