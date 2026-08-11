import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const results = await prisma.examResult.findMany({
      include: {
        student: {
          include: {
            user: { select: { name: true, cnic: true } },
            class: { select: { name: true, section: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("GET /api/teacher/grades error:", error);
    return NextResponse.json({ error: "Failed to fetch exam results" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, subject, term, marksObtained, totalMarks } = body;

    if (!studentId || !subject || !term || marksObtained === undefined) {
      return NextResponse.json({ error: "Missing required grade entry fields" }, { status: 400 });
    }

    const result = await prisma.examResult.create({
      data: {
        studentId,
        subject,
        term,
        marksObtained: parseFloat(marksObtained),
        totalMarks: totalMarks ? parseFloat(totalMarks) : 100,
      },
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("POST /api/teacher/grades error:", error);
    return NextResponse.json({ error: "Failed to save grade entry" }, { status: 500 });
  }
}
