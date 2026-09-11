"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { notifyUsers } from "@/lib/notifications";
import { ticketRateLimiter } from "@/lib/auth/rate-limit";
import { withAction } from "./with-action";
import { actionError, actionOk } from "./types";

const createTicketSchema = z.object({
  subject: z.string().trim().min(5, "Describe the problem in a few words.").max(200, "Subject is too long."),
  category: z.string().trim().max(60).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  message: z.string().trim().min(10, "Add some detail so we can help.").max(4000, "Message is too long."),
});

export const createTicket = withAction(
  { roles: null, input: createTicketSchema },
  async (input, ctx) => {
    /*
     * Rate limited per user rather than per IP: a whole school can sit
     * behind one NAT address, so an IP limit would let one person's
     * ticket spam lock out everybody else in the building.
     */
    const { success } = await ticketRateLimiter.limit(`ticket:${ctx.user.id}`);
    if (!success) {
      return actionError("You've opened several tickets recently. Please wait before opening another.", {
        code: "RATE_LIMITED",
      });
    }

    const ticket = await prisma.deskTicket.create({
      data: {
        raisedById: ctx.user.id,
        subject: input.subject,
        category: input.category || null,
        priority: input.priority,
        messages: { create: { authorId: ctx.user.id, message: input.message } },
      },
      select: { id: true },
    });

    // The principal runs the desk, so they're who needs to know.
    const principals = await prisma.user.findMany({
      where: { role: "PRINCIPAL", status: "ACTIVE" },
      select: { id: true },
    });

    await notifyUsers({
      userIds: principals.map((principal) => principal.id),
      type: "DESK_TICKET",
      title: "New help desk ticket",
      body: input.subject,
      link: `/helpdesk/${ticket.id}`,
    });

    revalidatePath("/helpdesk");
    return actionOk({ id: ticket.id }, "Ticket opened.");
  }
);

const replySchema = z.object({
  ticketId: z.string().min(1),
  message: z.string().trim().min(1, "Write a reply.").max(4000, "Reply is too long."),
});

export const replyToTicket = withAction({ roles: null, input: replySchema }, async (input, ctx) => {
  const ticket = await prisma.deskTicket.findUnique({
    where: { id: input.ticketId },
    select: { id: true, status: true, raisedById: true, assignedToId: true, subject: true },
  });

  if (!ticket) return actionError("That ticket no longer exists.", { code: "NOT_FOUND" });

  // Only the people on the ticket — plus the principal, who runs the desk —
  // may add to the thread.
  const participant =
    ctx.user.role === "PRINCIPAL" ||
    ticket.raisedById === ctx.user.id ||
    ticket.assignedToId === ctx.user.id;

  if (!participant) {
    return actionError("You don't have access to this ticket.", { code: "FORBIDDEN" });
  }

  if (ticket.status === "CLOSED") {
    return actionError("This ticket is closed. Open a new one if you still need help.", {
      code: "TICKET_CLOSED",
    });
  }

  await prisma.$transaction([
    prisma.deskTicketMessage.create({
      data: { ticketId: ticket.id, authorId: ctx.user.id, message: input.message },
    }),
    // A staff reply moves an untouched ticket into progress, so the queue
    // reflects what's actually been picked up.
    ...(ctx.user.role === "PRINCIPAL" && ticket.status === "OPEN"
      ? [prisma.deskTicket.update({ where: { id: ticket.id }, data: { status: "IN_PROGRESS" } })]
      : []),
  ]);

  const recipients = [ticket.raisedById, ticket.assignedToId].filter(
    (id): id is string => Boolean(id) && id !== ctx.user.id
  );

  await notifyUsers({
    userIds: recipients,
    type: "DESK_TICKET",
    title: "New reply on your ticket",
    body: ticket.subject,
    link: `/helpdesk/${ticket.id}`,
  });

  revalidatePath(`/helpdesk/${ticket.id}`);
  return actionOk(undefined, "Reply sent.");
});

const updateStatusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

export const updateTicketStatus = withAction(
  { roles: ["PRINCIPAL"], input: updateStatusSchema },
  async (input, ctx) => {
    const resolved = input.status === "RESOLVED" || input.status === "CLOSED";

    const ticket = await prisma.deskTicket.update({
      where: { id: input.ticketId },
      data: {
        status: input.status,
        resolvedAt: resolved ? new Date() : null,
        // Taking action on a ticket is what assigns it — an untouched queue
        // with everything "assigned" to nobody isn't useful.
        assignedToId: ctx.user.id,
      },
      select: { id: true, raisedById: true, subject: true },
    });

    await notifyUsers({
      userIds: [ticket.raisedById],
      type: "DESK_TICKET",
      title: `Ticket ${input.status.toLowerCase().replace("_", " ")}`,
      body: ticket.subject,
      link: `/helpdesk/${ticket.id}`,
    });

    revalidatePath(`/helpdesk/${ticket.id}`);
    revalidatePath("/helpdesk");
    return actionOk(undefined, "Ticket updated.");
  }
);
