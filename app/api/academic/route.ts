import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const classes = await prisma.classGrade.findMany({
      include: {
        subjects: {
          include: {
            teacher: { select: { id: true, name: true, cnic: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(classes);
  } catch (err) {
    return NextResponse.json({ message: "Failed to fetch classes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { action, className, section, subjectName, subjectCode, classGradeId, teacherId } = await req.json();

    if (action === "CREATE_CLASS") {
      const newClass = await prisma.classGrade.create({
        data: { name: className, section: section || "A" },
      });
      return NextResponse.json(newClass);
    }

    if (action === "ADD_SUBJECT") {
      const newSubject = await prisma.subject.create({
        data: {
          name: subjectName,
          code: subjectCode,
          classGradeId,
          teacherId: teacherId || null,
        },
      });
      return NextResponse.json(newSubject);
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ message: "Error updating academic records" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { type, id } = await req.json();
    if (type === "CLASS") {
      await prisma.classGrade.delete({ where: { id } });
    } else if (type === "SUBJECT") {
      await prisma.subject.delete({ where: { id } });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ message: "Failed to delete item" }, { status: 500 });
  }
}
