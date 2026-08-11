import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: Fetch exam results for a specific class or student
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const studentId = searchParams.get("studentId");
    const term = searchParams.get("term") || "Mid-Term 2026";

    if (studentId) {
      const results = await prisma.examResult.findMany({
        where: { studentId, term },
        orderBy: { subject: "asc" },
      });
      return NextResponse.json({ results });
    }

    if (classId) {
      const studentsWithResults = await prisma.studentProfile.findMany({
        where: { classId },
        include: {
          user: { select: { name: true, cnic: true } },
          examResults: {
            where: { term },
          },
        },
        orderBy: { rollNumber: "asc" },
      });

      return NextResponse.json({ students: studentsWithResults });
    }

    return NextResponse.json(
      { error: "Either classId or studentId is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("GET /api/grades error:", error);
    return NextResponse.json({ error: "Failed to fetch grades" }, { status: 500 });
  }
}

// POST: Batch save exam marks for a class subject
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subject, term, records } = body as {
      subject: string;
      term: string;
      records: Array<{
        studentId: string;
        marksObtained: number;
        totalMarks: number;
      }>;
    };

    if (!subject || !term || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "Invalid payload format" },
        { status: 400 }
      );
    }

    // Delete existing entries for this subject + term combination for these students to allow clean upsert
    const studentIds = records.map((r) => r.studentId);
    await prisma.examResult.deleteMany({
      where: {
        subject,
        term,
        studentId: { in: studentIds },
      },
    });

    // Create new exam result entries
    const createdResults = await prisma.examResult.createMany({
      data: records.map((r) => ({
        studentId: r.studentId,
        subject,
        term,
        marksObtained: Number(r.marksObtained),
        totalMarks: Number(r.totalMarks),
      })),
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: "TEACHER_SYSTEM",
        action: "EXAM_MARKS_ENTERED",
        details: `Saved ${createdResults.count} records for subject '${subject}' in term '${term}'`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully saved marks for ${createdResults.count} students.`,
    });
  } catch (error) {
    console.error("POST /api/grades error:", error);
    return NextResponse.json({ error: "Failed to save exam marks" }, { status: 500 });
  }
}
