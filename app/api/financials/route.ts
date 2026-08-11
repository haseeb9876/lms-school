import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const records = await prisma.feeRecord.findMany({
      include: {
        student: {
          select: { name: true, cnic: true, classScope: true, fatherCnic: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(records);
  } catch (err) {
    return NextResponse.json({ message: "Failed to fetch fee records" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { studentId, month, amount, dueDate } = await req.json();

    const record = await prisma.feeRecord.create({
      data: {
        studentId,
        month,
        amount: parseFloat(amount),
        dueDate,
        status: "PENDING",
      },
    });

    return NextResponse.json(record);
  } catch (err) {
    return NextResponse.json({ message: "Failed to generate fee invoice" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { recordId, status } = await req.json();

    const updated = await prisma.feeRecord.update({
      where: { id: recordId },
      data: {
        status,
        paidDate: status === "PAID" ? new Date().toISOString().split("T")[0] : null,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ message: "Failed to update payment status" }, { status: 500 });
  }
}
