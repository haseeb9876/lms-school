import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { randomToken, sha256Hex } from "@/lib/crypto/hash";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
export const PENDING_2FA_COOKIE = "pending_2fa_token";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PENDING_2FA_TTL_SECONDS = 5 * 60;

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SIGNING_SECRET;
  if (!secret) {
    throw new Error("JWT_SIGNING_SECRET is not set.");
  }
  return new TextEncoder().encode(secret);
}

export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  role: Role;
  sid: string;
}

export interface Pending2FAPayload extends JWTPayload {
  sub: string;
  purpose: "2fa_pending";
}

export async function signAccessToken(params: {
  userId: string;
  role: Role;
  sessionId: string;
}): Promise<string> {
  return new SignJWT({ role: params.role, sid: params.sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(params.userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string" || typeof payload.role !== "string" || typeof payload.sid !== "string") {
      return null;
    }
    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function signPending2FAToken(userId: string): Promise<string> {
  return new SignJWT({ purpose: "2fa_pending" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${PENDING_2FA_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyPending2FAToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "2fa_pending" || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

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

export const SESSION_COOKIE_MAX_AGE = {
  access: ACCESS_TOKEN_TTL_SECONDS,
  refresh: REFRESH_TOKEN_TTL_MS / 1000,
  pending2FA: PENDING_2FA_TTL_SECONDS,
};
