import type { Prisma, StudentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { blindIndex } from "@/lib/crypto/encryption";
import { normalizeCnic } from "@/lib/crypto/identifiers";
import type { SessionInfo } from "@/lib/auth/current-user";
import { getCurrentAcademicYear, resolveVisibleSectionIds } from "./academics";

export const STUDENTS_PAGE_SIZE = 25;

export interface StudentListParams {
  session: SessionInfo;
  query?: string;
  sectionId?: string;
  status?: StudentStatus;
  page?: number;
}

export interface StudentListRow {
  id: string;
  userId: string;
  name: string;
  admissionNumber: string;
  rollNumber: string | null;
  className: string;
  sectionName: string;
  status: StudentStatus;
  guardianName: string | null;
  /** Share of marked days present or late, over the whole current year. */
  attendancePercent: number | null;
  outstandingAmount: number;
}

export interface StudentListResult {
  rows: StudentListRow[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Builds the `where` clause for a student list, combining the caller's
 * filters with the sections this session is allowed to see.
 *
 * The visibility scope is applied as a filter here rather than checked after
 * the fact, so a teacher who passes a `sectionId` they don't teach gets an
 * empty list instead of another class's roster.
 */
async function buildStudentWhere(
  params: StudentListParams
): Promise<Prisma.StudentProfileWhereInput | null> {
  const year = await getCurrentAcademicYear();
  if (!year) return null;

  const visibleSectionIds = await resolveVisibleSectionIds(params.session);
  if (visibleSectionIds !== "ALL" && visibleSectionIds.length === 0) return null;

  const allowedSectionIds =
    visibleSectionIds === "ALL"
      ? params.sectionId
        ? [params.sectionId]
        : undefined
      : params.sectionId
        ? visibleSectionIds.filter((sectionId) => sectionId === params.sectionId)
        : visibleSectionIds;

  // A teacher filtering to a section outside their scope narrows to nothing.
  if (allowedSectionIds && allowedSectionIds.length === 0) return null;

  const where: Prisma.StudentProfileWhereInput = {
    enrollments: {
      some: {
        academicYearId: year.id,
        ...(allowedSectionIds ? { sectionId: { in: allowedSectionIds } } : {}),
      },
    },
  };

  if (params.status) where.status = params.status;

  const query = params.query?.trim();
  if (query) {
    const conditions: Prisma.StudentProfileWhereInput[] = [
      { user: { name: { contains: query, mode: "insensitive" } } },
      { admissionNumber: { contains: query, mode: "insensitive" } },
    ];

    // CNIC is encrypted with a random IV, so it can't be matched with a LIKE.
    // A query that looks like a CNIC is instead resolved through the blind
    // index, which is exactly what that deterministic hash exists for.
    const digits = normalizeCnic(query);
    if (digits.length >= 13) {
      conditions.push({ user: { cnicHash: blindIndex(digits) } });
    }

    where.OR = conditions;
  }

  return where;
}

export async function listStudents(params: StudentListParams): Promise<StudentListResult> {
  const page = Math.max(1, params.page ?? 1);
  const where = await buildStudentWhere(params);

  if (!where) {
    return { rows: [], total: 0, page, pageSize: STUDENTS_PAGE_SIZE };
  }

  const year = await getCurrentAcademicYear();

  const [total, students] = await Promise.all([
    prisma.studentProfile.count({ where }),
    prisma.studentProfile.findMany({
      where,
      skip: (page - 1) * STUDENTS_PAGE_SIZE,
      take: STUDENTS_PAGE_SIZE,
      orderBy: [{ user: { name: "asc" } }],
      select: {
        id: true,
        userId: true,
        admissionNumber: true,
        rollNumber: true,
        status: true,
        user: { select: { name: true } },
        enrollments: {
          where: { academicYearId: year!.id },
          take: 1,
          select: { section: { select: { name: true, class: { select: { name: true } } } } },
        },
        parentLinks: {
          where: { isPrimary: true },
          take: 1,
          select: { parent: { select: { name: true } } },
        },
      },
    }),
  ]);

  const studentIds = students.map((student) => student.id);

  // Attendance and outstanding fees are aggregated for just this page's
  // students. Including them as nested relations on the query above would
  // pull every attendance row and invoice for all 25 students only to count
  // and sum them in application code.
  const [attendanceGroups, invoiceGroups] = await Promise.all([
    studentIds.length > 0
      ? prisma.attendanceRecord.groupBy({
          by: ["studentId", "status"],
          where: { studentId: { in: studentIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    studentIds.length > 0
      ? prisma.feeInvoice.groupBy({
          by: ["studentId"],
          where: { studentId: { in: studentIds }, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
          _sum: { totalAmount: true },
        })
      : Promise.resolve([]),
  ]);

  const attendanceByStudent = new Map<string, { present: number; total: number }>();
  for (const group of attendanceGroups) {
    const entry = attendanceByStudent.get(group.studentId) ?? { present: 0, total: 0 };
    entry.total += group._count._all;
    // "Late" still means the student attended — counting it as an absence
    // would make punctuality and attendance the same metric.
    if (group.status === "PRESENT" || group.status === "LATE") {
      entry.present += group._count._all;
    }
    attendanceByStudent.set(group.studentId, entry);
  }

  const outstandingByStudent = new Map(
    invoiceGroups.map((group) => [group.studentId, group._sum.totalAmount ?? 0])
  );

  const rows: StudentListRow[] = students.map((student) => {
    const attendance = attendanceByStudent.get(student.id);
    const enrollment = student.enrollments[0];

    return {
      id: student.id,
      userId: student.userId,
      name: student.user.name,
      admissionNumber: student.admissionNumber,
      rollNumber: student.rollNumber,
      className: enrollment?.section.class.name ?? "—",
      sectionName: enrollment?.section.name ?? "—",
      status: student.status,
      guardianName: student.parentLinks[0]?.parent.name ?? null,
      attendancePercent:
        attendance && attendance.total > 0 ? (attendance.present / attendance.total) * 100 : null,
      outstandingAmount: outstandingByStudent.get(student.id) ?? 0,
    };
  });

  return { rows, total, page, pageSize: STUDENTS_PAGE_SIZE };
}
