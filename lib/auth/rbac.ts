import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/errors";

interface SessionLike {
  userId: string;
  role: Role;
}

/**
 * Role checks alone don't stop parent A from viewing parent B's child, or a
 * teacher from touching a section they don't teach. These helpers derive
 * the allowed ID set from the session server-side — a client-supplied ID is
 * only ever used to *narrow* what's visible, never to expand it.
 */

export async function assertOwnsStudent(session: SessionLike, studentId: string): Promise<void> {
  if (session.role === "PRINCIPAL") return;

  if (session.role === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId } });
    if (profile?.id === studentId) return;
    throw new ApiError(403, "You can only access your own records.", "NOT_YOUR_RECORD");
  }

  if (session.role === "PARENT") {
    const link = await prisma.parentStudentLink.findUnique({
      where: { parentId_studentId: { parentId: session.userId, studentId } },
    });
    if (link) return;
    throw new ApiError(403, "You can only access your own children's records.", "NOT_YOUR_CHILD");
  }

  throw new ApiError(403, "You don't have permission to access this student's records.", "FORBIDDEN");
}

/**
 * Read access to one student's record.
 *
 * Broader than `assertOwnsStudent` because a teacher legitimately needs to
 * open the profile of any student in a section they teach, while still
 * being refused every student outside it. Kept separate from the ownership
 * check so that write paths (editing a record, marking attendance) keep the
 * stricter rule rather than inheriting this one by accident.
 */
export async function assertCanViewStudent(session: SessionLike, studentId: string): Promise<void> {
  if (session.role === "PRINCIPAL") return;

  if (session.role === "TEACHER") {
    const taught = await prisma.teacherSubjectAssignment.findFirst({
      where: { teacherId: session.userId, section: { enrollments: { some: { studentId } } } },
      select: { id: true },
    });
    if (taught) return;

    // A class teacher owns their section's pastoral record even for subjects
    // somebody else teaches.
    const classTeacher = await prisma.section.findFirst({
      where: { classTeacherId: session.userId, enrollments: { some: { studentId } } },
      select: { id: true },
    });
    if (classTeacher) return;

    throw new ApiError(403, "You can only view students in the classes you teach.", "NOT_YOUR_STUDENT");
  }

  return assertOwnsStudent(session, studentId);
}

export async function assertTeachesSection(session: SessionLike, sectionId: string): Promise<void> {
  if (session.role === "PRINCIPAL") return;
  if (session.role !== "TEACHER") {
    throw new ApiError(403, "Only teachers can do that.", "FORBIDDEN");
  }
  const assignment = await prisma.teacherSubjectAssignment.findFirst({
    where: { teacherId: session.userId, sectionId },
  });
  if (!assignment) {
    throw new ApiError(403, "You are not assigned to this section.", "NOT_YOUR_SECTION");
  }
}

export async function assertTeachesSubjectInSection(
  session: SessionLike,
  subjectId: string,
  sectionId: string
): Promise<void> {
  if (session.role === "PRINCIPAL") return;
  if (session.role !== "TEACHER") {
    throw new ApiError(403, "Only teachers can do that.", "FORBIDDEN");
  }
  const assignment = await prisma.teacherSubjectAssignment.findFirst({
    where: { teacherId: session.userId, sectionId, subjectId },
  });
  if (!assignment) {
    throw new ApiError(403, "You don't teach this subject in this section.", "NOT_YOUR_SUBJECT");
  }
}

/**
 * Marking a register is the class teacher's job, but any teacher who takes a
 * period for that section also needs to be able to mark it (cover lessons,
 * a class teacher on leave). Both routes are accepted here; every other
 * teacher is refused.
 */
export async function assertCanMarkAttendance(session: SessionLike, sectionId: string): Promise<void> {
  if (session.role === "PRINCIPAL") return;
  if (session.role !== "TEACHER") {
    throw new ApiError(403, "Only teachers can mark attendance.", "FORBIDDEN");
  }

  const [subjectAssignment, classTeacherOf] = await Promise.all([
    prisma.teacherSubjectAssignment.findFirst({
      where: { teacherId: session.userId, sectionId },
      select: { id: true },
    }),
    prisma.section.findFirst({
      where: { id: sectionId, classTeacherId: session.userId },
      select: { id: true },
    }),
  ]);

  if (subjectAssignment || classTeacherOf) return;

  throw new ApiError(403, "You are not assigned to this section.", "NOT_YOUR_SECTION");
}

/** Fee edits (invoices, payments, structures) are principal-only for now. */
export function assertIsPrincipal(session: SessionLike): void {
  if (session.role !== "PRINCIPAL") {
    throw new ApiError(403, "Only the principal can do that.", "PRINCIPAL_ONLY");
  }
}

/** Resolves the set of student ids a parent/student session is allowed to see. */
export async function resolveVisibleStudentIds(session: SessionLike): Promise<string[] | "ALL"> {
  if (session.role === "PRINCIPAL" || session.role === "TEACHER") return "ALL";

  if (session.role === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId } });
    return profile ? [profile.id] : [];
  }

  if (session.role === "PARENT") {
    const links = await prisma.parentStudentLink.findMany({
      where: { parentId: session.userId },
      select: { studentId: true },
    });
    return links.map((l) => l.studentId);
  }

  return [];
}
