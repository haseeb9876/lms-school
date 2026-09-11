import type { InvoiceStatus, Prisma } from "@prisma/client";
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

export async function listInvoices(params: {
  session: SessionInfo;
  status?: InvoiceStatus;
  sectionId?: string;
  query?: string;
  page?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const year = await getCurrentAcademicYear();

  const where: Prisma.FeeInvoiceWhereInput = {};

  /*
   * A guardian may only ever see their own children's invoices, and a
   * student only their own. Resolving that set server-side and filtering on
   * it means there is no request shape — no crafted studentId, no removed
   * filter — that widens the result beyond what the session owns.
   */
  const visibleStudentIds = await resolveVisibleStudentIds(params.session);
  if (visibleStudentIds !== "ALL") {
    if (visibleStudentIds.length === 0) {
      return { rows: [] as InvoiceListRow[], total: 0, page, pageSize: FEES_PAGE_SIZE };
    }
    where.studentId = { in: visibleStudentIds };
  }

  if (params.status) where.status = params.status;

  if (params.sectionId && year) {
    where.student = {
      enrollments: { some: { sectionId: params.sectionId, academicYearId: year.id } },
    };
  }

  const query = params.query?.trim();
  if (query) {
    where.OR = [
      { invoiceNumber: { contains: query, mode: "insensitive" } },
      { student: { user: { name: { contains: query, mode: "insensitive" } } } },
      { student: { admissionNumber: { contains: query, mode: "insensitive" } } },
    ];
  }

  const [total, invoices] = await Promise.all([
    prisma.feeInvoice.count({ where }),
    prisma.feeInvoice.findMany({
      where,
      skip: (page - 1) * FEES_PAGE_SIZE,
      take: FEES_PAGE_SIZE,
      orderBy: [{ dueDate: "desc" }],
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        status: true,
        dueDate: true,
        studentId: true,
        student: {
          select: {
            user: { select: { name: true } },
            enrollments: {
              take: 1,
              orderBy: { createdAt: "desc" },
              select: { section: { select: { name: true, class: { select: { name: true } } } } },
            },
          },
        },
        payments: { select: { amountPaid: true } },
      },
    }),
  ]);

  const rows: InvoiceListRow[] = invoices.map((invoice) => {
    const amountPaid = invoice.payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
    const enrollment = invoice.student.enrollments[0];
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      studentId: invoice.studentId,
      studentName: invoice.student.user.name,
      sectionLabel: enrollment
        ? `${enrollment.section.class.name} — ${enrollment.section.name}`
        : "—",
      totalAmount: invoice.totalAmount,
      amountPaid,
      balance: invoice.totalAmount - amountPaid,
      status: invoice.status,
      dueDate: invoice.dueDate,
    };
  });

  return { rows, total, page, pageSize: FEES_PAGE_SIZE };
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

/** Students with the largest unpaid balances — the collections worklist. */
export async function getFeeDefaulters(limit = 10) {
  const invoices = await prisma.feeInvoice.findMany({
    where: { status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
    select: {
      studentId: true,
      totalAmount: true,
      dueDate: true,
      payments: { select: { amountPaid: true } },
      student: {
        select: {
          user: { select: { name: true } },
          enrollments: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { section: { select: { name: true, class: { select: { name: true } } } } },
          },
        },
      },
    },
  });

  const byStudent = new Map<
    string,
    { name: string; label: string; balance: number; invoiceCount: number; oldestDue: Date }
  >();

  for (const invoice of invoices) {
    const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
    const balance = invoice.totalAmount - paid;
    if (balance <= 0) continue;

    const enrollment = invoice.student.enrollments[0];
    const existing = byStudent.get(invoice.studentId);

    if (existing) {
      existing.balance += balance;
      existing.invoiceCount += 1;
      if (invoice.dueDate < existing.oldestDue) existing.oldestDue = invoice.dueDate;
    } else {
      byStudent.set(invoice.studentId, {
        name: invoice.student.user.name,
        label: enrollment
          ? `${enrollment.section.class.name} — ${enrollment.section.name}`
          : "—",
        balance,
        invoiceCount: 1,
        oldestDue: invoice.dueDate,
      });
    }
  }

  return [...byStudent.entries()]
    .map(([studentId, entry]) => ({ studentId, ...entry }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, limit);
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
