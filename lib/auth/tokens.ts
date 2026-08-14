import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "@prisma/client";

/**
 * Edge-safe token signing/verification only (jose, no Node APIs) — this is
 * the one auth module middleware.ts is allowed to import. Anything that
 * touches Prisma or node:crypto (session creation/rotation, password
 * hashing) lives in session.ts instead, which only ever runs in the
 * Node.js runtime (API routes), never on the Edge.
 */

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
export const PENDING_2FA_COOKIE = "pending_2fa_token";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const PENDING_2FA_TTL_SECONDS = 5 * 60;

export const SESSION_COOKIE_MAX_AGE = {
  access: ACCESS_TOKEN_TTL_SECONDS,
  refresh: REFRESH_TOKEN_TTL_SECONDS,
  pending2FA: PENDING_2FA_TTL_SECONDS,
};

export const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_SECONDS * 1000;

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

export async function signAccessToken(params: { userId: string; role: Role; sessionId: string }): Promise<string> {
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
