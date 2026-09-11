import type { Prisma, TicketStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { SessionInfo } from "@/lib/auth/current-user";

export const TICKETS_PAGE_SIZE = 20;

/**
 * Everyone can raise a ticket; only the principal sees the whole queue.
 * Anyone else sees the tickets they raised or were assigned — scoped in the
 * query rather than filtered afterwards, so there's no request that widens
 * it.
 */
function scopeFor(session: SessionInfo): Prisma.DeskTicketWhereInput {
  if (session.role === "PRINCIPAL") return {};
  return {
    OR: [{ raisedById: session.userId }, { assignedToId: session.userId }],
  };
}

export async function listTickets(params: {
  session: SessionInfo;
  status?: TicketStatus;
  page?: number;
}) {
  const page = Math.max(1, params.page ?? 1);

  const where: Prisma.DeskTicketWhereInput = {
    ...scopeFor(params.session),
    ...(params.status ? { status: params.status } : {}),
  };

  const [total, tickets, openCount] = await Promise.all([
    prisma.deskTicket.count({ where }),
    prisma.deskTicket.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * TICKETS_PAGE_SIZE,
      take: TICKETS_PAGE_SIZE,
      select: {
        id: true,
        subject: true,
        category: true,
        status: true,
        priority: true,
        createdAt: true,
        resolvedAt: true,
        raisedBy: { select: { id: true, name: true, role: true } },
        assignedTo: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
    }),
    prisma.deskTicket.count({
      where: { ...scopeFor(params.session), status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
  ]);

  return { tickets, total, openCount, page, pageSize: TICKETS_PAGE_SIZE };
}

export async function getTicketDetail(ticketId: string, session: SessionInfo) {
  const ticket = await prisma.deskTicket.findFirst({
    // The scope is part of the lookup, so a ticket the session can't see is
    // indistinguishable from one that doesn't exist.
    where: { id: ticketId, ...scopeFor(session) },
    select: {
      id: true,
      subject: true,
      category: true,
      status: true,
      priority: true,
      createdAt: true,
      resolvedAt: true,
      raisedById: true,
      raisedBy: { select: { id: true, name: true, role: true } },
      assignedTo: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          message: true,
          createdAt: true,
          attachmentUrl: true,
          author: { select: { id: true, name: true, role: true } },
        },
      },
    },
  });

  if (!ticket) notFound();
  return ticket;
}
