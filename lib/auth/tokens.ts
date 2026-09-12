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

/**
 * Set at path "/" so the proxy can see it on a page request, unlike the
 * refresh cookie which is deliberately scoped to /api/auth. It carries no
 * secret — only the fact that a renewable session exists — and its sole
 * power is to make the proxy attempt a refresh. Forging it gets an attacker
 * a redirect to an endpoint that will reject them.
 */
export const SESSION_HINT_COOKIE = "lms_session";

export type DeviceClass = "DESKTOP" | "MOBILE";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const PENDING_2FA_TTL_SECONDS = 5 * 60;

/**
 * How long a session may be renewed for, by the device it was opened on.
 *
 * Desktops are shared. The computer in the school office, the one in the
 * staff room, the one a family uses at an internet café — a session left
 * open on any of them is the realistic way this school's data leaks. So a
 * desktop session has a hard 24-hour ceiling that no amount of activity
 * extends: after a day, everyone signs in again, principal included.
 *
 * A phone is the opposite. It belongs to one person, it is already behind
 * that person's own lock screen, and a teacher standing at a classroom door
 * with a register to mark will not type a 13-digit CNIC to get in. So phone
 * sessions have no ceiling at all — they end when the person taps Log out,
 * when the principal revokes the device, or when the password changes.
 */
export const DESKTOP_SESSION_MAX_MS = 24 * 60 * 60 * 1000;
const MOBILE_REFRESH_TTL_SECONDS = 365 * 24 * 60 * 60;
const DESKTOP_REFRESH_TTL_SECONDS = DESKTOP_SESSION_MAX_MS / 1000;

export const SESSION_COOKIE_MAX_AGE = {
  access: ACCESS_TOKEN_TTL_SECONDS,
  pending2FA: PENDING_2FA_TTL_SECONDS,
};

/**
 * The cookie lifetime matches the policy for the device. A desktop cookie
 * that outlived its session would leave the browser retrying a refresh that
 * can never succeed; the phone cookie is renewed on every rotation, so a
 * year is a floor on inactivity, not a cap on the session.
 */
export function refreshCookieMaxAge(device: DeviceClass): number {
  return device === "MOBILE" ? MOBILE_REFRESH_TTL_SECONDS : DESKTOP_REFRESH_TTL_SECONDS;
}

export function refreshTokenTtlMs(device: DeviceClass): number {
  return refreshCookieMaxAge(device) * 1000;
}

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
  /** Device class, abbreviated to keep the cookie small. */
  dev: DeviceClass;
  /**
   * Absolute session deadline as epoch milliseconds — the desktop ceiling.
   * Absent on phone sessions, which have none.
   *
   * It rides in the token rather than being looked up, so the proxy can
   * enforce it on the Edge without a database round trip. Without it a
   * desktop session would survive up to a further 15 minutes past its
   * deadline, for as long as the last-issued access token stayed valid.
   */
  ae?: number;
}

export async function signAccessToken(params: {
  userId: string;
  role: Role;
  sessionId: string;
  device: DeviceClass;
  absoluteExpiresAt: Date | null;
}): Promise<string> {
  const builder = new SignJWT({
    role: params.role,
    sid: params.sessionId,
    dev: params.device,
    ...(params.absoluteExpiresAt ? { ae: params.absoluteExpiresAt.getTime() } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(params.userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`);

  return builder.sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string" || typeof payload.role !== "string" || typeof payload.sid !== "string") {
      return null;
    }
    // Tokens minted before device-aware sessions carry no `dev` claim.
    // Treating them as desktop is the safe reading: it applies the ceiling
    // rather than silently granting the unlimited phone policy.
    const device: DeviceClass = payload.dev === "MOBILE" ? "MOBILE" : "DESKTOP";
    return { ...payload, dev: device } as AccessTokenPayload;
  } catch {
    return null;
  }
}

/**
 * True when a desktop session has passed its 24-hour ceiling. Separate from
 * `verifyAccessToken` because the two failures are not the same thing: an
 * unverifiable token may still be renewable, while this one never is and
 * must send the person to the sign-in screen.
 */
export function isPastAbsoluteDeadline(payload: AccessTokenPayload, now = Date.now()): boolean {
  return typeof payload.ae === "number" && now >= payload.ae;
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
