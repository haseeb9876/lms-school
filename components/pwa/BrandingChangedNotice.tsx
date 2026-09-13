"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

/**
 * Tells an iPhone user to re-add the app when the school's branding changes.
 *
 * Android re-reads the manifest and updates an installed app's name and
 * icon on its own, which is why every icon URL carries the branding version
 * — a new logo is a new URL, so the phone fetches it.
 *
 * iOS does not do this. Safari copies the name and the icon at the moment
 * someone taps "Add to Home Screen" and never looks again; there is no API
 * to make it. So on iPhones the only honest options are to say nothing and
 * let the icon quietly stay wrong forever, or to say so once and tell them
 * the thirty-second fix. This does the second.
 *
 * Only ever shown to someone actually running the installed app on iOS,
 * only when the branding really has changed since they installed it, and
 * only once per change.
 */
const SEEN_KEY = "lms-branding-version";

export function BrandingChangedNotice({ version }: { version: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    // Irrelevant in a browser tab: there is no home-screen icon to be stale.
    if (!standalone) return;

    const ua = navigator.userAgent;
    const isApple =
      /\b(iPhone|iPod|iPad)\b/.test(ua) ||
      (/\bMacintosh\b/.test(ua) && navigator.maxTouchPoints > 1);
    if (!isApple) return;

    let seen: string | null = null;
    try {
      seen = window.localStorage.getItem(SEEN_KEY);
      // Recorded immediately, so this appears once per change rather than on
      // every launch until it is dismissed.
      window.localStorage.setItem(SEEN_KEY, version);
    } catch {
      return;
    }

    // No record means this is the first launch since the feature shipped —
    // nothing has changed from their point of view, so stay quiet.
    if (seen && seen !== version) setShow(true);
  }, [version]);

  if (!show) return null;

  return (
    <div
      role="status"
      data-print-hide
      className="fixed inset-x-0 bottom-0 z-50 mb-[4.25rem] animate-slide-up px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:bottom-4 md:left-auto md:right-4 md:mb-0 md:w-96"
    >
      <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-raised p-3.5 shadow-overlay">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-soft text-brand"
        >
          <RefreshCw className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">The school updated its logo</p>
          <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
            Everything inside the app is already up to date. Only the icon on your home screen
            still shows the old one — iPhones can&apos;t change it by themselves. To update it,
            delete the app from your home screen and add it again from Safari.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShow(false)}
          aria-label="Dismiss"
          className="-m-1 flex-none rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
