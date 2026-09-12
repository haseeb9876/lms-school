import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { randomToken, sha256Hex } from "@/lib/crypto/hash";
import {
  signAccessToken,
  refreshTokenTtlMs,
  DESKTOP_SESSION_MAX_MS,
  type DeviceClass,
} from "./tokens";

// Re-exported so most call sites only need one import path.
export {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  PENDING_2FA_COOKIE,
  SESSION_HINT_COOKIE,
  SESSION_COOKIE_MAX_AGE,
  DESKTOP_SESSION_MAX_MS,
  refreshCookieMaxAge,
  signAccessToken,
  verifyAccessToken,
  isPastAbsoluteDeadline,
  signPending2FAToken,
  verifyPending2FAToken,
} from "./tokens";
export type { AccessTokenPayload, DeviceClass } from "./tokens";

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  device: DeviceClass;
  /** Null on phones, which have no ceiling. */
  absoluteExpiresAt: Date | null;
}

export async function createSession(params: {
  userId: string;
  role: Role;
  device?: DeviceClass;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<IssuedSession> {
  const device = params.device ?? "DESKTOP";
  const now = Date.now();

  /*
   * The ceiling is stamped once, here, at sign-in. Everything afterwards
   * only ever copies it — see `rotateSession` — so activity cannot push a
   * desktop session past 24 hours from the moment its owner typed their
   * password.
   */
  const absoluteExpiresAt =
    device === "MOBILE" ? null : new Date(now + DESKTOP_SESSION_MAX_MS);

  const refreshToken = randomToken(32);
  const session = await prisma.session.create({
    data: {
      userId: params.userId,
      refreshTokenHash: sha256Hex(refreshToken),
      userAgent: params.userAgent ?? undefined,
      ip: params.ip ?? undefined,
      deviceClass: device,
      absoluteExpiresAt,
      expiresAt: new Date(now + refreshTokenTtlMs(device)),
    },
  });

  // The chain is the browser's stable identity across rotations. The first
  // session in a chain is its own root, so the device list shows one entry
  // per device rather than a new one every fifteen minutes.
  await prisma.session.update({
    where: { id: session.id },
    data: { chainId: session.id },
  });

  const accessToken = await signAccessToken({
    userId: params.userId,
    role: params.role,
    sessionId: session.id,
    device,
    absoluteExpiresAt,
  });

  return { accessToken, refreshToken, sessionId: session.id, device, absoluteExpiresAt };
}

export type RotationFailure = "INVALID" | "EXPIRED" | "DEADLINE" | "ACCOUNT";

/**
 * Rotates a refresh token: the presented token is immediately revoked and a
 * new session is issued. A revoked token can never be exchanged again, so
 * replaying an old refresh token after rotation fails closed.
 *
 * The device class and the absolute deadline are copied from the session
 * being replaced, never recomputed. That is what makes the desktop ceiling
 * a ceiling: a person working all day rotates their token dozens of times
 * and every one of those tokens carries the same original deadline. It also
 * means the policy cannot be changed mid-session by sending different
 * headers — swapping in a phone user-agent on hour twenty-three does not
 * convert a desktop session into an unlimited one.
 */
export async function rotateSession(
  presentedRefreshToken: string,
  meta: { userAgent?: string | null; ip?: string | null }
): Promise<{ ok: true; session: IssuedSession } | { ok: false; reason: RotationFailure }> {
  const hash = sha256Hex(presentedRefreshToken);
  const session = await prisma.session.findUnique({ where: { refreshTokenHash: hash } });

  if (!session || session.revokedAt) return { ok: false, reason: "INVALID" };

  const now = new Date();
  if (session.expiresAt < now) return { ok: false, reason: "EXPIRED" };

  if (session.absoluteExpiresAt && session.absoluteExpiresAt <= now) {
    // The desktop ceiling. Revoked rather than merely refused, so the row
    // stops appearing as a live device on the security page.
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: now } });
    return { ok: false, reason: "DEADLINE" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.status !== "ACTIVE") return { ok: false, reason: "ACCOUNT" };

  const device: DeviceClass = session.deviceClass;
  const refreshToken = randomToken(32);

  const [, next] = await prisma.$transaction([
    prisma.session.update({ where: { id: session.id }, data: { revokedAt: now } }),
    prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: sha256Hex(refreshToken),
        userAgent: meta.userAgent ?? session.userAgent,
        ip: meta.ip ?? session.ip,
        deviceClass: device,
        absoluteExpiresAt: session.absoluteExpiresAt,
        // Phones slide forward on every rotation, which is what "stays
        // signed in" means in practice. Desktops are bounded by the
        // deadline above regardless of what this says.
        expiresAt: new Date(now.getTime() + refreshTokenTtlMs(device)),
        chainId: session.chainId ?? session.id,
        lastSeenAt: now,
      },
    }),
  ]);

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    sessionId: next.id,
    device,
    absoluteExpiresAt: session.absoluteExpiresAt,
  });

  return {
    ok: true,
    session: {
      accessToken,
      refreshToken,
      sessionId: next.id,
      device,
      absoluteExpiresAt: session.absoluteExpiresAt,
    },
  };
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

/**
 * Ends every live session belonging to one device chain — "sign this phone
 * out" from another device. Scoped by userId as well as chain so that a
 * forged chain id cannot revoke somebody else's session.
 */
export async function revokeSessionChain(userId: string, chainId: string): Promise<number> {
  const result = await prisma.session.updateMany({
    where: { userId, OR: [{ chainId }, { id: chainId }], revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}
