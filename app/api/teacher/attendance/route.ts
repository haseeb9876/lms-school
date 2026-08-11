import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { records } = await req.json();

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ message: "No records provided" }, { status: 400 });
    }

    // Process attendance creation
    await prisma.$transaction(
      records.map((r: any) =>
        prisma.attendance.create({
          data: {
            studentId: r.studentId,
            date: r.date,
            status: r.status,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ message: "Failed to record attendance" }, { status: 500 });
  }
}
