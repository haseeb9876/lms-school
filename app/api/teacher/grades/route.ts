import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { studentId, subjectId, examType, marks, totalMarks } = await req.json();

    // Ensure dummy subject if not provided
    let subId = subjectId;
    if (!subId) {
      let defaultClass = await prisma.classGrade.findFirst();
      if (!defaultClass) {
        defaultClass = await prisma.classGrade.create({ data: { name: "General Class" } });
      }
      
      let defaultSub = await prisma.subject.findFirst({ where: { classGradeId: defaultClass.id } });
      if (!defaultSub) {
        defaultSub = await prisma.subject.create({
          data: { name: "General Subjects", code: "GEN101", classGradeId: defaultClass.id },
        });
      }
      subId = defaultSub.id;
    }

    const grade = await prisma.grade.create({
      data: {
        studentId,
        subjectId: subId,
        examType,
        marks,
        totalMarks: totalMarks || 100,
      },
    });

    return NextResponse.json(grade);
  } catch (err) {
    return NextResponse.json({ message: "Failed to create grade entry" }, { status: 500 });
  }
}
