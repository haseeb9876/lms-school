import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const dateStr = searchParams.get("date");

    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const students = await prisma.studentProfile.findMany({
      where: { classId },
      include: {
        user: { select: { id: true, name: true, cnic: true } },
        attendances: {
          where: {
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formattedData = students.map((student) => ({
      id: student.id,
      name: student.user.name,
      cnic: student.user.cnic,
      status: student.attendances[0]?.status || "PRESENT",
    }));

    return NextResponse.json({ students: formattedData });
  } catch (error: any) {
    console.error("GET /api/attendance error:", error);
    return NextResponse.json({ error: "Failed to fetch attendance records" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { classId, records, date } = body;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: "Records array is required" }, { status: 400 });
    }

    const attendanceDate = date ? new Date(date) : new Date();

    const updates = records.map((record: { studentId: string; status: string }) => {
      return prisma.attendance.create({
        data: {
          studentId: record.studentId,
          status: record.status,
          date: attendanceDate,
        },
      });
    });

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true, message: "Attendance saved successfully" });
  } catch (error: any) {
    console.error("POST /api/attendance error:", error);
    return NextResponse.json({ error: "Failed to mark attendance" }, { status: 500 });
  }
}
