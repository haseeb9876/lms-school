"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

/**
 * Registers the service worker and offers to install the app.
 *
 * Two very different platforms to serve, and pretending otherwise is how
 * this feature usually ships broken:
 *
 *   - Chromium (Android, desktop Chrome and Edge) fires
 *     `beforeinstallprompt`, which can be captured and replayed later from a
 *     button of our own. This is the real "Install" experience.
 *
 *   - Safari on iOS fires nothing and offers no API at all. The only way in
 *     is Share → Add to Home Screen, done by hand. Showing an "Install"
 *     button that cannot install anything would be worse than saying
 *     nothing, so iPhones get the actual instructions instead.
 *
 * Either way this never appears for someone already running the installed
 * app, and a dismissal is remembered — an install banner that returns on
 * every visit stops being an offer and becomes an obstacle.
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "lms-install-dismissed";
/** Long enough not to nag, short enough that a real intent to install isn't lost. */
const DISMISS_DAYS = 30;

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [busy, setBusy] = useState(false);

  const dismiss = useCallback(() => {
    setPrompt(null);
    setShowIosHint(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Private browsing can refuse storage; the banner simply reappears.
    }
  }, []);

  useEffect(() => {
    /*
     * Registered from the client after load rather than in the document, so
     * it never competes with the first render for bandwidth on a slow
     * connection. Failure is non-fatal — the app works without it; only
     * installability and the offline page are lost.
     */
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    // Already installed: standalone display, or iOS's own legacy flag.
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (installed) return;

    let dismissedAt = 0;
    try {
      dismissedAt = Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0);
    } catch {
      dismissedAt = 0;
    }
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000) return;

    function onBeforeInstall(event: Event) {
      // Stops Chrome's own mini-infobar so there is exactly one offer.
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    /*
     * iPhone and iPad: no event will ever arrive, so decide from the
     * platform. iPadOS reports itself as a Mac, hence the touch check.
     */
    const ua = navigator.userAgent;
    const isIosSafari =
      (/\b(iPhone|iPod|iPad)\b/.test(ua) ||
        (/\bMacintosh\b/.test(ua) && navigator.maxTouchPoints > 1)) &&
      /Safari\//.test(ua) &&
      !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

    if (isIosSafari) {
      // Delayed so it does not land on top of someone mid-task the instant
      // the page paints.
      const timer = window.setTimeout(() => setShowIosHint(true), 4000);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  useEffect(() => {
    function onInstalled() {
      setPrompt(null);
      setShowIosHint(false);
    }
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  async function install() {
    if (!prompt) return;
    setBusy(true);
    try {
      await prompt.prompt();
      await prompt.userChoice;
      // The event is single-use; Chrome fires a fresh one if they decline
      // and later become eligible again.
      setPrompt(null);
    } finally {
      setBusy(false);
    }
  }

  if (!prompt && !showIosHint) return null;

  return (
    <div
      role="dialog"
      aria-label="Install this app"
      data-print-hide
      className={
        // Above the phone tab bar, clear of the iOS home indicator.
        "fixed inset-x-0 bottom-0 z-50 animate-slide-up px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:left-auto md:right-4 md:w-96 " +
        "mb-[4.25rem] md:mb-4"
      }
    >
      <div className="flex items-start gap-3 rounded-xl border border-line bg-surface-raised p-3.5 shadow-overlay">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-brand-soft text-brand"
        >
          <Download className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">Install the school app</p>

          {prompt ? (
            <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
              Add it to your home screen — it opens full screen, without the browser bar.
            </p>
          ) : (
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-relaxed text-fg-muted">
              <span>Tap</span>
              <Share className="h-3.5 w-3.5 flex-none" aria-label="the Share button" />
              <span>in Safari, then</span>
              <SquarePlus className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
              <span className="font-medium text-fg">Add to Home Screen</span>
            </p>
          )}

          {prompt && (
            <button
              type="button"
              onClick={install}
              disabled={busy}
              className="mt-2.5 inline-flex h-8 items-center rounded-md bg-brand px-3 text-xs font-semibold text-brand-fg transition-all hover:brightness-110 disabled:opacity-60"
            >
              {busy ? "Installing…" : "Install"}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Not now"
          className="-m-1 flex-none rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
