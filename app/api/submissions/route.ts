import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Enterprise Input Schema
const submissionSchema = z.object({
  assignmentId: z.string().min(1, 'Assignment ID is required'),
  studentId: z.string().min(1, 'Student ID is required'),
  content: z.string().min(5, 'Content must be at least 5 characters long'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate request payload
    const validation = submissionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { assignmentId, studentId, content } = validation.data;

    // Create or update submission cleanly
    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_studentId: { assignmentId, studentId },
      },
      update: { content, status: 'SUBMITTED', submittedAt: new Date() },
      create: {
        assignmentId,
        studentId,
        content,
        status: 'SUBMITTED',
      },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error('API Error [POST /api/submissions]:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const submissions = await prisma.submission.findMany({
      include: {
        student: { include: { user: true } },
        assignment: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
    return NextResponse.json({ success: true, submissions });
  } catch (error) {
    console.error('API Error [GET /api/submissions]:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve submissions' },
      { status: 500 }
    );
  }
}
