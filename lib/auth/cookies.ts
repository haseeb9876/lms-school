import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  PENDING_2FA_COOKIE,
  SESSION_COOKIE_MAX_AGE,
} from "./session";

const isProd = process.env.NODE_ENV === "production";

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
