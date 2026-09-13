/**
 * Theme state lives in a cookie, not localStorage.
 *
 * The previous design wrote the choice to localStorage and applied it with
 * an inline script before paint. It did not work, and had not been working:
 * React owns `className` on <html>, so the class the script added was
 * reconciled away during hydration. A user who chose dark got dark until the
 * page hydrated and then lost it — on every single load.
 *
 * A cookie is readable on the server, so the class can be rendered into the
 * HTML directly. React and the DOM then agree, there is nothing to strip,
 * there is no flash, and no pre-paint script is needed at all.
 */
export const THEME_COOKIE = "lms-theme";

export type Theme = "light" | "dark" | "system";

/**
 * Light unless told otherwise, and "follow my device" is a deliberate
 * choice rather than the starting point. A school portal is opened on shared
 * office computers, projected in staff meetings and printed from; a parent
 * whose phone happens to be in dark mode should not meet a dark ledger of
 * fees the first time they sign in.
 */
export const DEFAULT_THEME: Theme = "light";

export function parseTheme(value: string | undefined | null): Theme {
  return value === "dark" || value === "light" || value === "system" ? value : DEFAULT_THEME;
}

/**
 * The class to put on <html>. "system" deliberately writes none, which is
 * what lets the prefers-color-scheme block in globals.css supply the values.
 */
export function themeClass(theme: Theme): string {
  return theme === "system" ? "" : theme;
}

/** A year: the choice should outlive the session it was made in. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
