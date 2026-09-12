import { prisma } from "@/lib/db";
import { describeDevice } from "@/lib/auth/device";
import type { DeviceClass } from "@/lib/auth/session";

export interface DeviceSession {
  /** The chain, not the row — one entry per browser, not per rotation. */
  chainId: string;
  label: string;
  deviceClass: DeviceClass;
  ip: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  /** Null on phones, which are not capped. */
  expiresAt: Date | null;
  /** The device this page is being read on. */
  current: boolean;
}

/**
 * The devices currently signed in to one account.
 *
 * Sessions rotate every fifteen minutes, so the raw table is a long trail of
 * superseded rows — a person who worked a full day would appear as thirty
 * "devices". Grouping by `chainId` collapses each browser back to the one
 * thing a reader cares about: "my phone, my office computer, and something
 * in Lahore I don't recognise".
 */
export async function listDeviceSessions(
  userId: string,
  currentSessionId: string
): Promise<DeviceSession[]> {
  const now = new Date();

  const rows = await prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      chainId: true,
      userAgent: true,
      ip: true,
      createdAt: true,
      lastSeenAt: true,
      deviceClass: true,
      absoluteExpiresAt: true,
    },
  });

  const chains = new Map<string, DeviceSession>();

  for (const row of rows) {
    // Pre-migration rows have no chain; each stands alone under its own id.
    const key = row.chainId ?? row.id;
    const existing = chains.get(key);

    if (!existing) {
      chains.set(key, {
        chainId: key,
        label: describeDevice(row.userAgent),
        deviceClass: row.deviceClass,
        ip: row.ip,
        firstSeenAt: row.createdAt,
        lastSeenAt: row.lastSeenAt,
        expiresAt: row.absoluteExpiresAt,
        current: row.id === currentSessionId,
      });
      continue;
    }

    // Rows arrive newest-first, so the chain's start is whatever is oldest
    // and its activity is whatever is newest.
    if (row.createdAt < existing.firstSeenAt) existing.firstSeenAt = row.createdAt;
    if (row.lastSeenAt > existing.lastSeenAt) existing.lastSeenAt = row.lastSeenAt;
    if (row.id === currentSessionId) existing.current = true;
  }

  // This device first, then most recently active.
  return [...chains.values()].sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1;
    return b.lastSeenAt.getTime() - a.lastSeenAt.getTime();
  });
}
