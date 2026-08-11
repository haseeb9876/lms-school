import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const tickets = await prisma.deskTicket.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ complaints: tickets });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch desk tickets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { parentId, subject, message } = body;

    if (!parentId || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ticket = await prisma.deskTicket.create({
      data: { parentId, subject, message, status: "OPEN" },
    });

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create desk ticket" }, { status: 500 });
  }
}
