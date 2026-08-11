import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cnic = searchParams.get("cnic");

    if (!cnic) {
      return NextResponse.json({ message: "CNIC query parameter is required" }, { status: 400 });
    }

    const cleanCnic = cnic.replace(/[^0-9]/g, "");

    const students = await prisma.user.findMany({
      where: {
        OR: [{ cnic: cleanCnic }, { fatherCnic: cleanCnic }],
        role: "STUDENT",
      },
      include: {
        attendance: {
          orderBy: { date: "desc" },
        },
        grades: {
          include: {
            subject: true,
          },
          orderBy: { createdAt: "desc" },
        },
        feeRecords: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!students || students.length === 0) {
      return NextResponse.json({ message: "No student records found for this CNIC." }, { status: 404 });
    }

    return NextResponse.json(students);
  } catch (err) {
    return NextResponse.json({ message: "Server error fetching student data" }, { status: 500 });
  }
}
