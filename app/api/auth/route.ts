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
    const user = await prisma.user.findUnique({
      where: { cnic: cleanCnic },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        cnic: user.cnic,
        role: user.role,
      },
    });

    response.cookies.set("session_token", user.id, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth error:", error);
    return NextResponse.json({ error: "Authentication error." }, { status: 500 });
  }
}
