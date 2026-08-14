import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { randomToken, sha256Hex } from "@/lib/crypto/hash";
import { signAccessToken, REFRESH_TOKEN_TTL_MS } from "./tokens";

// Re-exported so most call sites only need one import path.
export {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  PENDING_2FA_COOKIE,
  SESSION_COOKIE_MAX_AGE,
  signAccessToken,
  verifyAccessToken,
  signPending2FAToken,
  verifyPending2FAToken,
} from "./tokens";
export type { AccessTokenPayload } from "./tokens";

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

export async function createSession(params: {
  userId: string;
  role: Role;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<IssuedSession> {
  const refreshToken = randomToken(32);
  const session = await prisma.session.create({
    data: {
      userId: params.userId,
      refreshTokenHash: sha256Hex(refreshToken),
      userAgent: params.userAgent ?? undefined,
      ip: params.ip ?? undefined,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  const accessToken = await signAccessToken({
    userId: params.userId,
    role: params.role,
    sessionId: session.id,
  });
  return { accessToken, refreshToken, sessionId: session.id };
}

/**
 * Rotates a refresh token: the presented token is immediately revoked and a
 * new session is issued. A revoked token can never be exchanged again, so
 * replaying an old refresh token after rotation fails closed.
 */
export async function rotateSession(
  presentedRefreshToken: string,
  meta: { userAgent?: string | null; ip?: string | null }
): Promise<IssuedSession | null> {
  const hash = sha256Hex(presentedRefreshToken);
  const session = await prisma.session.findUnique({ where: { refreshTokenHash: hash } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });

  return createSession({ userId: user.id, role: user.role, ...meta });
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
