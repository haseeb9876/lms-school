import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cnic } = body;

    if (!cnic) {
      return NextResponse.json({ error: "CNIC is required." }, { status: 400 });
    }

    const cleanCnic = cnic.trim();

    // Query user by CNIC directly
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { cnic: cleanCnic },
          { studentProfile: { fatherCnic: cleanCnic } },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid CNIC credentials. Record not found." }, { status: 401 });
    }

    const sessionData = JSON.stringify({
      id: user.id,
      role: user.role,
      name: user.name,
    });

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

    response.cookies.set("lms-session", sessionData, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("POST /api/login error:", error);
    return NextResponse.json({ error: error?.message || "Database connection error." }, { status: 500 });
  }
}
