import { cache } from "react";
import { prisma } from "@/lib/db";

export interface ShellUser {
  name: string;
  /** Unread notifications, for the bell badge. */
  unreadCount: number;
  /** Whether new notifications should chime while the app is open. */
  soundEnabled: boolean;
  /** Master switch — when off, nothing is watched for at all. */
  notificationsEnabled: boolean;
}

/**
 * Everything the app shell needs, in exactly one database round trip.
 *
 * The shell re-renders on every navigation, so its cost is paid before any
 * page starts rendering. It used to issue three queries — the user, the
 * notification list and an unread count — and against a database roughly
 * 240ms away that alone put a quarter to half a second in front of every
 * single click.
 *
 * The unread count comes from a filtered relation count rather than a
 * second query, and the notification *list* is no longer fetched here at
 * all: it's only needed once someone actually opens the bell, which is rare
 * compared to navigating.
 */
export const getShellUser = cache(async (userId: string): Promise<ShellUser> => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      name: true,
      _count: { select: { notifications: { where: { readAt: null } } } },
      // A missing settings row means "never changed anything", which is
      // every default on — not silence.
      notificationSetting: { select: { enabled: true, soundEnabled: true } },
    },
  });

  return {
    name: user.name,
    unreadCount: user._count.notifications,
    soundEnabled: user.notificationSetting?.soundEnabled ?? true,
    notificationsEnabled: user.notificationSetting?.enabled ?? true,
  };
});
