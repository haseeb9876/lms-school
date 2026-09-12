import { prisma } from "@/lib/db";
import { gradeForPercentage } from "@/lib/grading";

/**
 * A student's full examination history — every paper they have sat, grouped
 * the way a report card reads, with their position in the class.
 *
 * Position matters here: in this school system a result is understood
 * relative to the class, and "72%" answers a different question from "72%,
 * 4th of 28". It is computed in the database with a window function over
 * the whole section, because working it out in application code would mean
 * pulling every classmate's marks back for every exam.
 */

export interface SubjectLine {
  subjectName: string;
  marksObtained: number;
  totalMarks: number;
  percent: number;
  grade: string | null;
  remarks: string | null;
}

export interface ExamRecord {
  examName: string;
  termName: string;
  academicYear: string;
  examDate: Date;
  sectionLabel: string;
  subjects: SubjectLine[];
  obtained: number;
  total: number;
  percent: number;
  grade: string;
  /** 1-based rank within the section for this examination. */
  position: number | null;
  classSize: number;
}

interface ResultRow {
  exam_name: string;
  term_name: string;
  year_name: string;
  exam_date: Date;
  class_name: string;
  section_name: string;
  subject_name: string;
  marks: number;
  total_marks: number;
  grade: string | null;
  remarks: string | null;
}

export async function getStudentAcademicRecord(studentId: string): Promise<ExamRecord[]> {
  const rows = await prisma.$queryRaw<ResultRow[]>`
    SELECT e.name        AS exam_name,
           t.name        AS term_name,
           ay.name       AS year_name,
           e."examDate"  AS exam_date,
           c.name        AS class_name,
           sec.name      AS section_name,
           sub.name      AS subject_name,
           r."marksObtained"::float AS marks,
           e."totalMarks"::float    AS total_marks,
           r.grade,
           r.remarks
    FROM "ExamResult" r
    JOIN "Exam" e          ON e.id = r."examId"
    JOIN "Term" t          ON t.id = e."termId"
    JOIN "AcademicYear" ay ON ay.id = t."academicYearId"
    JOIN "Section" sec     ON sec.id = e."sectionId"
    JOIN "Class" c         ON c.id = sec."classId"
    JOIN "Subject" sub     ON sub.id = e."subjectId"
    WHERE r."studentId" = ${studentId}
    ORDER BY e."examDate" DESC, sub.name ASC
  `;

  if (rows.length === 0) return [];

  /*
   * Position across the whole examination, not per paper. A student sits
   * several subjects under one exam name, so the ranking has to be done on
   * each student's *total* for that exam — which is what the school means
   * by "position in class".
   */
  const positions = await prisma.$queryRaw<
    { term_name: string; exam_name: string; position: bigint; class_size: bigint }[]
  >`
    WITH totals AS (
      SELECT e."sectionId",
             t.name AS term_name,
             e.name AS exam_name,
             r."studentId",
             SUM(r."marksObtained") AS obtained
      FROM "ExamResult" r
      JOIN "Exam" e ON e.id = r."examId"
      JOIN "Term" t ON t.id = e."termId"
      GROUP BY e."sectionId", t.name, e.name, r."studentId"
    ),
    ranked AS (
      SELECT "sectionId",
             term_name,
             exam_name,
             "studentId",
             RANK() OVER (
               PARTITION BY "sectionId", term_name, exam_name
               ORDER BY obtained DESC
             ) AS position,
             COUNT(*) OVER (PARTITION BY "sectionId", term_name, exam_name) AS class_size
      FROM totals
    )
    SELECT term_name, exam_name, position, class_size
    FROM ranked
    WHERE "studentId" = ${studentId}
  `;

  const positionByExam = new Map(
    positions.map((row) => [
      `${row.term_name}:${row.exam_name}`,
      { position: Number(row.position), classSize: Number(row.class_size) },
    ])
  );

  // Group the flat rows into one record per examination.
  const grouped = new Map<string, ExamRecord>();

  for (const row of rows) {
    const key = `${row.year_name}:${row.term_name}:${row.exam_name}`;
    const percent = row.total_marks > 0 ? (row.marks / row.total_marks) * 100 : 0;

    let record = grouped.get(key);
    if (!record) {
      const rank = positionByExam.get(`${row.term_name}:${row.exam_name}`);
      record = {
        examName: row.exam_name,
        termName: row.term_name,
        academicYear: row.year_name,
        examDate: row.exam_date,
        sectionLabel: `${row.class_name} — ${row.section_name}`,
        subjects: [],
        obtained: 0,
        total: 0,
        percent: 0,
        grade: "F",
        position: rank?.position ?? null,
        classSize: rank?.classSize ?? 0,
      };
      grouped.set(key, record);
    }

    record.subjects.push({
      subjectName: row.subject_name,
      marksObtained: row.marks,
      totalMarks: row.total_marks,
      percent,
      grade: row.grade,
      remarks: row.remarks,
    });
    record.obtained += row.marks;
    record.total += row.total_marks;
  }

  for (const record of grouped.values()) {
    record.percent = record.total > 0 ? (record.obtained / record.total) * 100 : 0;
    record.grade = gradeForPercentage(record.percent);
  }

  // Newest first — the most recent result is the one being looked for.
  return [...grouped.values()].sort((a, b) => b.examDate.getTime() - a.examDate.getTime());
}

export interface SubjectTrendPoint {
  examLabel: string;
  percent: number;
}

/**
 * Per-subject progress across examinations, oldest first.
 *
 * Answers the question a parent actually asks at a parent–teacher meeting:
 * not "what did they get", but "are they getting better".
 */
export function buildSubjectTrends(records: ExamRecord[]): Map<string, SubjectTrendPoint[]> {
  const trends = new Map<string, SubjectTrendPoint[]>();

  // Chronological, so a trend line reads left to right.
  for (const record of [...records].reverse()) {
    for (const subject of record.subjects) {
      const points = trends.get(subject.subjectName) ?? [];
      points.push({ examLabel: record.examName, percent: subject.percent });
      trends.set(subject.subjectName, points);
    }
  }

  // A single data point is not a trend.
  for (const [subject, points] of trends) {
    if (points.length < 2) trends.delete(subject);
  }

  return trends;
}
