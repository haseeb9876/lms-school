"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, Loader2 } from "lucide-react";
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import type { NotificationSummary } from "@/lib/notifications";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * The badge count comes from the shell (one filtered relation count, already
 * paid for); the list itself is fetched the first time the panel opens.
 *
 * Loading the list with the shell meant a database round trip on every
 * navigation to populate a panel most people never open.
 */
export function NotificationBell({ unreadCount: initialUnread }: { unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationSummary[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // The server is the source of truth for the badge; re-sync when a refresh
  // brings a new count down.
  useEffect(() => setUnreadCount(initialUnread), [initialUnread]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);

    // Fetched once per mount; reopening reuses what's already here rather
    // than hitting the server again.
    if (next && items === null && !loading) {
      setLoading(true);
      const result = await loadNotifications(undefined);
      if (result.ok) {
        setItems(result.data.items);
        setUnreadCount(result.data.unreadCount);
      } else {
        setItems([]);
      }
      setLoading(false);
    }
  }

  function handleOpenItem(id: string, readAt: Date | null) {
    if (readAt) return;
    // Optimistic: the badge and row update immediately, the write follows.
    setItems((current) =>
      current?.map((item) => (item.id === id ? { ...item, readAt: new Date() } : item)) ?? current
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    startTransition(async () => {
      await markNotificationRead({ id });
      router.refresh();
    });
  }

  function handleMarkAll() {
    setItems((current) => current?.map((item) => ({ ...item, readAt: item.readAt ?? new Date() })) ?? current);
    setUnreadCount(0);
    startTransition(async () => {
      await markAllNotificationsRead(undefined);
      router.refresh();
    });
  }

  return (
    <div ref={containerRef} className="relative" data-print-hide>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        className="relative rounded-md p-2 text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold tabular-nums text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 flex max-h-[70dvh] w-[min(22rem,calc(100vw-2rem))] animate-scale-in flex-col overflow-hidden rounded-xl border border-line bg-surface-raised shadow-overlay"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-fg">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded text-xs font-medium text-brand hover:underline disabled:opacity-50"
              >
                <Check className="h-3 w-3" aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>

          <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-fg-subtle">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading…
              </div>
            ) : !items || items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-fg-subtle">You&apos;re all caught up.</p>
            ) : (
              <ul>
                {items.map((item) => {
                  const unread = !item.readAt;
                  const content = (
                    <div className="flex items-start gap-2">
                      {unread && (
                        <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-brand" aria-hidden="true" />
                      )}
                      <div className={cn("min-w-0 flex-1", !unread && "pl-3.5")}>
                        <p className={cn("text-sm", unread ? "font-semibold text-fg" : "text-fg-muted")}>
                          {item.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-fg-subtle">{item.body}</p>
                        <p className="mt-1 text-[11px] text-fg-subtle">{formatRelativeTime(item.createdAt)}</p>
                      </div>
                    </div>
                  );

                  return (
                    <li key={item.id} className="border-b border-line last:border-0">
                      {item.link ? (
                        <Link
                          href={item.link}
                          onClick={() => {
                            handleOpenItem(item.id, item.readAt);
                            setOpen(false);
                          }}
                          className="block px-4 py-3 transition-colors hover:bg-surface-hover"
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenItem(item.id, item.readAt)}
                          className="block w-full px-4 py-3 text-left transition-colors hover:bg-surface-hover"
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
