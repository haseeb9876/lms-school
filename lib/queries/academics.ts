import { cache } from "react";
import { prisma } from "@/lib/db";

/**
 * Shared reads for the academic skeleton (year, terms, classes, sections).
 *
 * Wrapped in React's `cache()` so that when a page, its layout and three
 * components each ask for "the current academic year", they share one query
 * per request instead of issuing four identical ones.
 */

export const getCurrentAcademicYear = cache(async () => {
  const current = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  // Falling back to the most recent year keeps every page rendering on a
  // database where nobody has flagged a current year yet, instead of
  // cascading a null through the whole app.
  return current ?? (await prisma.academicYear.findFirst({ orderBy: { startDate: "desc" } }));
});

export interface SectionOption {
  id: string;
  label: string;
  classId: string;
  className: string;
  sectionName: string;
  sortOrder: number;
}

/** All sections in the current year, ordered the way a school lists them. */
export const getSectionOptions = cache(async (): Promise<SectionOption[]> => {
  const year = await getCurrentAcademicYear();
  if (!year) return [];

  const sections = await prisma.section.findMany({
    where: { academicYearId: year.id },
    select: { id: true, name: true, classId: true, class: { select: { name: true, sortOrder: true } } },
    orderBy: [{ class: { sortOrder: "asc" } }, { name: "asc" }],
  });

  return sections.map((section) => ({
    id: section.id,
    label: `${section.class.name} — ${section.name}`,
    classId: section.classId,
    className: section.class.name,
    sectionName: section.name,
    sortOrder: section.class.sortOrder,
  }));
});

/**
 * The sections a teacher is responsible for — the basis for every teacher
 * view.
 *
 * Two routes in, and both must be here. A teacher takes a section because
 * they teach a subject in it, *or* because they are its class teacher.
 * Listing only the first produced a genuine contradiction: a class teacher
 * who taught no subject in their own form could open those students
 * individually and mark their register (both of which check class-teacher
 * status), while the class itself was missing from their student list and
 * class filter. They were responsible for a class they could not see.
 */
export const getTeacherSectionOptions = cache(async (teacherId: string): Promise<SectionOption[]> => {
  const year = await getCurrentAcademicYear();
  if (!year) return [];

  const sections = await prisma.section.findMany({
    where: {
      academicYearId: year.id,
      OR: [{ teacherAssignments: { some: { teacherId } } }, { classTeacherId: teacherId }],
    },
    select: { id: true, name: true, classId: true, class: { select: { name: true, sortOrder: true } } },
    orderBy: [{ class: { sortOrder: "asc" } }, { name: "asc" }],
  });

  return sections.map((section) => ({
    id: section.id,
    label: `${section.class.name} — ${section.name}`,
    classId: section.classId,
    className: section.class.name,
    sectionName: section.name,
    sortOrder: section.class.sortOrder,
  }));
});

export const getSubjectOptions = cache(async () => {
  return prisma.subject.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
});

/**
 * Section ids a given session is allowed to read, or "ALL" for a principal.
 * Every list query that accepts a `sectionId` filter narrows against this,
 * so a teacher passing another section's id gets nothing rather than data.
 */
export async function resolveVisibleSectionIds(session: {
  userId: string;
  role: string;
}): Promise<string[] | "ALL"> {
  if (session.role === "PRINCIPAL") return "ALL";
  if (session.role !== "TEACHER") return [];

  const sections = await getTeacherSectionOptions(session.userId);
  return sections.map((section) => section.id);
}
