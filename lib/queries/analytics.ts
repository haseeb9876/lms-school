import { prisma } from "@/lib/db";

/**
 * Aggregates computed in the database rather than in application code.
 *
 * The earlier versions of these pulled whole tables back and reduced them in
 * JavaScript — every attendance row to find students below a threshold,
 * every unpaid invoice with its payments to rank debtors. That is workable
 * at demo size and fatal at this school's real one: 15,000 students across a
 * year is on the order of three million attendance rows, and none of them
 * need to leave the database to answer "who is below 75%".
 *
 * Each function here is a single round trip returning at most a page of
 * rows. `$queryRaw` is used as a tagged template throughout, so every
 * interpolated value is sent as a bound parameter, never concatenated into
 * SQL.
 */

export interface AttendanceConcern {
  id: string;
  name: string;
  label: string;
  percent: number;
  daysMarked: number;
}

/**
 * Students whose attendance has fallen below a threshold.
 *
 * `HAVING COUNT(*) >= minDays` keeps a student who joined last week off the
 * list — a couple of marked days can't establish a pattern, and without it
 * one absence in a two-day record reads as 50% and tops the table.
 */
export async function getAttendanceConcerns(
  sectionIds: string[] | "ALL",
  options: {
    thresholdPercent?: number;
    limit?: number;
    minDays?: number;
    /** Only count records on or after this date. Defaults to 90 days back. */
    since?: Date;
  } = {}
): Promise<AttendanceConcern[]> {
  const { thresholdPercent = 75, limit = 10, minDays = 10 } = options;
  const threshold = thresholdPercent / 100;

  /*
   * Windowed rather than lifetime, for two reasons. It bounds the scan —
   * without a date filter this reads every attendance row the school has
   * ever recorded, which is millions once the roll is full. And it is the
   * more useful answer: a principal asking who is struggling means *now*,
   * not a student who had a bad term two years ago and has been present
   * every day since.
   */
  const since = options.since ?? new Date(Date.now() - 90 * 86_400_000);

  const rows = await prisma.$queryRaw<
    { id: string; name: string; class_name: string; section_name: string; total: bigint; present: bigint }[]
  >`
    SELECT s.id,
           u.name,
           c.name  AS class_name,
           sec.name AS section_name,
           COUNT(*)::bigint AS total,
           SUM(CASE WHEN a.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END)::bigint AS present
    FROM "AttendanceRecord" a
    JOIN "StudentProfile" s   ON s.id  = a."studentId"
    JOIN "User" u             ON u.id  = s."userId"
    JOIN "Section" sec        ON sec.id = a."sectionId"
    JOIN "Class" c            ON c.id  = sec."classId"
    WHERE a.date >= ${since}
      AND (${sectionIds === "ALL"} OR a."sectionId" = ANY(${sectionIds === "ALL" ? [] : sectionIds}))
    GROUP BY s.id, u.name, c.name, sec.name
    HAVING COUNT(*) >= ${minDays}
       AND SUM(CASE WHEN a.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END)::float / COUNT(*) < ${threshold}
    ORDER BY SUM(CASE WHEN a.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END)::float / COUNT(*) ASC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    label: `${row.class_name} — ${row.section_name}`,
    percent: (Number(row.present) / Number(row.total)) * 100,
    daysMarked: Number(row.total),
  }));
}

export interface FeeDefaulter {
  studentId: string;
  name: string;
  label: string;
  balance: number;
  invoiceCount: number;
  oldestDue: Date;
}

/**
 * Largest unpaid balances.
 *
 * Payments are folded in through a grouped sub-select rather than a join on
 * the payment rows directly — joining them would multiply each invoice by
 * its number of payments and inflate every SUM.
 */
export async function getFeeDefaulters(limit = 10): Promise<FeeDefaulter[]> {
  const rows = await prisma.$queryRaw<
    {
      student_id: string;
      name: string;
      class_name: string | null;
      section_name: string | null;
      balance: number;
      invoice_count: bigint;
      oldest_due: Date;
    }[]
  >`
    WITH paid AS (
      SELECT "invoiceId", SUM("amountPaid") AS amount
      FROM "FeePayment"
      GROUP BY "invoiceId"
    )
    SELECT s.id AS student_id,
           u.name,
           c.name   AS class_name,
           sec.name AS section_name,
           SUM(i."totalAmount" - COALESCE(paid.amount, 0))::float AS balance,
           COUNT(*)::bigint AS invoice_count,
           MIN(i."dueDate") AS oldest_due
    FROM "FeeInvoice" i
    JOIN "StudentProfile" s ON s.id = i."studentId"
    JOIN "User" u           ON u.id = s."userId"
    LEFT JOIN paid          ON paid."invoiceId" = i.id
    LEFT JOIN LATERAL (
      SELECT e."sectionId"
      FROM "Enrollment" e
      WHERE e."studentId" = s.id
      ORDER BY e."createdAt" DESC
      LIMIT 1
    ) le ON TRUE
    LEFT JOIN "Section" sec ON sec.id = le."sectionId"
    LEFT JOIN "Class" c     ON c.id = sec."classId"
    WHERE i.status IN ('PENDING', 'OVERDUE', 'PARTIAL')
    GROUP BY s.id, u.name, c.name, sec.name
    HAVING SUM(i."totalAmount" - COALESCE(paid.amount, 0)) > 0
    ORDER BY balance DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    studentId: row.student_id,
    name: row.name,
    label: row.class_name ? `${row.class_name} — ${row.section_name}` : "—",
    balance: Number(row.balance),
    invoiceCount: Number(row.invoice_count),
    oldestDue: row.oldest_due,
  }));
}

export interface ClassAttendanceRow {
  sectionId: string;
  label: string;
  percent: number;
  studentCount: number;
}

/**
 * Average attendance per section — one row per class, computed in-database
 * and bounded by a date window so the scan stays proportional to the term
 * rather than to the school's entire history.
 */
export async function getClassAttendanceAverages(since?: Date): Promise<ClassAttendanceRow[]> {
  const from = since ?? new Date(Date.now() - 90 * 86_400_000);
  const rows = await prisma.$queryRaw<
    {
      section_id: string;
      class_name: string;
      section_name: string;
      sort_order: number;
      percent: number;
      student_count: bigint;
    }[]
  >`
    SELECT sec.id AS section_id,
           c.name AS class_name,
           sec.name AS section_name,
           c."sortOrder" AS sort_order,
           (SUM(CASE WHEN a.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END)::float
              / NULLIF(COUNT(*), 0) * 100) AS percent,
           COUNT(DISTINCT a."studentId")::bigint AS student_count
    FROM "AttendanceRecord" a
    JOIN "Section" sec ON sec.id = a."sectionId"
    JOIN "Class" c     ON c.id = sec."classId"
    WHERE a.date >= ${from}
    GROUP BY sec.id, c.name, sec.name, c."sortOrder"
    ORDER BY c."sortOrder" ASC, sec.name ASC
  `;

  return rows.map((row) => ({
    sectionId: row.section_id,
    label: `${row.class_name} ${row.section_name}`,
    percent: Number(row.percent) || 0,
    studentCount: Number(row.student_count),
  }));
}

/** School-wide attendance percentage — one scalar over a bounded window. */
export async function getOverallAttendance(since?: Date): Promise<number | null> {
  const from = since ?? new Date(Date.now() - 90 * 86_400_000);
  const [row] = await prisma.$queryRaw<{ percent: number | null }[]>`
    SELECT (SUM(CASE WHEN status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END)::float
              / NULLIF(COUNT(*), 0) * 100) AS percent
    FROM "AttendanceRecord"
    WHERE date >= ${from}
  `;
  return row?.percent === null || row?.percent === undefined ? null : Number(row.percent);
}

/**
 * Per-student attendance percentages for a bounded set of students — the
 * class roster or one guardian's children, never the whole school.
 */
export async function getAttendancePercentByStudent(
  studentIds: string[]
): Promise<Map<string, number>> {
  if (studentIds.length === 0) return new Map();

  const rows = await prisma.$queryRaw<{ student_id: string; percent: number }[]>`
    SELECT "studentId" AS student_id,
           (SUM(CASE WHEN status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END)::float
              / NULLIF(COUNT(*), 0) * 100) AS percent
    FROM "AttendanceRecord"
    WHERE "studentId" = ANY(${studentIds})
    GROUP BY "studentId"
  `;

  return new Map(rows.map((row) => [row.student_id, Number(row.percent) || 0]));
}
