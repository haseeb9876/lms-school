import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const fees = await prisma.fee.findMany({
      include: { student: { include: { user: true, class: true } } },
    });

    const studentsCount = await prisma.student.count();
    const totalCollected = fees.filter((f) => f.status === 'PAID').reduce((acc, f) => acc + f.amount, 0);
    const totalPending = fees.filter((f) => f.status === 'UNPAID').reduce((acc, f) => acc + f.amount, 0);
    const collectionEfficiency = fees.length > 0 ? Math.round((totalCollected / (totalCollected + totalPending)) * 100) : 100;

    // Projected next 3 months cashflow (Estimated 92% recovery rate)
    const monthlyRunRate = (studentsCount || 10) * 15000;
    const projectedQ1Revenue = Math.round(monthlyRunRate * 3 * 0.92);

    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      analytics: {
        totalStudents: studentsCount,
        totalCollected,
        totalPending,
        collectionEfficiency,
        projectedQ1Revenue,
        monthlyRunRate,
        auditLogs,
      },
    });
  } catch (error) {
    console.error('Executive Analytics Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to compute executive intelligence' },
      { status: 500 }
    );
  }
}
