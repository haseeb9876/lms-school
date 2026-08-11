import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionToken },
      include: {
        assignments: {
          include: { class: { select: { id: true, name: true, section: true } } },
        },
        studentProfile: {
          include: { class: { select: { id: true, name: true, section: true } } },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        cnic: user.cnic,
        role: user.role,
        phone: user.phone,
        studentProfile: user.studentProfile,
        assignments: user.assignments,
      },
    });
  } catch (error: any) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ authenticated: false, error: "Authentication check failed" }, { status: 500 });
  }
}
