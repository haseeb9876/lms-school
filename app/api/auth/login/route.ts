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

    // Look up user in database
    const user = await prisma.user.findUnique({
      where: { cnic: cleanCnic },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid CNIC credentials. User not registered." },
        { status: 401 }
      );
    }

    // Determine target redirect route based on user role
    let redirectUrl = "/dashboard/student";
    if (user.role === "PRINCIPAL") redirectUrl = "/dashboard/principal";
    if (user.role === "TEACHER") redirectUrl = "/dashboard/teacher";
    if (user.role === "STUDENT" || user.role === "PARENT") redirectUrl = "/dashboard/student";

    const response = NextResponse.json({
      success: true,
      role: user.role,
      redirectUrl,
      user: {
        id: user.id,
        name: user.name,
        cnic: user.cnic,
        role: user.role,
      },
    });

    // Set authentication cookies across entire root domain
    response.cookies.set("session_token", user.id, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });

    response.cookies.set("user_role", user.role, {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: "Server authentication error." },
      { status: 500 }
    );
  }
}
