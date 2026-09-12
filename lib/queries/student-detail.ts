import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { decryptField } from "@/lib/crypto/encryption";
import { getCurrentAcademicYear } from "./academics";

/**
 * Everything the student profile screen shows, loaded once and shared
 * between the page and its metadata via `cache()`.
 */
export const getStudentDetail = cache(async (studentId: string) => {
  const year = await getCurrentAcademicYear();

  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      admissionNumber: true,
      rollNumber: true,
      dateOfBirth: true,
      gender: true,
      address: true,
      admissionDate: true,
      status: true,
      user: {
        select: { id: true, name: true, email: true, phone: true, cnic: true, status: true, lastLoginAt: true },
      },
      enrollments: {
        where: year ? { academicYearId: year.id } : undefined,
        take: 1,
        select: {
          section: {
            select: {
              id: true,
              name: true,
              class: { select: { name: true } },
              classTeacher: { select: { id: true, name: true } },
            },
          },
        },
      },
      parentLinks: {
        select: {
          relationship: true,
          isPrimary: true,
          parent: { select: { id: true, name: true, phone: true, email: true } },
        },
      },
    },
  });

  if (!student) notFound();

  return student;
});

export type StudentDetail = Awaited<ReturnType<typeof getStudentDetail>>;

/**
 * The CNIC is stored encrypted and is the student's login identifier, so it
 * is decrypted only where a page has already established that the viewer is
 * allowed to see it — never as part of a list query.
 */
export function revealCnic(encrypted: string): string {
  try {
    return decryptField(encrypted);
  } catch {
    // A value encrypted under a rotated key shouldn't take down the profile
    // page; the rest of the record is still perfectly useful.
    return "Unavailable";
  }
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  percent: number | null;
}

export async function getStudentAttendanceSummary(studentId: string): Promise<AttendanceSummary> {
  const groups = await prisma.attendanceRecord.groupBy({
    by: ["status"],
    where: { studentId },
    _count: { _all: true },
  });

  const counts = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const group of groups) {
    if (group.status === "PRESENT") counts.present = group._count._all;
    if (group.status === "ABSENT") counts.absent = group._count._all;
    if (group.status === "LATE") counts.late = group._count._all;
    if (group.status === "EXCUSED") counts.excused = group._count._all;
  }

  const total = counts.present + counts.absent + counts.late + counts.excused;
  return {
    ...counts,
    total,
    // Late still counts as attending — otherwise punctuality and attendance
    // collapse into a single, misleading number.
    percent: total > 0 ? ((counts.present + counts.late) / total) * 100 : null,
  };
}

export async function getStudentRecentAttendance(studentId: string, take = 30) {
  return prisma.attendanceRecord.findMany({
    where: { studentId },
    orderBy: { date: "desc" },
    take,
    select: { id: true, date: true, status: true, remarks: true },
  });
}

export async function getStudentResults(studentId: string) {
  return prisma.examResult.findMany({
    where: { studentId },
    orderBy: [{ exam: { examDate: "desc" } }],
    select: {
      id: true,
      marksObtained: true,
      grade: true,
      remarks: true,
      exam: {
        select: {
          id: true,
          name: true,
          totalMarks: true,
          examDate: true,
          subject: { select: { name: true, code: true } },
          term: { select: { name: true } },
        },
      },
    },
  });
}

export async function getStudentInvoices(studentId: string) {
  return prisma.feeInvoice.findMany({
    where: { studentId },
    orderBy: { dueDate: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      status: true,
      dueDate: true,
      issuedAt: true,
      payments: { select: { amountPaid: true } },
    },
  });
}

export async function getStudentSubmissions(studentId: string) {
  return prisma.submission.findMany({
    where: { studentId },
    orderBy: { assignment: { dueDate: "desc" } },
    take: 30,
    select: {
      id: true,
      status: true,
      marksObtained: true,
      feedback: true,
      submittedAt: true,
      assignment: {
        select: {
          id: true,
          title: true,
          maxMarks: true,
          dueDate: true,
          subject: { select: { name: true } },
        },
      },
    },
  });
}
