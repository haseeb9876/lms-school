import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    let settings = await prisma.schoolSettings.findFirst();
    if (!settings) {
      settings = await prisma.schoolSettings.create({
        data: {
          schoolName: 'Greenhill Academy',
          tagline: 'Center of Academic Excellence',
          bankName: 'Meezan Bank Ltd',
          accountNumber: 'PK92MEZN0001020304050607',
          accountTitle: 'Greenhill Educational Society',
          contactPhone: '+92 51 111 222 333',
          address: 'Sector H-8/4, Islamabad, Pakistan',
        },
      });
    }
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Settings API GET Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve school settings' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const existing = await prisma.schoolSettings.findFirst();

    let settings;
    if (existing) {
      settings = await prisma.schoolSettings.update({
        where: { id: existing.id },
        data: {
          schoolName: body.schoolName,
          tagline: body.tagline,
          bankName: body.bankName,
          accountNumber: body.accountNumber,
          accountTitle: body.accountTitle,
          contactPhone: body.contactPhone,
          address: body.address,
        },
      });
    } else {
      settings = await prisma.schoolSettings.create({
        data: {
          schoolName: body.schoolName,
          tagline: body.tagline,
          bankName: body.bankName,
          accountNumber: body.accountNumber,
          accountTitle: body.accountTitle,
          contactPhone: body.contactPhone,
          address: body.address,
        },
      });
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Settings API PUT Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update institutional branding' },
      { status: 500 }
    );
  }
}
