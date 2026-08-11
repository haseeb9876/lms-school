import { NextResponse } from "next/server";
import { validateCredentials, createSessionCookieValue } from "@/app/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cnic } = body;

    if (!cnic) {
      return NextResponse.json({ error: "CNIC is required." }, { status: 400 });
    }

    const user = await validateCredentials(cnic);

    if (!user) {
      return NextResponse.json({ error: "Invalid CNIC credentials." }, { status: 401 });
    }

    const sessionData = createSessionCookieValue({
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
  } catch (error) {
    console.error("POST /api/login error:", error);
    return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
  }
}
