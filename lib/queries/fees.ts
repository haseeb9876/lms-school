import { Prisma, type InvoiceStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { SessionInfo } from "@/lib/auth/current-user";
import { resolveVisibleStudentIds } from "@/lib/auth/rbac";
import { getCurrentAcademicYear } from "./academics";

export const FEES_PAGE_SIZE = 25;

export interface InvoiceListRow {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  sectionLabel: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  status: InvoiceStatus;
  dueDate: Date;
}

/**
 * One page of invoices, in two round trips.
 *
 * Written as SQL rather than a nested Prisma `select` for the same reason
 * the student list was: Prisma issues a separate query per relation level,
 * and the "most recent enrolment" lookup — `take: 1` with an ordering,
 * nested two levels deep — is evaluated per row. Measured against a warm
 * connection pool, the Prisma version took 4.4 seconds for a single page of
 * twenty-five invoices; this takes one round trip.
 *
 * The lateral sub-selects run per returned row (twenty-five of them), not
 * across the table, so it stays flat as the invoice history grows.
 */
export async function listInvoices(params: {
  session: SessionInfo;
  status?: InvoiceStatus;
  sectionId?: string;
  query?: string;
  page?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const empty = { rows: [] as InvoiceListRow[], total: 0, page, pageSize: FEES_PAGE_SIZE };

  /*
   * A guardian may only ever see their own children's invoices, and a
   * student only their own. Resolving that set server-side and filtering on
   * it means there is no request shape — no crafted studentId, no removed
   * filter — that widens the result beyond what the session owns.
   */
  const visibleStudentIds = await resolveVisibleStudentIds(params.session);
  if (visibleStudentIds !== "ALL" && visibleStudentIds.length === 0) return empty;

  const clauses: Prisma.Sql[] = [Prisma.sql`TRUE`];

  if (visibleStudentIds !== "ALL") {
    clauses.push(Prisma.sql`i."studentId" = ANY(${visibleStudentIds})`);
  }
  if (params.status) {
    clauses.push(Prisma.sql`i.status = ${params.status}::"InvoiceStatus"`);
  }
  if (params.sectionId) {
    const year = await getCurrentAcademicYear();
    if (!year) return empty;
    clauses.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "Enrollment" e
      WHERE e."studentId" = i."studentId"
        AND e."sectionId" = ${params.sectionId}
        AND e."academicYearId" = ${year.id}
    )`);
  }

  const query = params.query?.trim();
  if (query) {
    const like = `%${query}%`;
    clauses.push(Prisma.sql`(
      i."invoiceNumber" ILIKE ${like}
      OR u.name ILIKE ${like}
      OR s."admissionNumber" ILIKE ${like}
    )`);
  }

  const where = Prisma.join(clauses, " AND ");
  const offset = (page - 1) * FEES_PAGE_SIZE;

  const [countRows, rows] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "FeeInvoice" i
      JOIN "StudentProfile" s ON s.id = i."studentId"
      JOIN "User" u           ON u.id = s."userId"
      WHERE ${where}
    `,
    prisma.$queryRaw<
      {
        id: string;
        invoice_number: string;
        student_id: string;
        student_name: string;
        class_name: string | null;
        section_name: string | null;
        total_amount: number;
        amount_paid: number | null;
        status: InvoiceStatus;
        due_date: Date;
      }[]
    >`
      SELECT i.id,
             i."invoiceNumber" AS invoice_number,
             i."studentId"     AS student_id,
             u.name            AS student_name,
             c.name            AS class_name,
             sec.name          AS section_name,
             i."totalAmount"::float AS total_amount,
             paid.amount       AS amount_paid,
             i.status,
             i."dueDate"       AS due_date
      FROM "FeeInvoice" i
      JOIN "StudentProfile" s ON s.id = i."studentId"
      JOIN "User" u           ON u.id = s."userId"
      LEFT JOIN LATERAL (
        SELECT e."sectionId"
        FROM "Enrollment" e
        WHERE e."studentId" = s.id
        ORDER BY e."createdAt" DESC
        LIMIT 1
      ) latest ON TRUE
      LEFT JOIN "Section" sec ON sec.id = latest."sectionId"
      LEFT JOIN "Class" c     ON c.id = sec."classId"
      LEFT JOIN LATERAL (
        SELECT SUM(fp."amountPaid")::float AS amount
        FROM "FeePayment" fp
        WHERE fp."invoiceId" = i.id
      ) paid ON TRUE
      WHERE ${where}
      ORDER BY i."dueDate" DESC
      LIMIT ${FEES_PAGE_SIZE} OFFSET ${offset}
    `,
  ]);

  const rowsOut: InvoiceListRow[] = rows.map((row) => {
    const amountPaid = Number(row.amount_paid ?? 0);
    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      studentId: row.student_id,
      studentName: row.student_name,
      sectionLabel: row.class_name ? `${row.class_name} — ${row.section_name}` : "—",
      totalAmount: Number(row.total_amount),
      amountPaid,
      balance: Number(row.total_amount) - amountPaid,
      status: row.status,
      dueDate: row.due_date,
    };
  });

  return {
    rows: rowsOut,
    total: Number(countRows[0]?.count ?? 0),
    page,
    pageSize: FEES_PAGE_SIZE,
  };
}

export interface FeeSummary {
  billed: number;
  collected: number;
  outstanding: number;
  overdueCount: number;
  paidCount: number;
  pendingCount: number;
}

export async function getFeeSummary(session: SessionInfo): Promise<FeeSummary> {
  const where: Prisma.FeeInvoiceWhereInput = {};
  const visibleStudentIds = await resolveVisibleStudentIds(session);

  if (visibleStudentIds !== "ALL") {
    if (visibleStudentIds.length === 0) {
      return { billed: 0, collected: 0, outstanding: 0, overdueCount: 0, paidCount: 0, pendingCount: 0 };
    }
    where.studentId = { in: visibleStudentIds };
  }

  const [billedAgg, collectedAgg, statusGroups] = await Promise.all([
    prisma.feeInvoice.aggregate({
      where: { ...where, status: { not: "CANCELLED" } },
      _sum: { totalAmount: true },
    }),
    prisma.feePayment.aggregate({
      where: { invoice: where },
      _sum: { amountPaid: true },
    }),
    prisma.feeInvoice.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
  ]);

  const billed = billedAgg._sum.totalAmount ?? 0;
  const collected = collectedAgg._sum.amountPaid ?? 0;
  const countFor = (status: InvoiceStatus) =>
    statusGroups.find((group) => group.status === status)?._count._all ?? 0;

  return {
    billed,
    collected,
    // Clamped at zero so an overpayment can't display as negative debt.
    outstanding: Math.max(0, billed - collected),
    overdueCount: countFor("OVERDUE"),
    paidCount: countFor("PAID"),
    pendingCount: countFor("PENDING") + countFor("PARTIAL"),
  };
}

export async function getInvoiceDetail(invoiceId: string) {
  const invoice = await prisma.feeInvoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      amount: true,
      discount: true,
      lateFee: true,
      totalAmount: true,
      status: true,
      dueDate: true,
      issuedAt: true,
      studentId: true,
      issuedBy: { select: { name: true } },
      term: { select: { name: true } },
      feeStructure: {
        select: { frequency: true, feeCategory: { select: { name: true } } },
      },
      student: {
        select: {
          id: true,
          admissionNumber: true,
          rollNumber: true,
          user: { select: { name: true } },
          enrollments: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { section: { select: { name: true, class: { select: { name: true } } } } },
          },
        },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        select: {
          id: true,
          amountPaid: true,
          paymentMethod: true,
          paidAt: true,
          receiptNumber: true,
          notes: true,
          receivedBy: { select: { name: true } },
        },
      },
    },
  });

  if (!invoice) notFound();
  return invoice;
}


/** Monthly collected-versus-billed totals for the fees chart. */
export async function getCollectionTrend(months = 6) {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - months, 1);
  since.setUTCHours(0, 0, 0, 0);

  const [invoices, payments] = await Promise.all([
    prisma.feeInvoice.findMany({
      where: { issuedAt: { gte: since }, status: { not: "CANCELLED" } },
      select: { issuedAt: true, totalAmount: true },
    }),
    prisma.feePayment.findMany({
      where: { paidAt: { gte: since } },
      select: { paidAt: true, amountPaid: true },
    }),
  ]);

  const buckets = new Map<string, { billed: number; collected: number }>();
  const keyOf = (date: Date) => date.toISOString().slice(0, 7);

  for (const invoice of invoices) {
    const key = keyOf(invoice.issuedAt);
    const bucket = buckets.get(key) ?? { billed: 0, collected: 0 };
    bucket.billed += invoice.totalAmount;
    buckets.set(key, bucket);
  }

  for (const payment of payments) {
    const key = keyOf(payment.paidAt);
    const bucket = buckets.get(key) ?? { billed: 0, collected: 0 };
    bucket.collected += payment.amountPaid;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .map(([month, totals]) => ({ month, ...totals }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
