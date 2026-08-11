import { NextResponse } from 'next/server';
import { createSessionCookieValue, validateCredentials } from '@/app/lib/auth';

export async function POST(request: Request) {
  const body = await request.json();
  const user = validateCredentials(body.email, body.password);

  if (!user) {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, user });
  response.cookies.set({
    name: 'lms-session',
    value: createSessionCookieValue(user),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8
  });

  return response;
}
