"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The opening sequence: a brief branded preparing screen, then the welcome
 * content fading in.
 *
 * Two rules keep this from becoming the kind of splash screen people hate.
 * It is capped at well under a second, and it never blocks anything — the
 * page behind it is already rendered and interactive, this only covers it.
 * And anyone who has asked for reduced motion, or who has already been
 * through it this session, skips straight to the content.
 */
const HOLD_MS = 900;
const SESSION_KEY = "lms-welcomed";

export function WelcomeStage({ schoolName, mark }: { schoolName: string; mark: ReactNode }) {
  const [preparing, setPreparing] = useState(true);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Once per browser session — returning from the portal shouldn't replay it.
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // Private browsing can throw on sessionStorage; treat it as unseen.
    }

    if (prefersReducedMotion || alreadySeen) {
      setPreparing(false);
      return;
    }

    const timer = setTimeout(() => {
      setPreparing(false);
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Not being able to remember is harmless — it just replays next time.
      }
    }, HOLD_MS);

    return () => clearTimeout(timer);
  }, []);

  if (!preparing) return null;

  return (
    <div
      // Decorative overlay only; the real content is already in the DOM
      // beneath it, so screen readers should ignore this entirely.
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center gap-6",
        "bg-surface-sunken transition-opacity duration-500"
      )}
    >
      <div className="animate-scale-in">{mark}</div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium tracking-wide text-fg">{schoolName}</p>

        {/* A determinate-looking sweep rather than a spinner: it reads as
            "almost ready" instead of "something is stuck". */}
        <div className="h-0.5 w-40 overflow-hidden rounded-full bg-surface-hover">
          <div className="h-full w-1/3 animate-[welcome-sweep_0.9s_ease-in-out_infinite] rounded-full bg-brand" />
        </div>

        <p className="text-xs text-fg-subtle">Preparing your portal…</p>
      </div>

      <style>{`
        @keyframes welcome-sweep {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(360%); }
        }
      `}</style>
    </div>
  );
}
