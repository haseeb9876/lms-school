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
  /*
   * One query, not two. The obvious version looks up the current year and
   * then its sections, but those are sequential round trips against a
   * database far enough away that each costs ~260ms — and this list is
   * loaded by nearly every page that has a class filter. Joining the year
   * in makes it a single trip.
   */
  const rows = await prisma.$queryRaw<
    { id: string; name: string; class_id: string; class_name: string; sort_order: number }[]
  >`
    SELECT sec.id,
           sec.name,
           sec."classId"  AS class_id,
           c.name         AS class_name,
           c."sortOrder"  AS sort_order
    FROM "Section" sec
    JOIN "Class" c        ON c.id = sec."classId"
    JOIN "AcademicYear" y ON y.id = sec."academicYearId"
    WHERE y."isCurrent" = TRUE
    ORDER BY c."sortOrder" ASC, sec.name ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    label: `${row.class_name} — ${row.name}`,
    classId: row.class_id,
    className: row.class_name,
    sectionName: row.name,
    sortOrder: row.sort_order,
  }));
});

export const getTeacherSectionOptions = cache(async (teacherId: string): Promise<SectionOption[]> => {
  /*
   * Both routes a teacher can hold a class by, in one query: they teach a
   * subject in it, or they are its class teacher. Listing only the first
   * produced a genuine contradiction — a class teacher who taught no
   * subject in their own form could open those students and mark their
   * register, while the class was missing from their student list.
   */
  const rows = await prisma.$queryRaw<
    { id: string; name: string; class_id: string; class_name: string; sort_order: number }[]
  >`
    SELECT DISTINCT
           sec.id,
           sec.name,
           sec."classId" AS class_id,
           c.name        AS class_name,
           c."sortOrder" AS sort_order
    FROM "Section" sec
    JOIN "Class" c        ON c.id = sec."classId"
    JOIN "AcademicYear" y ON y.id = sec."academicYearId"
    WHERE y."isCurrent" = TRUE
      AND (
        sec."classTeacherId" = ${teacherId}
        OR EXISTS (
          SELECT 1 FROM "TeacherSubjectAssignment" tsa
          WHERE tsa."sectionId" = sec.id AND tsa."teacherId" = ${teacherId}
        )
      )
    ORDER BY c."sortOrder" ASC, sec.name ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    label: `${row.class_name} — ${row.name}`,
    classId: row.class_id,
    className: row.class_name,
    sectionName: row.name,
    sortOrder: row.sort_order,
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
