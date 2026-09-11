import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { SessionInfo } from "@/lib/auth/current-user";
import { getCurrentAcademicYear, resolveVisibleSectionIds } from "./academics";

export const EXAMS_PAGE_SIZE = 25;

export interface ExamListRow {
  id: string;
  name: string;
  subjectName: string;
  sectionLabel: string;
  termName: string;
  examDate: Date;
  totalMarks: number;
  resultCount: number;
  rosterSize: number;
  averagePercent: number | null;
}

export async function listExams(params: {
  session: SessionInfo;
  sectionId?: string;
  subjectId?: string;
  termId?: string;
  page?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const year = await getCurrentAcademicYear();

  if (!year) return { rows: [] as ExamListRow[], total: 0, page, pageSize: EXAMS_PAGE_SIZE };

  const visible = await resolveVisibleSectionIds(params.session);
  if (visible !== "ALL" && visible.length === 0) {
    return { rows: [] as ExamListRow[], total: 0, page, pageSize: EXAMS_PAGE_SIZE };
  }

  const where: Prisma.ExamWhereInput = { section: { academicYearId: year.id } };

  if (visible === "ALL") {
    if (params.sectionId) where.sectionId = params.sectionId;
  } else {
    const allowed = params.sectionId ? visible.filter((id) => id === params.sectionId) : visible;
    if (allowed.length === 0) {
      return { rows: [] as ExamListRow[], total: 0, page, pageSize: EXAMS_PAGE_SIZE };
    }
    where.sectionId = { in: allowed };
  }

  if (params.subjectId) where.subjectId = params.subjectId;
  if (params.termId) where.termId = params.termId;

  const [total, exams] = await Promise.all([
    prisma.exam.count({ where }),
    prisma.exam.findMany({
      where,
      skip: (page - 1) * EXAMS_PAGE_SIZE,
      take: EXAMS_PAGE_SIZE,
      orderBy: [{ examDate: "desc" }],
      select: {
        id: true,
        name: true,
        examDate: true,
        totalMarks: true,
        subject: { select: { name: true } },
        term: { select: { name: true } },
        section: {
          select: { name: true, class: { select: { name: true } }, _count: { select: { enrollments: true } } },
        },
        _count: { select: { results: true } },
      },
    }),
  ]);

  // One grouped query gives every exam on this page its average, instead of
  // loading each exam's result rows to average them in application code.
  const averages = await prisma.examResult.groupBy({
    by: ["examId"],
    where: { examId: { in: exams.map((exam) => exam.id) } },
    _avg: { marksObtained: true },
  });
  const averageByExam = new Map(averages.map((group) => [group.examId, group._avg.marksObtained]));

  const rows: ExamListRow[] = exams.map((exam) => {
    const averageMarks = averageByExam.get(exam.id);
    return {
      id: exam.id,
      name: exam.name,
      subjectName: exam.subject.name,
      sectionLabel: `${exam.section.class.name} — ${exam.section.name}`,
      termName: exam.term.name,
      examDate: exam.examDate,
      totalMarks: exam.totalMarks,
      resultCount: exam._count.results,
      rosterSize: exam.section._count.enrollments,
      averagePercent:
        averageMarks != null && exam.totalMarks > 0 ? (averageMarks / exam.totalMarks) * 100 : null,
    };
  });

  return { rows, total, page, pageSize: EXAMS_PAGE_SIZE };
}

export async function getExamDetail(examId: string) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      name: true,
      examDate: true,
      totalMarks: true,
      sectionId: true,
      subjectId: true,
      subject: { select: { id: true, name: true, code: true } },
      term: { select: { id: true, name: true } },
      section: { select: { id: true, name: true, class: { select: { name: true } } } },
      createdBy: { select: { name: true } },
    },
  });

  if (!exam) notFound();
  return exam;
}

/**
 * The roster paired with each student's result, including students with no
 * result yet — the whole point of a mark-entry screen is the blanks.
 */
export async function getExamRoster(examId: string, sectionId: string) {
  const year = await getCurrentAcademicYear();

  const [enrollments, results] = await Promise.all([
    prisma.enrollment.findMany({
      where: { sectionId, ...(year ? { academicYearId: year.id } : {}), status: "ACTIVE" },
      select: {
        student: {
          select: {
            id: true,
            rollNumber: true,
            admissionNumber: true,
            user: { select: { name: true } },
          },
        },
      },
    }),
    prisma.examResult.findMany({
      where: { examId },
      select: { studentId: true, marksObtained: true, grade: true, remarks: true },
    }),
  ]);

  const byStudent = new Map(results.map((result) => [result.studentId, result]));

  return enrollments
    .map(({ student }) => ({
      studentId: student.id,
      name: student.user.name,
      rollNumber: student.rollNumber,
      admissionNumber: student.admissionNumber,
      result: byStudent.get(student.id) ?? null,
    }))
    .sort((a, b) => {
      const rollA = Number(a.rollNumber);
      const rollB = Number(b.rollNumber);
      if (Number.isFinite(rollA) && Number.isFinite(rollB)) return rollA - rollB;
      return a.name.localeCompare(b.name);
    });
}

export interface SubjectResult {
  subjectName: string;
  examName: string;
  termName: string;
  examDate: Date;
  marksObtained: number;
  totalMarks: number;
  percent: number;
  grade: string | null;
}

/** A single student's full result history, newest first. */
export async function getStudentResultCard(studentId: string): Promise<SubjectResult[]> {
  const results = await prisma.examResult.findMany({
    where: { studentId },
    orderBy: [{ exam: { examDate: "desc" } }],
    select: {
      marksObtained: true,
      grade: true,
      exam: {
        select: {
          name: true,
          totalMarks: true,
          examDate: true,
          subject: { select: { name: true } },
          term: { select: { name: true } },
        },
      },
    },
  });

  return results.map((result) => ({
    subjectName: result.exam.subject.name,
    examName: result.exam.name,
    termName: result.exam.term.name,
    examDate: result.exam.examDate,
    marksObtained: result.marksObtained,
    totalMarks: result.exam.totalMarks,
    percent: result.exam.totalMarks > 0 ? (result.marksObtained / result.exam.totalMarks) * 100 : 0,
    grade: result.grade,
  }));
}

export const getTermOptions = async () => {
  const year = await getCurrentAcademicYear();
  if (!year) return [];
  return prisma.term.findMany({
    where: { academicYearId: year.id },
    orderBy: { startDate: "asc" },
    select: { id: true, name: true },
  });
};
