import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cnic } = body;

    if (!cnic) {
      return NextResponse.json({ error: "CNIC is required." }, { status: 400 });
    }

    const cleanCnic = cnic.trim();

    const students = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        OR: [
          { cnic: cleanCnic },
          { studentProfile: { fatherCnic: cleanCnic } },
        ],
      },
      include: {
        studentProfile: {
          include: {
            class: {
              include: {
                assignments: {
                  include: {
                    teacher: { select: { name: true, phone: true } },
                  },
                },
              },
            },
            feeInvoices: { orderBy: { createdAt: "desc" } },
            examResults: { orderBy: { date: "desc" } },
            attendances: { orderBy: { date: "desc" } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, students });
  } catch (error) {
    console.error("POST /api/student/dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch student profile." }, { status: 500 });
  }
}
