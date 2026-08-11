import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: Fetch students for a class along with attendance status for a given date
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const dateStr = searchParams.get("date");

    if (!classId || !dateStr) {
      return NextResponse.json(
        { error: "classId and date parameters are required" },
        { status: 400 }
      );
    }

    const selectedDate = new Date(dateStr);
    selectedDate.setHours(0, 0, 0, 0);

    // Fetch students enrolled in this class
    const students = await prisma.studentProfile.findMany({
      where: { classId },
      include: {
        user: {
          select: { name: true, cnic: true },
        },
        attendances: {
          where: {
            date: selectedDate,
          },
        },
      },
      orderBy: { rollNumber: "asc" },
    });

    const formattedData = students.map((student) => ({
      studentId: student.id,
      rollNumber: student.rollNumber,
      name: student.user.name,
      fatherName: student.fatherName,
      status: student.attendances[0]?.status || "PRESENT", // Default to PRESENT if unrecorded
      recorded: student.attendances.length > 0,
    }));

    return NextResponse.json({ students: formattedData });
  } catch (error) {
    console.error("GET /api/attendance error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance data" },
      { status: 500 }
    );
  }
}

// POST: Batch upsert attendance records for multiple students
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { classId, date, records } = body as {
      classId: string;
      date: string;
      records: Array<{ studentId: string; status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE" }>;
    };

    if (!classId || !date || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "Invalid payload format" },
        { status: 400 }
      );
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Perform atomic transaction across all records
    const transactionOperations = records.map((record) =>
      prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: record.studentId,
            date: attendanceDate,
          },
        },
        update: {
          status: record.status,
        },
        create: {
          studentId: record.studentId,
          date: attendanceDate,
          status: record.status,
        },
      })
    );

    await prisma.$transaction(transactionOperations);

    // Record Audit Log entry
    await prisma.auditLog.create({
      data: {
        userId: "TEACHER_SYSTEM", // Replace with authenticated session user ID
        action: "BATCH_ATTENDANCE_LOGGED",
        details: `Logged attendance for ${records.length} students in class ${classId} on ${date}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully logged attendance for ${records.length} students.`,
    });
  } catch (error) {
    console.error("POST /api/attendance error:", error);
    return NextResponse.json(
      { error: "Failed to save batch attendance" },
      { status: 500 }
    );
  }
}
