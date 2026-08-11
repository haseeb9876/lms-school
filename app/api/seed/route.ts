import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Clear existing data safely
    await prisma.submission.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.fee.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.student.deleteMany();
    await prisma.teacher.deleteMany();
    await prisma.class.deleteMany();
    await prisma.user.deleteMany();

    // 1. Users
    const principalUser = await prisma.user.create({
      data: { name: 'Dr. Ahmad Khan', email: 'principal@greenhill.edu.pk', role: 'PRINCIPAL' }
    });

    const teacherUser = await prisma.user.create({
      data: { name: 'Ms. Ayesha Malik', email: 'teacher@greenhill.edu.pk', role: 'TEACHER' }
    });

    const studentUser = await prisma.user.create({
      data: { name: 'Ali Raza', email: 'student@greenhill.edu.pk', role: 'STUDENT' }
    });

    // 2. Profiles & Class
    const teacherProfile = await prisma.teacher.create({
      data: { userId: teacherUser.id, employeeId: 'EMP-101', subject: 'Mathematics', department: 'Science' }
    });

    const cls = await prisma.class.create({
      data: { name: 'Class 10', section: 'A', teacherId: teacherProfile.id }
    });

    const studentProfile = await prisma.student.create({
      data: { userId: studentUser.id, admissionNo: 'ADM-2026-001', classId: cls.id }
    });

    // 3. Assignments & Fees
    const assignment = await prisma.assignment.create({
      data: {
        title: 'Quadratic Equations Worksheet',
        description: 'Complete exercises 1 to 15 on Chapter 4.',
        dueDate: new Date(Date.now() + 86400000 * 3),
        classId: cls.id,
      }
    });

    await prisma.fee.create({
      data: {
        studentId: studentProfile.id,
        month: 'August 2026',
        amount: 12500,
        status: 'UNPAID',
        dueDate: new Date(Date.now() + 86400000 * 5),
      }
    });

    return NextResponse.json({ success: true, message: 'Enterprise database seeded successfully!' });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
