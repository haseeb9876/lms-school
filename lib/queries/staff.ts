import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { blindIndex } from "@/lib/crypto/encryption";
import { normalizeCnic } from "@/lib/crypto/identifiers";
import { getCurrentAcademicYear } from "./academics";

export const STAFF_PAGE_SIZE = 25;

/**
 * Search across a user's plaintext fields, plus an exact CNIC match through
 * the blind index — the encrypted column can't be matched with a LIKE, so
 * the deterministic hash is the only way to look someone up by CNIC.
 */
function userSearchConditions(query: string): Prisma.UserWhereInput[] {
  const conditions: Prisma.UserWhereInput[] = [
    { name: { contains: query, mode: "insensitive" } },
    { email: { contains: query, mode: "insensitive" } },
  ];

  const digits = normalizeCnic(query);
  if (digits.length >= 13) conditions.push({ cnicHash: blindIndex(digits) });

  return conditions;
}

export interface TeacherListRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  employeeId: string | null;
  qualification: string | null;
  status: "ACTIVE" | "SUSPENDED";
  subjectCount: number;
  sectionCount: number;
  isClassTeacherOf: string[];
}

/**
 * One page of teaching staff, with their load, in two round trips.
 *
 * The nested-relation version pulled the profile, every assignment and
 * every class-teacher row separately — Prisma issues a query per relation
 * level — which is several serial round trips for figures that are just
 * counts. Counting them in SQL keeps this flat as the staff list grows.
 */
export async function listTeachers(params: { query?: string; page?: number }) {
  const page = Math.max(1, params.page ?? 1);
  const offset = (page - 1) * STAFF_PAGE_SIZE;

  const clauses: Prisma.Sql[] = [Prisma.sql`u.role = 'TEACHER'`];

  const query = params.query?.trim();
  if (query) {
    const like = `%${query}%`;
    // CNIC is encrypted with a random IV, so it can't be matched with LIKE.
    // A query that looks like a CNIC resolves through the blind index.
    const digits = normalizeCnic(query);
    const cnicClause =
      digits.length >= 13 ? Prisma.sql` OR u."cnicHash" = ${blindIndex(digits)}` : Prisma.empty;

    clauses.push(
      Prisma.sql`(u.name ILIKE ${like} OR u.email ILIKE ${like} OR tp."employeeId" ILIKE ${like}${cnicClause})`
    );
  }

  const where = Prisma.join(clauses, " AND ");

  const [countRows, rows] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "User" u
      LEFT JOIN "TeacherProfile" tp ON tp."userId" = u.id
      WHERE ${where}
    `,
    prisma.$queryRaw<
      {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        status: "ACTIVE" | "SUSPENDED";
        employee_id: string | null;
        qualification: string | null;
        subject_count: bigint;
        section_count: bigint;
        class_teacher_of: string[] | null;
      }[]
    >`
      SELECT u.id,
             u.name,
             u.email,
             u.phone,
             u.status,
             tp."employeeId"    AS employee_id,
             tp.qualification,
             COALESCE(load.subject_count, 0) AS subject_count,
             COALESCE(load.section_count, 0) AS section_count,
             form.labels AS class_teacher_of
      FROM "User" u
      LEFT JOIN "TeacherProfile" tp ON tp."userId" = u.id
      LEFT JOIN LATERAL (
        -- DISTINCT because a teacher usually takes the same subject in
        -- several classes; counting raw assignments overstates both.
        SELECT COUNT(DISTINCT tsa."subjectId")::bigint AS subject_count,
               COUNT(DISTINCT tsa."sectionId")::bigint AS section_count
        FROM "TeacherSubjectAssignment" tsa
        JOIN "AcademicYear" y ON y.id = tsa."academicYearId" AND y."isCurrent" = TRUE
        WHERE tsa."teacherId" = u.id
      ) load ON TRUE
      LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(c.name || ' — ' || sec.name ORDER BY c."sortOrder", sec.name) AS labels
        FROM "Section" sec
        JOIN "Class" c        ON c.id = sec."classId"
        JOIN "AcademicYear" y ON y.id = sec."academicYearId" AND y."isCurrent" = TRUE
        WHERE sec."classTeacherId" = u.id
      ) form ON TRUE
      WHERE ${where}
      ORDER BY u.name ASC
      LIMIT ${STAFF_PAGE_SIZE} OFFSET ${offset}
    `,
  ]);

  const teacherRows: TeacherListRow[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    employeeId: row.employee_id,
    qualification: row.qualification,
    status: row.status,
    subjectCount: Number(row.subject_count),
    sectionCount: Number(row.section_count),
    isClassTeacherOf: row.class_teacher_of ?? [],
  }));

  return {
    rows: teacherRows,
    total: Number(countRows[0]?.count ?? 0),
    page,
    pageSize: STAFF_PAGE_SIZE,
  };
}

export interface GuardianListRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: "ACTIVE" | "SUSPENDED";
  children: { id: string; name: string; label: string; relationship: string }[];
}

export async function listGuardians(params: { query?: string; page?: number }) {
  const page = Math.max(1, params.page ?? 1);

  const where: Prisma.UserWhereInput = { role: "PARENT" };
  const query = params.query?.trim();
  if (query) {
    where.OR = [
      ...userSearchConditions(query),
      // Guardians are most often looked up by the child's name — "who is
      // Ayesha's father?" — so the child's name is part of the search.
      { parentLinks: { some: { student: { user: { name: { contains: query, mode: "insensitive" } } } } } },
    ];
  }

  const [total, guardians] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * STAFF_PAGE_SIZE,
      take: STAFF_PAGE_SIZE,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        status: true,
        parentLinks: {
          select: {
            relationship: true,
            student: {
              select: {
                id: true,
                user: { select: { name: true } },
                enrollments: {
                  take: 1,
                  orderBy: { createdAt: "desc" },
                  select: { section: { select: { name: true, class: { select: { name: true } } } } },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const rows: GuardianListRow[] = guardians.map((guardian) => ({
    id: guardian.id,
    name: guardian.name,
    phone: guardian.phone,
    email: guardian.email,
    status: guardian.status,
    children: guardian.parentLinks.map((link) => ({
      id: link.student.id,
      name: link.student.user.name,
      label: link.student.enrollments[0]
        ? `${link.student.enrollments[0].section.class.name} — ${link.student.enrollments[0].section.name}`
        : "—",
      relationship: link.relationship,
    })),
  }));

  return { rows, total, page, pageSize: STAFF_PAGE_SIZE };
}

/** Full staff record for the teacher profile page. */
export async function getTeacherDetail(teacherId: string) {
  const year = await getCurrentAcademicYear();

  return prisma.user.findFirst({
    where: { id: teacherId, role: "TEACHER" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      teacherProfile: { select: { employeeId: true, qualification: true, joiningDate: true } },
      teacherAssignments: {
        where: year ? { academicYearId: year.id } : undefined,
        select: {
          id: true,
          subject: { select: { id: true, name: true, code: true } },
          section: {
            select: { id: true, name: true, class: { select: { name: true, sortOrder: true } } },
          },
        },
      },
      classesAsTeacher: {
        where: year ? { academicYearId: year.id } : undefined,
        select: { id: true, name: true, class: { select: { name: true } } },
      },
    },
  });
}
