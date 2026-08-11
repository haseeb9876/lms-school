import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const feeInvoices = await prisma.feeInvoice.findMany({
      include: {
        student: {
          include: {
            user: { select: { name: true, cnic: true } },
            class: { select: { name: true, section: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalRevenue = feeInvoices
      .filter((inv) => inv.status === "PAID")
      .reduce((acc, inv) => acc + inv.amount, 0);

    const pendingDues = feeInvoices
      .filter((inv) => inv.status === "PENDING")
      .reduce((acc, inv) => acc + inv.amount, 0);

    const totalStudents = await prisma.studentProfile.count();
    const totalTeachers = await prisma.user.count({ where: { role: "TEACHER" } });

    return NextResponse.json({
      analytics: {
        totalRevenue,
        pendingDues,
        totalStudents,
        totalTeachers,
        feeInvoices,
      },
    });
  } catch (error) {
    console.error("GET /api/executive-analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch executive analytics" }, { status: 500 });
  }
}
