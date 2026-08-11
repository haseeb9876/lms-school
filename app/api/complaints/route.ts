import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { parentCnic, studentName, subject, message } = body;

    // Fallback: fetch session if CNIC wasn't in body payload
    if (!parentCnic) {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("user_session")?.value;
      if (sessionCookie) {
        const parsed = JSON.parse(sessionCookie);
        parentCnic = parsed.cnic;
      }
    }

    if (!subject || !message) {
      return NextResponse.json({ message: "Subject and message are required." }, { status: 400 });
    }

    const complaint = await prisma.complaint.create({
      data: {
        parentCnic: parentCnic || "UNKNOWN_PARENT",
        studentName: studentName || "Anonymous Student",
        subject,
        message,
      },
    });

    return NextResponse.json(complaint, { status: 201 });
  } catch (err) {
    console.error("Complaint Submission Error:", err);
    return NextResponse.json({ message: "Failed to log complaint into database." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const complaints = await prisma.complaint.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(complaints);
  } catch (err) {
    return NextResponse.json({ message: "Failed to fetch executive complaints." }, { status: 500 });
  }
}
