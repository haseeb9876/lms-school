import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ classes });
  } catch (error: any) {
    console.error("GET /api/classes error:", error);
    return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 });
  }
}
