import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: Fetch fee invoices with optional filters (studentId, status, classId)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");
    const classId = searchParams.get("classId");

    const whereClause: any = {};
    if (studentId) whereClause.studentId = studentId;
    if (status) whereClause.status = status;
    if (classId) whereClause.student = { classId };

    const invoices = await prisma.feeInvoice.findMany({
      where: whereClause,
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

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("GET /api/fees error:", error);
    return NextResponse.json({ error: "Failed to fetch fee invoices" }, { status: 500 });
  }
}

// POST: Batch generate fee invoices for an entire class or single student
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { classId, title, amount, dueDate } = body as {
      classId: string;
      title: string;
      amount: number;
      dueDate: string;
    };

    if (!classId || !title || !amount || !dueDate) {
      return NextResponse.json(
        { error: "classId, title, amount, and dueDate are required" },
        { status: 400 }
      );
    }

    // Fetch all students in the class
    const students = await prisma.studentProfile.findMany({
      where: { classId },
    });

    if (students.length === 0) {
      return NextResponse.json(
        { error: "No students found in the selected class" },
        { status: 404 }
      );
    }

    // Create invoices in transaction batch
    const createdInvoices = await prisma.$transaction(
      students.map((student) =>
        prisma.feeInvoice.create({
          data: {
            studentId: student.id,
            title,
            amount: Number(amount),
            dueDate: new Date(dueDate),
            status: "PENDING",
          },
        })
      )
    );

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: "PRINCIPAL_SYSTEM",
        action: "BATCH_FEE_GENERATED",
        details: `Generated ${createdInvoices.length} fee vouchers titled '${title}' of PKR ${amount}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${createdInvoices.length} fee vouchers.`,
    });
  } catch (error) {
    console.error("POST /api/fees error:", error);
    return NextResponse.json({ error: "Failed to generate fee invoices" }, { status: 500 });
  }
}

// PATCH: Update fee payment clearance
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { invoiceId, status, paidAmount } = body;

    if (!invoiceId || !status) {
      return NextResponse.json(
        { error: "invoiceId and status are required" },
        { status: 400 }
      );
    }

    const updatedInvoice = await prisma.feeInvoice.update({
      where: { id: invoiceId },
      data: {
        status,
        paidAmount: paidAmount !== undefined ? Number(paidAmount) : undefined,
      },
    });

    return NextResponse.json({ success: true, invoice: updatedInvoice });
  } catch (error) {
    console.error("PATCH /api/fees error:", error);
    return NextResponse.json({ error: "Failed to update fee clearance" }, { status: 500 });
  }
}
