import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const assignments = await prisma.assignment.findMany({
      include: {
        class: true,
        submissions: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json({ success: true, assignments });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { assignmentId, fileUrl } = await req.json();

    // Fetch seeded student profile automatically
    const student = await prisma.student.findFirst();
    if (!student) {
      return NextResponse.json({ success: false, error: 'No student found' }, { status: 404 });
    }

    const submission = await prisma.submission.create({
      data: {
        assignmentId,
        studentId: student.id,
        fileUrl: fileUrl || 'https://storage.greenhill.edu.pk/submissions/math-hw1.pdf',
      },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
