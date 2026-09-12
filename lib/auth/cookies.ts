import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  PENDING_2FA_COOKIE,
  SESSION_COOKIE_MAX_AGE,
} from "./session";

const isProd = process.env.NODE_ENV === "production";

/**
 * Records that this browser has signed in before, so the welcome screen can
 * offer "Access portal" instead of "Sign in".
 *
 * Deliberately carries no identity — just the fact that someone has used
 * this device before. It outlives the session on purpose: the point is to
 * recognise a returning family whose session expired weeks ago. Not
 * httpOnly-sensitive, but set httpOnly anyway since only the server reads it.
 */
export const RETURNING_COOKIE = "lms-returning";
const RETURNING_MAX_AGE = 60 * 60 * 24 * 365;

export async function markReturningVisitor() {
  const store = await cookies();
  store.set(RETURNING_COOKIE, "1", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: RETURNING_MAX_AGE,
  });
}

export async function setSessionCookies(accessToken: string, refreshToken: string) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE.access,
  });
  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: SESSION_COOKIE_MAX_AGE.refresh,
  });
}

export async function setPending2FACookie(token: string) {
  const store = await cookies();
  store.set(PENDING_2FA_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: SESSION_COOKIE_MAX_AGE.pending2FA,
  });
}

export async function clearPending2FACookie() {
  const store = await cookies();
  store.set(PENDING_2FA_COOKIE, "", { path: "/api/auth", maxAge: 0 });
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  store.set(REFRESH_COOKIE, "", { path: "/api/auth", maxAge: 0 });
}
