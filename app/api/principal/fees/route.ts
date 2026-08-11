import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { month, amount, dueDate } = await req.json();

    if (!month || !amount || !dueDate) {
      return NextResponse.json({ message: "Month, amount, and due date are required" }, { status: 400 });
    }

    // Fetch all active students
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
    });

    if (students.length === 0) {
      return NextResponse.json({ message: "No enrolled students found." }, { status: 400 });
    }

    // Batch create fee records for every student
    await prisma.$transaction(
      students.map((st) =>
        prisma.feeRecord.create({
          data: {
            studentId: st.id,
            month,
            amount: parseFloat(amount),
            dueDate,
            status: "PENDING",
          },
        })
      )
    );

    return NextResponse.json({ success: true, count: students.length });
  } catch (err) {
    return NextResponse.json({ message: "Failed to generate fee vouchers" }, { status: 500 });
  }
}
