"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import type { NotificationFeed } from "@/lib/notifications";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * The feed is passed down from the server layout rather than fetched on
 * open: the layout already queries it for the unread badge, so opening the
 * panel costs no extra round trip and the list is never momentarily empty.
 */
export function NotificationBell({ feed }: { feed: NotificationFeed }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // A dropdown that only closes via its own trigger strands the user when
  // they click elsewhere or press Escape, so both are handled here.
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

  function handleOpen(id: string, readAt: Date | null) {
    if (readAt) return;
    startTransition(async () => {
      await markNotificationRead({ id });
      router.refresh();
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead(undefined);
      router.refresh();
    });
  }

  const { items, unreadCount } = feed;

  return (
    <div ref={containerRef} className="relative" data-print-hide>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
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
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-fg-subtle">You&apos;re all caught up.</p>
            ) : (
              <ul>
                {items.map((item) => {
                  const unread = !item.readAt;
                  const content = (
                    <>
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
                    </>
                  );

                  return (
                    <li key={item.id} className="border-b border-line last:border-0">
                      {item.link ? (
                        <Link
                          href={item.link}
                          onClick={() => {
                            handleOpen(item.id, item.readAt);
                            setOpen(false);
                          }}
                          className="block px-4 py-3 transition-colors hover:bg-surface-hover"
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpen(item.id, item.readAt)}
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
