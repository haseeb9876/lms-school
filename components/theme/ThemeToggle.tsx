"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  themeClass,
  type Theme,
} from "./constants";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeToggle({
  current,
  className,
}: {
  /**
   * Read from the cookie on the server and passed down, so the correct
   * option is already selected in the first HTML. Reading it here instead
   * would mean rendering the wrong one and correcting it after hydration.
   */
  current: Theme;
  className?: string;
}) {
  const [theme, setTheme] = useState<Theme>(current);

  function select(next: Theme) {
    setTheme(next);

    // Applied immediately so the change is instant, and written to the
    // cookie so the *server* renders the same class on the next load —
    // which is what makes the choice survive a reload.
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    const className = themeClass(next);
    if (className) root.classList.add(className);

    document.cookie = [
      `${THEME_COOKIE}=${next}`,
      "path=/",
      `max-age=${THEME_COOKIE_MAX_AGE}`,
      "samesite=lax",
    ].join("; ");
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-sunken p-0.5",
        className
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => select(value)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              active
                ? "bg-surface-raised text-fg shadow-soft"
                : "text-fg-subtle hover:text-fg-muted"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
