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
 * counting in the database beats shipping every unread row just to measure
 * the list's length.
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

interface NotifyParams {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/**
 * Fan-out helper for the events that should reach people: a published
 * announcement, a graded submission, an issued invoice. Takes a list of
 * recipients so one class getting a new assignment is a single insert
 * rather than one round trip per student.
 */
export async function notifyUsers({ userIds, type, title, body, link }: NotifyParams): Promise<void> {
  if (userIds.length === 0) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, type, title, body, link })),
  });
}
