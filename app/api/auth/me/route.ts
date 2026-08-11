import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // 1. Fetch User Record with Student Profile and Class Subject Teachers
    const user = await prisma.user.findUnique({
      where: { id: sessionToken },
      include: {
        teacherAssignments: {
          include: { class: { select: { id: true, name: true, section: true } } },
        },
        studentProfile: {
          include: {
            class: {
              include: {
                assignments: {
                  include: {
                    teacher: { select: { id: true, name: true, phone: true } },
                  },
                },
              },
            },
            feeInvoices: { orderBy: { createdAt: "desc" } },
            examResults: { orderBy: { date: "desc" } },
            attendances: { orderBy: { date: "desc" } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Fetch Desk Tickets sent by this user
    const tickets = await prisma.deskTicket.findMany({
      where: { parentId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // 3. Fetch Sibling Children if registered under same Father CNIC
    let children: any[] = [];
    const lookupFatherCnic = user.studentProfile?.fatherCnic || user.cnic;

    if (lookupFatherCnic) {
      children = await prisma.studentProfile.findMany({
        where: { fatherCnic: lookupFatherCnic },
        include: {
          user: { select: { id: true, name: true, cnic: true } },
          class: {
            include: {
              assignments: {
                include: {
                  teacher: { select: { id: true, name: true, phone: true } },
                },
              },
            },
          },
          feeInvoices: { orderBy: { createdAt: "desc" } },
          examResults: { orderBy: { date: "desc" } },
          attendances: { orderBy: { date: "desc" } },
        },
      });
    }

    return NextResponse.json({ user, children, tickets });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
