import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const logs = await prisma.notificationLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: 20,
    });
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Notification GET Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { type, recipient, phone, message } = await req.json();

    // Log the broadcast in DB
    const log = await prisma.notificationLog.create({
      data: {
        recipient,
        phone,
        type,
        message,
        status: 'SENT',
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Notification POST Error:', error);
    return NextResponse.json({ success: false, message: 'Failed to trigger notification' }, { status: 500 });
  }
}
