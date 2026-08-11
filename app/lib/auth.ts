import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function parseSessionCookieValue(cookieValue: string) {
  try {
    return JSON.parse(cookieValue);
  } catch (e) {
    return null;
  }
}

export function createSessionCookieValue(user: { id: string; role: string; name: string }) {
  return JSON.stringify(user);
}

export async function validateCredentials(cnic: string) {
  if (!cnic) return null;
  const cleanCnic = cnic.trim();
  const user = await prisma.user.findUnique({
    where: { cnic: cleanCnic },
  });
  return user;
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session_token") || cookieStore.get("lms-session");
  if (!sessionCookie?.value) return null;
  
  return parseSessionCookieValue(sessionCookie.value) || { id: sessionCookie.value };
}
