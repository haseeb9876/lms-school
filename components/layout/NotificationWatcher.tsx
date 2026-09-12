"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { loadNotifications } from "@/lib/actions/notifications";
import { playNotificationChime } from "@/lib/notification-sound";
import { useToast } from "@/components/ui/Toast";

/**
 * Watches for notifications that arrive while the app is already open, and
 * announces them with a chime and a toast carrying the actual message.
 *
 * Polled rather than pushed. A WebSocket or SSE connection per user is the
 * obvious answer and the wrong one at this size: 15,000 held-open
 * connections against a single school server, to deliver a handful of
 * events a day. One indexed count every 60 seconds costs far less, and a
 * minute's delay on "the datesheet is out" is not a minute anyone notices.
 *
 * Polling stops entirely while the tab is hidden — a phone in a pocket
 * should not be waking up to ask about announcements.
 */
const POLL_INTERVAL_MS = 60_000;

export function NotificationWatcher({
  initialUnread,
  soundEnabled,
}: {
  initialUnread: number;
  soundEnabled: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  // Refs, not state: changing these must never trigger a re-render, and the
  // interval closure needs to read the latest value rather than the one
  // captured when it was scheduled.
  const lastSeen = useRef(initialUnread);
  const lastNotifiedId = useRef<string | null>(null);
  const checking = useRef(false);

  const check = useCallback(async () => {
    if (checking.current || document.visibilityState !== "visible") return;
    checking.current = true;

    try {
      let result = await loadNotifications(undefined);

      /*
       * A long-open tab is the normal case here — a principal leaves the
       * dashboard up all morning — and the access token behind it lasts
       * fifteen minutes. Without this the poll would start failing quietly
       * and the app would simply stop announcing anything until the next
       * click, which reads as notifications being broken.
       *
       * Navigation renews through the proxy; this is the same renewal for a
       * page nobody is navigating. If it cannot be renewed the session is
       * genuinely over — the 24-hour ceiling on a computer, or a sign-out
       * elsewhere — and saying so beats a page that looks signed in and
       * silently is not.
       */
      if (!result.ok && result.code === "NOT_AUTHENTICATED") {
        const renewed = await fetch("/api/auth/refresh", { method: "POST" });
        if (!renewed.ok) {
          window.location.href = "/login?reason=expired";
          return;
        }
        result = await loadNotifications(undefined);
      }

      if (!result.ok) return;

      const { items, unreadCount } = result.data;
      if (unreadCount <= lastSeen.current) {
        // Also covers the count going *down* because they read something in
        // another tab, which must not re-announce anything later.
        lastSeen.current = unreadCount;
        return;
      }

      const newest = items.find((item) => !item.readAt);
      // Guards against announcing the same item twice if a poll overlaps a
      // manual refresh.
      if (newest && newest.id !== lastNotifiedId.current) {
        lastNotifiedId.current = newest.id;

        const extra = unreadCount - lastSeen.current - 1;
        toast.info(
          extra > 0
            ? `${newest.title} — and ${extra} more`
            : `${newest.title}: ${newest.body}`
        );

        if (soundEnabled) void playNotificationChime();
        // Refresh so the bell badge and any affected page pick it up.
        router.refresh();
      }

      lastSeen.current = unreadCount;
    } catch {
      // A failed poll is not worth surfacing; the next one is 60s away.
    } finally {
      checking.current = false;
    }
  }, [router, soundEnabled, toast]);

  useEffect(() => {
    const timer = setInterval(check, POLL_INTERVAL_MS);

    // Coming back to the tab is the moment someone most wants to know, so
    // check immediately rather than waiting out the rest of the interval.
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  return null;
}
