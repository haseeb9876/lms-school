import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: Fetch tickets for Principal or Parent
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");
    const status = searchParams.get("status");

    const whereClause: any = {};
    if (parentId) {
      whereClause.parentId = parentId;
    }
    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const tickets = await prisma.deskTicket.findMany({
      where: whereClause,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            cnic: true,
            phone: true,
            studentProfile: {
              select: {
                rollNumber: true,
                class: {
                  select: { name: true, section: true },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("GET /api/desk/tickets error:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

// POST: Parent submits confidential note directly to Principal
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { parentId, subject, message } = body;

    if (!parentId || !subject || !message) {
      return NextResponse.json(
        { error: "parentId, subject, and message are required" },
        { status: 400 }
      );
    }

    const ticket = await prisma.deskTicket.create({
      data: {
        parentId,
        subject,
        message,
        status: "OPEN",
      },
    });

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error("POST /api/desk/tickets error:", error);
    return NextResponse.json({ error: "Failed to submit ticket" }, { status: 500 });
  }
}

// PATCH: Principal updates ticket status or appends notes
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { ticketId, status, responseNote } = body;

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    const currentTicket = await prisma.deskTicket.findUnique({
      where: { id: ticketId },
    });

    if (!currentTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    let updatedMessage = currentTicket.message;
    if (responseNote) {
      const timestamp = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
      updatedMessage += `\n\n--- [Principal Reply | ${timestamp}] ---\n${responseNote}`;
    }

    const ticket = await prisma.deskTicket.update({
      where: { id: ticketId },
      data: {
        status: status || currentTicket.status,
        message: updatedMessage,
      },
    });

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error("PATCH /api/desk/tickets error:", error);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
