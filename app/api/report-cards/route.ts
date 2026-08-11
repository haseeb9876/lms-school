import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      include: {
        user: true,
        class: true,
        submissions: {
          include: {
            assignment: true,
          },
        },
        attendances: true,
      },
    });

    const reportCards = students.map((student) => {
      const gradedSubmissions = student.submissions.filter((s) => s.marks !== null);
      const totalObtained = gradedSubmissions.reduce((acc, curr) => acc + (curr.marks || 0), 0);
      const totalPossible = gradedSubmissions.length * 100;
      const percentage = totalPossible > 0 ? Math.round((totalObtained / totalPossible) * 100) : 0;

      // Grade classification logic
      let grade = 'N/A';
      if (totalPossible > 0) {
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B';
        else if (percentage >= 60) grade = 'C';
        else if (percentage >= 50) grade = 'D';
        else grade = 'F';
      }

      // Attendance percentage
      const totalDays = student.attendances.length;
      const daysPresent = student.attendances.filter((a) => a.status === 'PRESENT').length;
      const attendanceRate = totalDays > 0 ? Math.round((daysPresent / totalDays) * 100) : 100;

      return {
        studentId: student.id,
        studentName: student.user.name,
        admissionNo: student.admissionNo,
        className: student.class.name,
        gradedSubmissions,
        totalObtained,
        totalPossible,
        percentage,
        grade,
        attendanceRate,
      };
    });

    return NextResponse.json({ success: true, reportCards });
  } catch (error) {
    console.error('Report Card API Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate academic report cards' },
      { status: 500 }
    );
  }
}
