/**
 * Shared between the pre-paint inline script (a Server Component, which
 * reads the CSP nonce from `next/headers`) and the toggle (a Client
 * Component). It lives in its own module so the client bundle can import
 * the key without also pulling in `next/headers`, which is server-only and
 * fails the build the moment it reaches a client component.
 */
export const THEME_STORAGE_KEY = "lms-theme";

export type Theme = "light" | "dark" | "system";
