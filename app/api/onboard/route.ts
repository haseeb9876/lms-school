import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name || '').trim();
  const slug = String(body.slug || '').trim().toLowerCase();

  if (!name || !slug) {
    return NextResponse.json({ message: 'School name and slug are required' }, { status: 400 });
  }

  const existing = await prisma.school.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ message: 'School slug already exists' }, { status: 409 });
  }

  const school = await prisma.school.create({
    data: {
      name,
      slug,
      country: 'Pakistan',
      language: 'en'
    }
  });

  return NextResponse.json({ ok: true, school });
}
