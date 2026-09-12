import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentAcademicYear } from "./academics";

export interface ClassListRow {
  id: string;
  label: string;
  className: string;
  sectionName: string;
  classTeacher: { id: string; name: string } | null;
  studentCount: number;
  capacity: number | null;
  subjectCount: number;
}

export async function listClasses(sectionIds: string[] | "ALL"): Promise<ClassListRow[]> {
  const year = await getCurrentAcademicYear();
  if (!year) return [];
  if (sectionIds !== "ALL" && sectionIds.length === 0) return [];

  const sections = await prisma.section.findMany({
    where: {
      academicYearId: year.id,
      ...(sectionIds === "ALL" ? {} : { id: { in: sectionIds } }),
    },
    orderBy: [{ class: { sortOrder: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      capacity: true,
      class: { select: { name: true } },
      classTeacher: { select: { id: true, name: true } },
      // Counting through the relation lets PostgreSQL do the aggregation
      // rather than shipping every enrollment row back to count in JS.
      _count: { select: { enrollments: true, teacherAssignments: true } },
    },
  });

  return sections.map((section) => ({
    id: section.id,
    label: `${section.class.name} — ${section.name}`,
    className: section.class.name,
    sectionName: section.name,
    classTeacher: section.classTeacher,
    studentCount: section._count.enrollments,
    capacity: section.capacity,
    subjectCount: section._count.teacherAssignments,
  }));
}

export async function getClassDetail(sectionId: string) {
  const year = await getCurrentAcademicYear();

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: {
      id: true,
      name: true,
      capacity: true,
      class: { select: { id: true, name: true } },
      academicYear: { select: { id: true, name: true } },
      classTeacher: { select: { id: true, name: true, email: true, phone: true } },
      teacherAssignments: {
        select: {
          id: true,
          subject: { select: { id: true, name: true, code: true } },
          teacher: { select: { id: true, name: true } },
        },
      },
      enrollments: {
        where: year ? { academicYearId: year.id } : undefined,
        select: {
          student: {
            select: {
              id: true,
              rollNumber: true,
              admissionNumber: true,
              status: true,
              user: { select: { name: true } },
            },
          },
        },
      },
      timetableSlots: {
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          room: true,
          subject: { select: { name: true, code: true } },
          teacher: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!section) notFound();

  const roster = section.enrollments
    .map((enrollment) => enrollment.student)
    .sort((a, b) => {
      // Roll numbers are stored as strings but read as numbers.
      const rollA = Number(a.rollNumber);
      const rollB = Number(b.rollNumber);
      if (Number.isFinite(rollA) && Number.isFinite(rollB)) return rollA - rollB;
      return a.user.name.localeCompare(b.user.name);
    });

  return { ...section, roster };
}

