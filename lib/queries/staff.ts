import type { Prisma } from "@prisma/client";
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

export async function listTeachers(params: { query?: string; page?: number }) {
  const page = Math.max(1, params.page ?? 1);
  const year = await getCurrentAcademicYear();

  const where: Prisma.UserWhereInput = { role: "TEACHER" };
  const query = params.query?.trim();
  if (query) where.OR = userSearchConditions(query);

  const [total, teachers] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * STAFF_PAGE_SIZE,
      take: STAFF_PAGE_SIZE,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        teacherProfile: { select: { employeeId: true, qualification: true } },
        teacherAssignments: {
          where: year ? { academicYearId: year.id } : undefined,
          select: { subjectId: true, sectionId: true },
        },
        classesAsTeacher: {
          where: year ? { academicYearId: year.id } : undefined,
          select: { name: true, class: { select: { name: true } } },
        },
      },
    }),
  ]);

  const rows: TeacherListRow[] = teachers.map((teacher) => ({
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    phone: teacher.phone,
    employeeId: teacher.teacherProfile?.employeeId ?? null,
    qualification: teacher.teacherProfile?.qualification ?? null,
    status: teacher.status,
    // A teacher usually teaches the same subject to several sections, so the
    // raw assignment count would overstate both figures.
    subjectCount: new Set(teacher.teacherAssignments.map((a) => a.subjectId)).size,
    sectionCount: new Set(teacher.teacherAssignments.map((a) => a.sectionId)).size,
    isClassTeacherOf: teacher.classesAsTeacher.map((section) => `${section.class.name} — ${section.name}`),
  }));

  return { rows, total, page, pageSize: STAFF_PAGE_SIZE };
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
