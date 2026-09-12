"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { THEME_STORAGE_KEY, type Theme } from "./constants";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  // "system" deliberately writes no class, letting the prefers-color-scheme
  // block in globals.css supply the values instead.
  if (theme !== "system") root.classList.add(theme);
}

export function ThemeToggle({ className }: { className?: string }) {
  // Always renders "system" on the server and on the first client render —
  // localStorage isn't readable during SSR, so reading it in the initial
  // state would produce markup that disagrees with the server's and trip a
  // hydration mismatch. The real value is adopted in the effect below.
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark") setTheme(stored);
    setMounted(true);
  }, []);

  function select(next: Theme) {
    setTheme(next);
    applyTheme(next);
    if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn("inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-sunken p-0.5", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
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
              "rounded-md p-1.5 transition-colors",
              active ? "bg-surface text-fg shadow-soft" : "text-fg-subtle hover:text-fg"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
