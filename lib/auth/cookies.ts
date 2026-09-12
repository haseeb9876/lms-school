import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  PENDING_2FA_COOKIE,
  SESSION_HINT_COOKIE,
  SESSION_COOKIE_MAX_AGE,
  refreshCookieMaxAge,
  type DeviceClass,
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

export async function setSessionCookies(
  accessToken: string,
  refreshToken: string,
  device: DeviceClass = "DESKTOP"
) {
  const store = await cookies();
  const refreshMaxAge = refreshCookieMaxAge(device);

  store.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE.access,
  });

  /*
   * Still scoped to /api/auth. The refresh token is the long-lived secret —
   * the one thing worth stealing — so it is sent on the handful of requests
   * that can actually exchange it, and on none of the hundreds of page and
   * asset requests that cannot.
   */
  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: refreshMaxAge,
  });

  /*
   * The consequence of that scoping is that the proxy, running on a page
   * request, cannot see whether a refresh token exists — so it cannot tell
   * "signed out" from "signed in, access token just expired". This cookie
   * closes that gap and nothing else. It holds no secret and no identity:
   * only the device class, so the sign-in screen can explain *why* someone
   * was asked to sign in again. Forging it buys an attacker a redirect to
   * an endpoint that will reject them.
   */
  store.set(SESSION_HINT_COOKIE, device === "MOBILE" ? "m" : "d", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: refreshMaxAge,
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
  // Clearing the hint matters as much as clearing the token: leaving it
  // behind would make the proxy attempt a refresh that can never succeed,
  // on every single request, for as long as the cookie lived.
  store.set(SESSION_HINT_COOKIE, "", { path: "/", maxAge: 0 });
}
