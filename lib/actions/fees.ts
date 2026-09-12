"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notifyUsers } from "@/lib/notifications";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amountPaid: z.coerce.number().positive("Enter an amount greater than zero."),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "JAZZCASH", "EASYPAISA", "OTHER"]),
  notes: z.string().trim().max(300, "Notes are too long.").optional(),
});

/**
 * Records a payment against an invoice and re-derives the invoice status.
 *
 * Status is computed from the payments rather than being set by whoever is
 * at the counter: a PAID invoice with an unpaid balance is the kind of
 * inconsistency that only surfaces months later during an audit.
 */
export const recordPayment = withAction(
  { roles: ["PRINCIPAL"], input: recordPaymentSchema },
  async (input, ctx) => {
    const invoice = await prisma.feeInvoice.findUnique({
      where: { id: input.invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        status: true,
        dueDate: true,
        student: { select: { id: true, userId: true, user: { select: { name: true } } } },
        payments: { select: { amountPaid: true } },
      },
    });

    if (!invoice) return actionError("That invoice no longer exists.", { code: "NOT_FOUND" });
    if (invoice.status === "CANCELLED") {
      return actionError("This invoice has been cancelled.", { code: "INVOICE_CANCELLED" });
    }

    const alreadyPaid = invoice.payments.reduce((sum, payment) => sum + payment.amountPaid, 0);
    const balance = invoice.totalAmount - alreadyPaid;

    if (balance <= 0) {
      return actionError("This invoice is already paid in full.", { code: "ALREADY_PAID" });
    }

    // Overpayment is almost always a typo at the counter, and it would
    // silently corrupt every collection total downstream.
    if (input.amountPaid > balance) {
      return actionError(`That's more than the outstanding balance of ${balance}.`, {
        code: "OVERPAYMENT",
        fieldErrors: { amountPaid: `Maximum is ${balance}.` },
      });
    }

    const newTotalPaid = alreadyPaid + input.amountPaid;
    const status = newTotalPaid >= invoice.totalAmount ? "PAID" : "PARTIAL";

    // A receipt number has to be unique and gapless enough to reconcile, so
    // it's derived from a count inside the same transaction as the insert.
    const receiptNumber = await prisma.$transaction(async (tx) => {
      const year = new Date().getUTCFullYear();
      const issued = await tx.feePayment.count();
      const number = `RCP-${year}-${String(issued + 1).padStart(5, "0")}`;

      await tx.feePayment.create({
        data: {
          invoiceId: invoice.id,
          amountPaid: input.amountPaid,
          paymentMethod: input.paymentMethod,
          receivedById: ctx.user.id,
          receiptNumber: number,
          notes: input.notes || null,
        },
      });

      await tx.feeInvoice.update({
        where: { id: invoice.id },
        data: { status },
      });

      return number;
    });

    await logAudit({
      actorId: ctx.user.id,
      action: "FEE_PAYMENT_RECORDED",
      targetType: "FeeInvoice",
      targetId: invoice.id,
      metadata: {
        receiptNumber,
        amountPaid: input.amountPaid,
        method: input.paymentMethod,
        resultingStatus: status,
      },
    });

    await notifyUsers({
      userIds: [invoice.student.userId],
      type: "FEE",
      title: "Payment received",
      body: `Receipt ${receiptNumber} for invoice ${invoice.invoiceNumber}.`,
      link: `/fees/invoices/${invoice.id}`,
    });

    revalidatePath(`/fees/invoices/${invoice.id}`);
    revalidatePath("/fees");

    return actionOk({ receiptNumber }, `Payment recorded — receipt ${receiptNumber}.`);
  }
);

const cancelInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  reason: z.string().trim().min(3, "Give a reason for cancelling.").max(300),
});

export const cancelInvoice = withAction(
  { roles: ["PRINCIPAL"], input: cancelInvoiceSchema },
  async (input, ctx) => {
    const invoice = await prisma.feeInvoice.findUnique({
      where: { id: input.invoiceId },
      select: { id: true, status: true, payments: { select: { id: true } } },
    });

    if (!invoice) return actionError("That invoice no longer exists.", { code: "NOT_FOUND" });

    // Cancelling an invoice money has been taken against would strand that
    // payment — it has to be refunded and reversed deliberately instead.
    if (invoice.payments.length > 0) {
      return actionError("This invoice has payments against it and can't be cancelled.", {
        code: "HAS_PAYMENTS",
      });
    }

    await prisma.feeInvoice.update({
      where: { id: invoice.id },
      data: { status: "CANCELLED" },
    });

    await logAudit({
      actorId: ctx.user.id,
      action: "FEE_INVOICE_CANCELLED",
      targetType: "FeeInvoice",
      targetId: invoice.id,
      metadata: { reason: input.reason },
    });

    revalidatePath(`/fees/invoices/${invoice.id}`);
    revalidatePath("/fees");

    return actionOk(undefined, "Invoice cancelled.");
  }
);
