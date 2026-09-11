import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { SessionInfo } from "@/lib/auth/current-user";
import { getCurrentAcademicYear, resolveVisibleSectionIds } from "./academics";
import { getStudentSection } from "./timetable";

export const ASSIGNMENTS_PAGE_SIZE = 20;

export interface AssignmentListRow {
  id: string;
  title: string;
  subjectName: string;
  sectionLabel: string;
  teacherName: string;
  dueDate: Date;
  maxMarks: number;
  submissionCount: number;
  gradedCount: number;
  rosterSize: number;
  /** Only meaningful for a student — their own submission state. */
  myStatus: "SUBMITTED" | "LATE" | "GRADED" | "MISSING" | null;
  myMarks: number | null;
}

/**
 * Resolves which assignments a session may see.
 *
 * Returns `null` when the answer is "none" — distinct from an empty filter,
 * which would mean "no restriction" and quietly show everything.
 */
async function buildAssignmentWhere(
  session: SessionInfo,
  filters: { sectionId?: string; subjectId?: string }
): Promise<Prisma.AssignmentWhereInput | null> {
  const year = await getCurrentAcademicYear();
  if (!year) return null;

  const where: Prisma.AssignmentWhereInput = {
    section: { academicYearId: year.id },
  };

  if (session.role === "STUDENT") {
    const enrollment = await getStudentSection(session.userId);
    if (!enrollment) return null;
    where.sectionId = enrollment.sectionId;
  } else {
    const visible = await resolveVisibleSectionIds(session);
    if (visible !== "ALL") {
      if (visible.length === 0) return null;
      const allowed = filters.sectionId
        ? visible.filter((id) => id === filters.sectionId)
        : visible;
      if (allowed.length === 0) return null;
      where.sectionId = { in: allowed };
    } else if (filters.sectionId) {
      where.sectionId = filters.sectionId;
    }
  }

  if (filters.subjectId) where.subjectId = filters.subjectId;

  return where;
}

export async function listAssignments(params: {
  session: SessionInfo;
  sectionId?: string;
  subjectId?: string;
  page?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const where = await buildAssignmentWhere(params.session, params);

  if (!where) {
    return { rows: [] as AssignmentListRow[], total: 0, page, pageSize: ASSIGNMENTS_PAGE_SIZE };
  }

  // A student's own submission is included per row so the list can show
  // "submitted / graded / missing" without a query per assignment.
  const studentProfileId =
    params.session.role === "STUDENT"
      ? (await prisma.studentProfile.findUnique({
          where: { userId: params.session.userId },
          select: { id: true },
        }))?.id
      : undefined;

  const [total, assignments] = await Promise.all([
    prisma.assignment.count({ where }),
    prisma.assignment.findMany({
      where,
      skip: (page - 1) * ASSIGNMENTS_PAGE_SIZE,
      take: ASSIGNMENTS_PAGE_SIZE,
      orderBy: { dueDate: "desc" },
      select: {
        id: true,
        title: true,
        dueDate: true,
        maxMarks: true,
        subject: { select: { name: true } },
        teacher: { select: { name: true } },
        section: {
          select: { id: true, name: true, class: { select: { name: true } }, _count: { select: { enrollments: true } } },
        },
        submissions: studentProfileId
          ? { where: { studentId: studentProfileId }, select: { status: true, marksObtained: true } }
          : false,
        _count: { select: { submissions: true } },
      },
    }),
  ]);

  // Graded counts come from one grouped query over the page's assignments
  // rather than a nested count per row.
  const gradedGroups = await prisma.submission.groupBy({
    by: ["assignmentId"],
    where: { assignmentId: { in: assignments.map((a) => a.id) }, status: "GRADED" },
    _count: { _all: true },
  });
  const gradedByAssignment = new Map(gradedGroups.map((g) => [g.assignmentId, g._count._all]));

  const rows: AssignmentListRow[] = assignments.map((assignment) => {
    const mine = Array.isArray(assignment.submissions) ? assignment.submissions[0] : undefined;
    return {
      id: assignment.id,
      title: assignment.title,
      subjectName: assignment.subject.name,
      sectionLabel: `${assignment.section.class.name} — ${assignment.section.name}`,
      teacherName: assignment.teacher.name,
      dueDate: assignment.dueDate,
      maxMarks: assignment.maxMarks,
      submissionCount: assignment._count.submissions,
      gradedCount: gradedByAssignment.get(assignment.id) ?? 0,
      rosterSize: assignment.section._count.enrollments,
      myStatus: mine?.status ?? (studentProfileId ? "MISSING" : null),
      myMarks: mine?.marksObtained ?? null,
    };
  });

  return { rows, total, page, pageSize: ASSIGNMENTS_PAGE_SIZE };
}

export async function getAssignmentDetail(assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      title: true,
      description: true,
      dueDate: true,
      maxMarks: true,
      attachmentUrl: true,
      createdAt: true,
      sectionId: true,
      subject: { select: { id: true, name: true, code: true } },
      teacher: { select: { id: true, name: true } },
      section: { select: { id: true, name: true, class: { select: { name: true } } } },
    },
  });

  if (!assignment) notFound();
  return assignment;
}

/**
 * Every student on the roster paired with their submission — including the
 * ones who haven't submitted. A plain list of submissions would silently
 * omit exactly the students a teacher is looking for.
 */
export async function getAssignmentRoster(assignmentId: string, sectionId: string) {
  const year = await getCurrentAcademicYear();

  const [enrollments, submissions] = await Promise.all([
    prisma.enrollment.findMany({
      where: { sectionId, ...(year ? { academicYearId: year.id } : {}), status: "ACTIVE" },
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
    prisma.submission.findMany({
      where: { assignmentId },
      select: {
        id: true,
        studentId: true,
        status: true,
        submittedAt: true,
        marksObtained: true,
        feedback: true,
        fileUrl: true,
      },
    }),
  ]);

  const byStudent = new Map(submissions.map((submission) => [submission.studentId, submission]));

  return enrollments
    .map(({ student }) => ({
      studentId: student.id,
      name: student.user.name,
      rollNumber: student.rollNumber,
      admissionNumber: student.admissionNumber,
      submission: byStudent.get(student.id) ?? null,
    }))
    .sort((a, b) => {
      const rollA = Number(a.rollNumber);
      const rollB = Number(b.rollNumber);
      if (Number.isFinite(rollA) && Number.isFinite(rollB)) return rollA - rollB;
      return a.name.localeCompare(b.name);
    });
}

export async function getMySubmission(assignmentId: string, userId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return null;

  return prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: profile.id } },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      marksObtained: true,
      feedback: true,
      fileUrl: true,
    },
  });
}
