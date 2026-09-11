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

/** Sections a teacher actually teaches — the basis for every teacher view. */
export const getTeacherSectionOptions = cache(async (teacherId: string): Promise<SectionOption[]> => {
  const year = await getCurrentAcademicYear();
  if (!year) return [];

  const assignments = await prisma.teacherSubjectAssignment.findMany({
    where: { teacherId, academicYearId: year.id },
    select: {
      section: {
        select: { id: true, name: true, classId: true, class: { select: { name: true, sortOrder: true } } },
      },
    },
  });

  // A teacher usually teaches several subjects in the same section, so the
  // join returns that section once per subject — collapse to unique sections.
  const unique = new Map<string, SectionOption>();
  for (const { section } of assignments) {
    unique.set(section.id, {
      id: section.id,
      label: `${section.class.name} — ${section.name}`,
      classId: section.classId,
      className: section.class.name,
      sectionName: section.name,
      sortOrder: section.class.sortOrder,
    });
  }

  return [...unique.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.sectionName.localeCompare(b.sectionName)
  );
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
