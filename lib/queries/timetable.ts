import { prisma } from "@/lib/db";
import type { TimetableEntry } from "@/components/timetable/TimetableGrid";
import { getCurrentAcademicYear } from "./academics";

/** One section's weekly timetable — what a student or class teacher sees. */
export async function getSectionTimetable(sectionId: string): Promise<TimetableEntry[]> {
  const slots = await prisma.timetableSlot.findMany({
    where: { sectionId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      room: true,
      subject: { select: { name: true } },
      teacher: { select: { name: true } },
    },
  });

  return slots.map((slot) => ({
    id: slot.id,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    room: slot.room,
    subjectName: slot.subject.name,
    teacherName: slot.teacher.name,
  }));
}

/**
 * A teacher's own week across every class they take. The section label
 * replaces the teacher name in each cell — on your own timetable, "who is
 * teaching this" is never the question; "which class am I walking into" is.
 */
export async function getTeacherTimetable(teacherId: string): Promise<TimetableEntry[]> {
  const year = await getCurrentAcademicYear();

  const slots = await prisma.timetableSlot.findMany({
    where: { teacherId, ...(year ? { section: { academicYearId: year.id } } : {}) },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      room: true,
      subject: { select: { name: true } },
      section: { select: { name: true, class: { select: { name: true } } } },
    },
  });

  return slots.map((slot) => ({
    id: slot.id,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    room: slot.room,
    subjectName: slot.subject.name,
    sectionLabel: `${slot.section.class.name} — ${slot.section.name}`,
  }));
}

/** The section a student is currently enrolled in. */
export async function getStudentSection(userId: string) {
  const year = await getCurrentAcademicYear();

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      enrollments: {
        where: year ? { academicYearId: year.id } : undefined,
        take: 1,
        select: {
          section: { select: { id: true, name: true, class: { select: { name: true } } } },
        },
      },
    },
  });

  const section = profile?.enrollments[0]?.section;
  if (!profile || !section) return null;

  return {
    studentId: profile.id,
    sectionId: section.id,
    label: `${section.class.name} — ${section.name}`,
  };
}

/** Every child linked to a guardian, with their current section. */
export async function getChildrenForParent(parentId: string) {
  const year = await getCurrentAcademicYear();

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId },
    select: {
      relationship: true,
      student: {
        select: {
          id: true,
          rollNumber: true,
          admissionNumber: true,
          status: true,
          user: { select: { id: true, name: true } },
          enrollments: {
            where: year ? { academicYearId: year.id } : undefined,
            take: 1,
            select: {
              section: { select: { id: true, name: true, class: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  return links.map((link) => {
    const section = link.student.enrollments[0]?.section;
    return {
      id: link.student.id,
      name: link.student.user.name,
      rollNumber: link.student.rollNumber,
      admissionNumber: link.student.admissionNumber,
      status: link.student.status,
      relationship: link.relationship,
      sectionId: section?.id ?? null,
      sectionLabel: section ? `${section.class.name} — ${section.name}` : "Not enrolled",
    };
  });
}
