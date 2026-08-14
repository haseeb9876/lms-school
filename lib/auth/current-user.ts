import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ACCESS_COOKIE, verifyAccessToken } from "./session";

export interface SessionInfo {
  userId: string;
  role: Role;
  sessionId: string;
}

export async function getCurrentSession(): Promise<SessionInfo | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  if (!payload) return null;
  return { userId: payload.sub, role: payload.role, sessionId: payload.sid };
}

/** For Server Components / layouts. Redirects rather than throwing, since
 * there's no JSON response to return from a page render. */
export async function requireAuth(allowedRoles?: Role[]): Promise<SessionInfo> {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    redirect("/unauthorized");
  }
  return session;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}
