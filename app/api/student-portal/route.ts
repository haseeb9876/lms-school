import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cnic = searchParams.get("cnic");

    if (!cnic) {
      return NextResponse.json({ message: "CNIC param required" }, { status: 400 });
    }

    const cleanCnic = cnic.replace(/[^0-9]/g, "");

    // 1. Find student matching fatherCnic or direct student cnic
    const student = await prisma.user.findFirst({
      where: {
        OR: [
          { fatherCnic: cleanCnic },
          { cnic: cleanCnic }
        ],
        role: "STUDENT"
      }
    });

    if (!student) {
      return NextResponse.json(
        { message: "No active student record found for this CNIC." },
        { status: 404 }
      );
    }

    // 2. Fetch associated records for this student
    const attendance = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { date: "desc" },
    });

    const grades = await prisma.grade.findMany({
      where: { studentId: student.id },
      include: { subject: true },
      orderBy: { createdAt: "desc" },
    });

    const feeRecords = await prisma.feeRecord.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      student,
      attendance,
      grades,
      feeRecords,
    });
  } catch (err) {
    return NextResponse.json(
      { message: "Server error retrieving student portal data." },
      { status: 500 }
    );
  }
}
