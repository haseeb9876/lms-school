import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      include: {
        assignments: {
          include: {
            teacher: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ classes });
  } catch (error) {
    console.error("GET /api/academic error:", error);
    return NextResponse.json({ error: "Failed to fetch academic classes" }, { status: 500 });
  }
}
