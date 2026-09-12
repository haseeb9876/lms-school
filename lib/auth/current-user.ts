import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ACCESS_COOKIE, verifyAccessToken, isPastAbsoluteDeadline } from "./session";
import type { DeviceClass } from "./session";

export interface SessionInfo {
  userId: string;
  role: Role;
  sessionId: string;
  /** Decides this session's lifetime policy — see lib/auth/tokens.ts. */
  device: DeviceClass;
  /** The desktop 24-hour ceiling; null on phones, which have none. */
  absoluteExpiresAt: Date | null;
}

export async function getCurrentSession(): Promise<SessionInfo | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  // The proxy already turns these away, but a Server Action reached by any
  // other path must not be the one place the ceiling doesn't apply.
  if (isPastAbsoluteDeadline(payload)) return null;

  return {
    userId: payload.sub,
    role: payload.role,
    sessionId: payload.sid,
    device: payload.dev,
    absoluteExpiresAt: typeof payload.ae === "number" ? new Date(payload.ae) : null,
  };
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

