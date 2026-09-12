import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface NotificationSummary {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationFeed {
  items: NotificationSummary[];
  unreadCount: number;
}

const FEED_SIZE = 12;

/**
 * The bell only ever shows a short recent list, so the feed is capped here
 * rather than loading a user's entire notification history to render a
 * dropdown. The unread count is a separate aggregate for the same reason —
 * counting in the database beats shipping every unread row to measure a
 * list's length.
 */
export async function getNotificationFeed(userId: string): Promise<NotificationFeed> {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: FEED_SIZE,
      select: { id: true, type: true, title: true, body: true, link: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return { items, unreadCount };
}

/** Maps a notification type to the preference column that governs it. */
const PREFERENCE_FIELD: Record<NotificationType, keyof NotificationPreferences> = {
  ANNOUNCEMENT: "announcements",
  GRADE: "grades",
  ATTENDANCE: "attendance",
  FEE: "fees",
  ASSIGNMENT: "assignments",
  DESK_TICKET: "deskTickets",
  SYSTEM: "announcements",
};

export interface NotificationPreferences {
  enabled: boolean;
  soundEnabled: boolean;
  announcements: boolean;
  grades: boolean;
  attendance: boolean;
  fees: boolean;
  assignments: boolean;
  deskTickets: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  soundEnabled: true,
  announcements: true,
  grades: true,
  attendance: true,
  fees: true,
  assignments: true,
  deskTickets: true,
};

/**
 * Someone's notification preferences, defaulting to everything on.
 *
 * A missing row means "never changed anything", not "wants nothing" — so
 * absence has to read as the defaults rather than as silence.
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const stored = await prisma.notificationSetting.findUnique({
    where: { userId },
    select: {
      enabled: true,
      soundEnabled: true,
      announcements: true,
      grades: true,
      attendance: true,
      fees: true,
      assignments: true,
      deskTickets: true,
    },
  });
  return stored ?? DEFAULT_PREFERENCES;
}

interface NotifyParams {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/**
 * Fan-out helper for the events that should reach people: a published
 * announcement, a graded submission, an issued invoice.
 *
 * Recipients who have muted this kind of notification are dropped before
 * the insert rather than filtered when the bell is read — a muted
 * notification that still exists would resurface the moment someone turned
 * the setting back on, weeks late.
 *
 * Preferences are read in one query for the whole recipient list, and only
 * users who have actually changed something have a row, so this is cheap
 * even for a school-wide announcement.
 */
export async function notifyUsers({ userIds, type, title, body, link }: NotifyParams): Promise<void> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return;

  const field = PREFERENCE_FIELD[type];

  const optedOut = await prisma.notificationSetting.findMany({
    where: {
      userId: { in: unique },
      OR: [{ enabled: false }, { [field]: false }],
    },
    select: { userId: true },
  });

  const muted = new Set(optedOut.map((setting) => setting.userId));
  const recipients = unique.filter((userId) => !muted.has(userId));
  if (recipients.length === 0) return;

  // Chunked: a school-wide announcement at full roll is ~15,000 rows, and a
  // single statement that size exceeds PostgreSQL's bind-parameter limit.
  for (let i = 0; i < recipients.length; i += 2000) {
    await prisma.notification.createMany({
      data: recipients.slice(i, i + 2000).map((userId) => ({ userId, type, title, body, link })),
    });
  }
}
