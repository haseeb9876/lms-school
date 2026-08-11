import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const assignments = await prisma.teacherAssignment.findMany({
      include: {
        class: { select: { id: true, name: true, section: true } },
        teacher: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("GET /api/assignments error:", error);
    return NextResponse.json({ error: "Failed to fetch teacher assignments" }, { status: 500 });
  }
}
