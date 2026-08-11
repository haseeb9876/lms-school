import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const invoices = await prisma.feeInvoice.findMany({
      include: {
        student: {
          include: {
            user: { select: { name: true, cnic: true } },
            class: { select: { name: true, section: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ records: invoices });
  } catch (error) {
    console.error("GET /api/financials error:", error);
    return NextResponse.json({ error: "Failed to fetch financial records" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, title, amount, dueDate } = body;

    if (!studentId || !title || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const invoice = await prisma.feeInvoice.create({
      data: {
        studentId,
        title,
        amount: parseFloat(amount),
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error("POST /api/financials error:", error);
    return NextResponse.json({ error: "Failed to issue invoice" }, { status: 500 });
  }
}
