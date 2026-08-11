import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get list of classes, teachers, and students
export async function GET() {
  try {
    const classes = await prisma.schoolClass.findMany();
    const teachers = await prisma.teacher.findMany({
      include: { user: true, class: true },
    });
    const students = await prisma.student.findMany({
      include: { user: true, class: true },
    });

    return NextResponse.json({ success: true, classes, teachers, students });
  } catch (error) {
    console.error('Fetch Users Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch user directory' }, { status: 500 });
  }
}

// Provision Teacher or Student
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { role, name, cnic, password, classId, fatherCnic, admissionNo } = body;

    if (!cnic || !name || !password || !classId) {
      return NextResponse.json({ success: false, message: 'Missing required parameters.' }, { status: 400 });
    }

    // 1. Create Base User Account with CNIC as primary login
    const newUser = await prisma.user.create({
      data: {
        cnic: cnic.trim(),
        name,
        password,
        role,
      },
    });

    // 2. Attach Teacher or Student Profile
    if (role === 'TEACHER') {
      await prisma.teacher.create({
        data: {
          userId: newUser.id,
          classId,
        },
      });
    } else if (role === 'STUDENT') {
      await prisma.student.create({
        data: {
          userId: newUser.id,
          admissionNo: admissionNo || `ADM-${Date.now().toString().slice(-4)}`,
          fatherCnic: fatherCnic ? fatherCnic.trim() : cnic.trim(),
          classId,
        },
      });
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error('Provisioning Error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, message: 'CNIC or Admission Number already registered.' }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to provision user.' }, { status: 500 });
  }
}

// Delete / Offboard User
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true, message: 'Account safely offboarded.' });
  } catch (error) {
    console.error('Delete User Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to offboard account.' }, { status: 500 });
  }
}
