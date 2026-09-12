"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notifications";
import { getCurrentAcademicYear } from "@/lib/queries/academics";
import {
  createFeeCategorySchema,
  createFeeStructureSchema,
  generateInvoicesSchema,
} from "@/lib/schemas/fees";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

export const createFeeCategory = withAction(
  { roles: ["PRINCIPAL"], input: createFeeCategorySchema },
  async (input) => {
    try {
      const category = await prisma.feeCategory.create({
        data: { name: input.name },
        select: { id: true, name: true },
      });
      revalidatePath("/fees");
      return actionOk({ id: category.id }, `${category.name} added.`);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return actionError("That fee type already exists.", {
          code: "DUPLICATE",
          fieldErrors: { name: "Already exists." },
        });
      }
      throw err;
    }
  }
);

export const createFeeStructure = withAction(
  { roles: ["PRINCIPAL"], input: createFeeStructureSchema },
  async (input) => {
    const year = await getCurrentAcademicYear();
    if (!year) {
      return actionError("Set up an academic year first.", { code: "NO_ACADEMIC_YEAR" });
    }

    const section = await prisma.section.findFirst({
      where: { id: input.sectionId, academicYearId: year.id },
      select: { id: true, name: true, class: { select: { name: true } } },
    });
    if (!section) {
      return actionError("That class isn't in the current academic year.", {
        code: "INVALID_SECTION",
      });
    }

    const structure = await prisma.feeStructure.create({
      data: {
        sectionId: input.sectionId,
        academicYearId: year.id,
        feeCategoryId: input.feeCategoryId,
        amount: input.amount,
        frequency: input.frequency,
        dueDayOfMonth: input.dueDayOfMonth ?? null,
      },
      select: { id: true },
    });

    revalidatePath("/fees");
    return actionOk(
      { id: structure.id },
      `Fee set for ${section.class.name} — ${section.name}.`
    );
  }
);

/**
 * Issues one invoice per enrolled student for a section's fee structures.
 *
 * Deliberately skips any student who already has an invoice for the same
 * fee structure and due date. Billing runs get re-triggered — a browser
 * refresh, an interrupted request, a second person doing it — and a
 * duplicate here means a family is charged twice and someone has to unpick
 * it by hand. Re-running is therefore safe and reports how many it skipped.
 */
export const generateInvoices = withAction(
  { roles: ["PRINCIPAL"], input: generateInvoicesSchema },
  async (input, ctx) => {
    const year = await getCurrentAcademicYear();
    if (!year) {
      return actionError("Set up an academic year first.", { code: "NO_ACADEMIC_YEAR" });
    }

    const dueDate = new Date(`${input.dueDate}T00:00:00.000Z`);

    const [structures, enrollments] = await Promise.all([
      prisma.feeStructure.findMany({
        where: { sectionId: input.sectionId, academicYearId: year.id },
        select: { id: true, amount: true, feeCategory: { select: { name: true } } },
      }),
      prisma.enrollment.findMany({
        where: { sectionId: input.sectionId, academicYearId: year.id, status: "ACTIVE" },
        select: { studentId: true, student: { select: { userId: true } } },
      }),
    ]);

    if (structures.length === 0) {
      return actionError("No fee has been set for this class yet.", { code: "NO_FEE_STRUCTURE" });
    }
    if (enrollments.length === 0) {
      return actionError("There are no active students in this class.", { code: "EMPTY_ROSTER" });
    }

    const existing = await prisma.feeInvoice.findMany({
      where: {
        dueDate,
        feeStructureId: { in: structures.map((structure) => structure.id) },
        studentId: { in: enrollments.map((enrollment) => enrollment.studentId) },
      },
      select: { studentId: true, feeStructureId: true },
    });
    const alreadyBilled = new Set(
      existing.map((invoice) => `${invoice.studentId}:${invoice.feeStructureId}`)
    );

    // Invoice numbers continue from the highest issued rather than from a
    // row count, so a cancelled invoice can't cause a number that already
    // appears on a printed challan to be reused.
    const invoiceYear = dueDate.getUTCFullYear();
    const prefix = `INV-${invoiceYear}-`;
    const latest = await prisma.feeInvoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: "desc" },
      select: { invoiceNumber: true },
    });
    const lastSequence = latest ? Number.parseInt(latest.invoiceNumber.slice(prefix.length), 10) : 0;
    let sequence = Number.isFinite(lastSequence) ? lastSequence : 0;

    const rows: Prisma.FeeInvoiceCreateManyInput[] = [];
    const notifyUserIds: string[] = [];
    let skipped = 0;

    for (const enrollment of enrollments) {
      for (const structure of structures) {
        if (alreadyBilled.has(`${enrollment.studentId}:${structure.id}`)) {
          skipped++;
          continue;
        }

        sequence++;
        rows.push({
          invoiceNumber: `${prefix}${String(sequence).padStart(5, "0")}`,
          studentId: enrollment.studentId,
          feeStructureId: structure.id,
          termId: input.termId || null,
          amount: structure.amount,
          discount: 0,
          lateFee: 0,
          totalAmount: structure.amount,
          status: "PENDING",
          dueDate,
          issuedById: ctx.user.id,
        });
        notifyUserIds.push(enrollment.student.userId);
      }
    }

    if (rows.length === 0) {
      return actionOk(
        { issued: 0, skipped },
        `Nothing to issue — all ${skipped} invoices for this date already exist.`
      );
    }

    await prisma.feeInvoice.createMany({ data: rows });

    await logAudit({
      actorId: ctx.user.id,
      action: "FEE_INVOICE_CREATED",
      targetType: "Section",
      targetId: input.sectionId,
      metadata: { issued: rows.length, skipped, dueDate: input.dueDate, note: input.note || null },
    });

    await notifyUsers({
      userIds: [...new Set(notifyUserIds)],
      type: "FEE",
      title: "New fee invoice",
      body: `Due ${input.dueDate}${input.note ? ` · ${input.note}` : ""}.`,
      link: "/fees",
    });

    revalidatePath("/fees");
    return actionOk(
      { issued: rows.length, skipped },
      skipped > 0
        ? `Issued ${rows.length} invoices — skipped ${skipped} that already existed.`
        : `Issued ${rows.length} invoices.`
    );
  }
);
