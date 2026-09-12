import type { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentAcademicYear } from "./academics";

export interface RosterEntry {
  studentId: string;
  name: string;
  rollNumber: string | null;
  admissionNumber: string;
  /** The status already recorded for this date, if the register was taken. */
  existingStatus: AttendanceStatus | null;
  existingRemarks: string | null;
}

/**
 * The roster for one section on one date, with any already-saved register
 * merged in — so reopening a marked day shows what was recorded rather than
 * a blank form that would silently overwrite it.
 */
export async function getSectionRoster(sectionId: string, date: Date): Promise<RosterEntry[]> {
  const year = await getCurrentAcademicYear();
  if (!year) return [];

  const [enrollments, existing] = await Promise.all([
    prisma.enrollment.findMany({
      where: { sectionId, academicYearId: year.id, status: "ACTIVE" },
      select: {
        student: {
          select: {
            id: true,
            rollNumber: true,
            admissionNumber: true,
            user: { select: { name: true } },
          },
        },
      },
    }),
    prisma.attendanceRecord.findMany({
      where: { sectionId, date },
      select: { studentId: true, status: true, remarks: true },
    }),
  ]);

  const existingByStudent = new Map(existing.map((record) => [record.studentId, record]));

  return enrollments
    .map(({ student }) => {
      const record = existingByStudent.get(student.id);
      return {
        studentId: student.id,
        name: student.user.name,
        rollNumber: student.rollNumber,
        admissionNumber: student.admissionNumber,
        existingStatus: record?.status ?? null,
        existingRemarks: record?.remarks ?? null,
      };
    })
    .sort((a, b) => {
      // Roll number is what a teacher calls out, so the form must follow it;
      // numeric compare keeps 10 after 9 rather than after 1.
      const rollA = Number(a.rollNumber);
      const rollB = Number(b.rollNumber);
      if (Number.isFinite(rollA) && Number.isFinite(rollB)) return rollA - rollB;
      return a.name.localeCompare(b.name);
    });
}

export interface SectionAttendanceOverview {
  sectionId: string;
  label: string;
  studentCount: number;
  /** Null when the register hasn't been taken for the date. */
  markedCount: number | null;
  presentCount: number;
  percent: number | null;
}

/**
 * One row per section for a given date — the principal's "has every class
 * been marked today?" view, and the teacher's list of registers still to
 * take.
 */
export async function getAttendanceOverview(
  sectionIds: string[],
  date: Date
): Promise<SectionAttendanceOverview[]> {
  const year = await getCurrentAcademicYear();
  if (!year || sectionIds.length === 0) return [];

  const [sections, enrollmentCounts, records] = await Promise.all([
    prisma.section.findMany({
      where: { id: { in: sectionIds } },
      select: { id: true, name: true, class: { select: { name: true, sortOrder: true } } },
    }),
    prisma.enrollment.groupBy({
      by: ["sectionId"],
      where: { sectionId: { in: sectionIds }, academicYearId: year.id, status: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.attendanceRecord.groupBy({
      by: ["sectionId", "status"],
      where: { sectionId: { in: sectionIds }, date },
      _count: { _all: true },
    }),
  ]);

  const studentCountBySection = new Map(enrollmentCounts.map((g) => [g.sectionId, g._count._all]));

  const markedBySection = new Map<string, { marked: number; present: number }>();
  for (const record of records) {
    const entry = markedBySection.get(record.sectionId) ?? { marked: 0, present: 0 };
    entry.marked += record._count._all;
    if (record.status === "PRESENT" || record.status === "LATE") entry.present += record._count._all;
    markedBySection.set(record.sectionId, entry);
  }

  return sections
    .map((section) => {
      const marks = markedBySection.get(section.id);
      return {
        sectionId: section.id,
        label: `${section.class.name} — ${section.name}`,
        sortOrder: section.class.sortOrder,
        sectionName: section.name,
        studentCount: studentCountBySection.get(section.id) ?? 0,
        markedCount: marks?.marked ?? null,
        presentCount: marks?.present ?? 0,
        percent: marks && marks.marked > 0 ? (marks.present / marks.marked) * 100 : null,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.sectionName.localeCompare(b.sectionName))
    .map(({ sortOrder: _sortOrder, sectionName: _sectionName, ...rest }) => rest);
}

/** Daily attendance percentage across a date range — powers the trend chart. */
export async function getAttendanceTrend(
  sectionIds: string[] | "ALL",
  days: number
): Promise<{ date: string; percent: number }[]> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - days);

  const records = await prisma.attendanceRecord.groupBy({
    by: ["date", "status"],
    where: {
      date: { gte: since },
      ...(sectionIds === "ALL" ? {} : { sectionId: { in: sectionIds } }),
    },
    _count: { _all: true },
  });

  const byDate = new Map<string, { present: number; total: number }>();
  for (const record of records) {
    const key = record.date.toISOString().slice(0, 10);
    const entry = byDate.get(key) ?? { present: 0, total: 0 };
    entry.total += record._count._all;
    if (record.status === "PRESENT" || record.status === "LATE") entry.present += record._count._all;
    byDate.set(key, entry);
  }

  return [...byDate.entries()]
    .map(([date, { present, total }]) => ({
      date,
      percent: total > 0 ? (present / total) * 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

