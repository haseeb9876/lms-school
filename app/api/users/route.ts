import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: Filterable User Directory
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const classId = searchParams.get("classId") || "";

    const whereClause: any = {};

    if (role && role !== "ALL") {
      whereClause.role = role;
    }

    if (search.trim()) {
      whereClause.OR = [
        { name: { contains: search } },
        { cnic: { contains: search } },
      ];
    }

    if (classId && classId !== "ALL") {
      if (role === "STUDENT" || !role) {
        whereClause.studentProfile = { classId };
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        teacherAssignments: {
          include: { class: { select: { id: true, name: true, section: true } } },
        },
        studentProfile: {
          include: { class: { select: { id: true, name: true, section: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch directory" }, { status: 500 });
  }
}

// POST: Register New User safely
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, cnic, role, phone, classAssignments, fatherName, fatherCnic, rollNumber, classId } = body;

    if (!name || !cnic || !role) {
      return NextResponse.json({ error: "Name, CNIC, and Role are required." }, { status: 400 });
    }

    const cleanCnic = cnic.trim();

    // 1. Check if user CNIC already exists
    const existingCnic = await prisma.user.findUnique({
      where: { cnic: cleanCnic },
    });
    if (existingCnic) {
      return NextResponse.json(
        { error: `User with CNIC '${cleanCnic}' is already registered.` },
        { status: 400 }
      );
    }

    // 2. Format Roll Number for Students
    let finalRollNumber = rollNumber ? rollNumber.trim() : `ROLL-${Date.now().toString().slice(-4)}`;

    if (role === "STUDENT") {
      // Check if Roll Number is unique
      const existingRoll = await prisma.studentProfile.findUnique({
        where: { rollNumber: finalRollNumber },
      });

      if (existingRoll) {
        // Automatically make it unique by appending a timestamp suffix
        finalRollNumber = `${finalRollNumber}-${Date.now().toString().slice(-4)}`;
      }
    }

    // 3. Create User Record
    const user = await prisma.user.create({
      data: {
        name,
        cnic: cleanCnic,
        role,
        phone: phone || null,
        password: "password123",
      },
    });

    // 4. Create Teacher Workload Assignments
    if (role === "TEACHER" && Array.isArray(classAssignments)) {
      for (const assign of classAssignments) {
        if (assign.classId && assign.subject) {
          await prisma.teacherAssignment.create({
            data: {
              teacherId: user.id,
              classId: assign.classId,
              subject: assign.subject,
            },
          });
        }
      }
    }

    // 5. Create Student Profile
    if (role === "STUDENT" && classId) {
      await prisma.studentProfile.create({
        data: {
          userId: user.id,
          classId,
          fatherName: fatherName || "N/A",
          fatherCnic: fatherCnic ? fatherCnic.trim() : cleanCnic,
          rollNumber: finalRollNumber,
        },
      });
    }

    return NextResponse.json({ success: true, user });
  } catch (e: any) {
    console.error("POST /api/users error:", e);
    return NextResponse.json(
      { error: e.message || "Failed to process user registration." },
      { status: 500 }
    );
  }
}

// PUT: Edit User Details & Reassign Classes / Workloads
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, cnic, phone, role, classId, fatherName, fatherCnic, rollNumber, classAssignments } = body;

    if (!id || !name || !cnic) {
      return NextResponse.json({ error: "User ID, Name, and CNIC are required." }, { status: 400 });
    }

    const cleanCnic = cnic.trim();

    // Update basic user record
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { name, cnic: cleanCnic, phone, role },
    });

    // If Student: Update or Create Profile
    if (role === "STUDENT" && classId) {
      const finalRoll = rollNumber ? rollNumber.trim() : `ROLL-${Date.now().toString().slice(-4)}`;
      await prisma.studentProfile.upsert({
        where: { userId: id },
        update: {
          classId,
          fatherName: fatherName || "N/A",
          fatherCnic: fatherCnic ? fatherCnic.trim() : cleanCnic,
          rollNumber: finalRoll,
        },
        create: {
          userId: id,
          classId,
          fatherName: fatherName || "N/A",
          fatherCnic: fatherCnic ? fatherCnic.trim() : cleanCnic,
          rollNumber: finalRoll,
        },
      });
    }

    // If Teacher: Reassign Workloads
    if (role === "TEACHER" && Array.isArray(classAssignments)) {
      await prisma.teacherAssignment.deleteMany({
        where: { teacherId: id },
      });

      for (const assign of classAssignments) {
        if (assign.classId && assign.subject) {
          await prisma.teacherAssignment.create({
            data: {
              teacherId: id,
              classId: assign.classId,
              subject: assign.subject,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (e: any) {
    console.error("PUT /api/users error:", e);
    return NextResponse.json({ error: e.message || "Failed to update user details." }, { status: 500 });
  }
}

// DELETE: Remove User
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
