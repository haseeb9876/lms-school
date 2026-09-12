import { Prisma, type StudentStatus } from "@prisma/client";
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
  /** Share of marked days present or late. Null when nothing is marked. */
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
 * Builds the WHERE fragment shared by the count and the page query.
 *
 * Composed with `Prisma.sql`, so every value is a bound parameter — nothing
 * here is string-concatenated into SQL, including the search term.
 */
function buildFilters(params: {
  yearId: string;
  allowedSectionIds?: string[];
  status?: StudentStatus;
  query?: string;
}): Prisma.Sql {
  const clauses: Prisma.Sql[] = [Prisma.sql`e."academicYearId" = ${params.yearId}`];

  if (params.allowedSectionIds) {
    clauses.push(Prisma.sql`e."sectionId" = ANY(${params.allowedSectionIds})`);
  }
  if (params.status) {
    clauses.push(Prisma.sql`s.status = ${params.status}::"StudentStatus"`);
  }

  const query = params.query?.trim();
  if (query) {
    const like = `%${query}%`;
    // CNIC is encrypted with a random IV, so it can't be matched with LIKE.
    // A query that looks like a CNIC resolves through the blind index, which
    // is exactly what that deterministic hash exists for.
    const digits = normalizeCnic(query);
    const cnicClause =
      digits.length >= 13
        ? Prisma.sql` OR u."cnicHash" = ${blindIndex(digits)}`
        : Prisma.empty;

    clauses.push(
      Prisma.sql`(u.name ILIKE ${like} OR s."admissionNumber" ILIKE ${like}${cnicClause})`
    );
  }

  return Prisma.join(clauses, " AND ");
}

/**
 * One page of students, with the figures the list shows, in two round trips.
 *
 * Written as SQL rather than a nested Prisma `select` because Prisma issues
 * a separate query per nested relation: the enrollment, the section, the
 * class, the guardian link, then two grouped aggregates. Against a database
 * ~240ms away that was roughly seven sequential round trips and measured
 * close to seven seconds for a single page of twenty-five students.
 *
 * The lateral sub-selects are each evaluated per returned row — twenty-five
 * of them — rather than over the whole table, so this stays flat as the roll
 * grows towards 15,000.
 */
export async function listStudents(params: StudentListParams): Promise<StudentListResult> {
  const page = Math.max(1, params.page ?? 1);
  const empty: StudentListResult = { rows: [], total: 0, page, pageSize: STUDENTS_PAGE_SIZE };

  const year = await getCurrentAcademicYear();
  if (!year) return empty;

  /*
   * Visibility is applied as a filter rather than checked afterwards, so a
   * teacher who passes a sectionId they don't teach gets an empty list
   * instead of another class's roster.
   */
  const visible = await resolveVisibleSectionIds(params.session);
  if (visible !== "ALL" && visible.length === 0) return empty;

  let allowedSectionIds: string[] | undefined;
  if (visible === "ALL") {
    allowedSectionIds = params.sectionId ? [params.sectionId] : undefined;
  } else {
    allowedSectionIds = params.sectionId
      ? visible.filter((id) => id === params.sectionId)
      : visible;
    if (allowedSectionIds.length === 0) return empty;
  }

  const where = buildFilters({
    yearId: year.id,
    allowedSectionIds,
    status: params.status,
    query: params.query,
  });

  const offset = (page - 1) * STUDENTS_PAGE_SIZE;

  const [countRows, rows] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "StudentProfile" s
      JOIN "User" u       ON u.id = s."userId"
      JOIN "Enrollment" e ON e."studentId" = s.id
      WHERE ${where}
    `,
    prisma.$queryRaw<
      {
        id: string;
        user_id: string;
        name: string;
        admission_number: string;
        roll_number: string | null;
        status: StudentStatus;
        class_name: string;
        section_name: string;
        guardian_name: string | null;
        attendance_percent: number | null;
        outstanding: number | null;
      }[]
    >`
      SELECT s.id,
             s."userId"          AS user_id,
             u.name,
             s."admissionNumber" AS admission_number,
             s."rollNumber"      AS roll_number,
             s.status,
             c.name   AS class_name,
             sec.name AS section_name,
             g.name   AS guardian_name,
             att.percent AS attendance_percent,
             dues.amount AS outstanding
      FROM "StudentProfile" s
      JOIN "User" u       ON u.id = s."userId"
      JOIN "Enrollment" e ON e."studentId" = s.id
      JOIN "Section" sec  ON sec.id = e."sectionId"
      JOIN "Class" c      ON c.id = sec."classId"
      LEFT JOIN LATERAL (
        SELECT pu.name
        FROM "ParentStudentLink" pl
        JOIN "User" pu ON pu.id = pl."parentId"
        WHERE pl."studentId" = s.id AND pl."isPrimary" = TRUE
        LIMIT 1
      ) g ON TRUE
      LEFT JOIN LATERAL (
        SELECT (SUM(CASE WHEN a.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END)::float
                  / NULLIF(COUNT(*), 0) * 100) AS percent
        FROM "AttendanceRecord" a
        WHERE a."studentId" = s.id
      ) att ON TRUE
      LEFT JOIN LATERAL (
        SELECT SUM(i."totalAmount")::float AS amount
        FROM "FeeInvoice" i
        WHERE i."studentId" = s.id
          AND i.status IN ('PENDING', 'OVERDUE', 'PARTIAL')
      ) dues ON TRUE
      WHERE ${where}
      ORDER BY u.name ASC
      LIMIT ${STUDENTS_PAGE_SIZE} OFFSET ${offset}
    `,
  ]);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      admissionNumber: row.admission_number,
      rollNumber: row.roll_number,
      className: row.class_name,
      sectionName: row.section_name,
      status: row.status,
      guardianName: row.guardian_name,
      attendancePercent: row.attendance_percent === null ? null : Number(row.attendance_percent),
      outstandingAmount: Number(row.outstanding ?? 0),
    })),
    total: Number(countRows[0]?.count ?? 0),
    page,
    pageSize: STUDENTS_PAGE_SIZE,
  };
}
