import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    const whereClause: any = {};
    if (role) {
      whereClause.role = role.toUpperCase();
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        assignments: {
          include: { class: { select: { id: true, name: true, section: true } } },
        },
        studentProfile: {
          include: { class: { select: { id: true, name: true, section: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cnic, name, role, phone, classId, fatherCnic } = body;

    if (!cnic || !name || !role) {
      return NextResponse.json(
        { error: "CNIC, Name, and Role are required" },
        { status: 400 }
      );
    }

    const cleanCnic = cnic.trim();

    const existingUser = await prisma.user.findUnique({
      where: { cnic: cleanCnic },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this CNIC already exists" },
        { status: 400 }
      );
    }

    const newUser = await prisma.user.create({
      data: {
        cnic: cleanCnic,
        name,
        role: role.toUpperCase(),
        phone,
        ...(role.toUpperCase() === "STUDENT" && {
          studentProfile: {
            create: {
              fatherCnic,
              classId: classId || null,
            },
          },
        }),
      },
      include: {
        studentProfile: true,
        assignments: true,
      },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
