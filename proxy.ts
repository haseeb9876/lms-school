import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  SESSION_HINT_COOKIE,
  verifyAccessToken,
  isPastAbsoluteDeadline,
} from "@/lib/auth/tokens";
import { roleMayAccess } from "@/lib/route-access";

/**
 * Default-deny: everything requires a valid session unless explicitly
 * listed here. This inverts the old app's model (which only rate-limited
 * two known paths and left every other route open) — a route that isn't
 * allowlisted is protected automatically, not by remembering to add a check.
 */
// "/" is the public welcome screen; the dashboard lives at /dashboard.
const PUBLIC_PAGE_PATHS = ["/login", "/forgot-password", "/reset-password", "/unauthorized"];
/*
 * Fetched by the browser to decide whether the site is installable, and by
 * the OS when drawing the icon — often with no cookies at all, and always
 * before anyone has signed in. None of it is school data.
 */
const PUBLIC_EXACT_PATHS = ["/", "/manifest.webmanifest", "/app-icon", "/sw.js", "/offline.html"];
const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/2fa/verify",
  "/api/auth/refresh",
  "/api/auth/password-reset/request",
  "/api/auth/password-reset/confirm",
  "/api/health",
];

const STATIC_ASSET_PATTERN = /\.(svg|png|jpg|jpeg|gif|ico|css|js|woff2?|map)$/;

/**
 * Branding images are served to signed-out visitors because the welcome and
 * login screens show them. The route itself only ever serves the branding
 * folder, so this prefix does not widen access to other uploads.
 */
const PUBLIC_PREFIXES = ["/api/files/branding/"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.includes(pathname)) return true;
  if (PUBLIC_API_PATHS.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return PUBLIC_PAGE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * A static `script-src 'self'` CSP (the old next.config.js approach) blocks
 * the inline `<script>` tags Next.js's App Router injects to stream and
 * hydrate the page — with no way for the browser to run them, React never
 * hydrates, and every onClick/onSubmit handler silently no-ops (forms fall
 * back to native browser submission instead). This generates a fresh nonce
 * per request and threads it through both the response header and the
 * request (via x-nonce), which is how Next.js knows to stamp that same
 * nonce onto its own inline scripts — the documented pattern from
 * https://nextjs.org/docs/app/guides/content-security-policy.
 */
function buildCsp(nonce: string, isProd: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    /*
     * The service worker. Without this, worker-src falls back to script-src —
     * where 'strict-dynamic' makes 'self' inert — and registration is
     * blocked, taking installability with it.
     */
    "worker-src 'self'",
    "manifest-src 'self'",
    "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.public.blob.vercel-storage.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "production");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  function next(): NextResponse {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  if (pathname.startsWith("/_next") || pathname === "/favicon.ico" || pathname === "/icon" || STATIC_ASSET_PATTERN.test(pathname)) {
    return next();
  }

  if (isPublicPath(pathname)) {
    return next();
  }

  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const verified = token ? await verifyAccessToken(token) : null;

  /*
   * The desktop ceiling, enforced here so it is exact.
   *
   * The deadline travels inside the access token, so this costs no database
   * round trip and cannot be outrun: a desktop session whose token was
   * minted ten minutes ago still stops the moment the 24 hours are up,
   * rather than coasting to the end of that token's own lifetime. Treated
   * as *not renewable* — unlike an ordinary expiry below, there is nothing
   * to renew, so this goes straight to the sign-in screen.
   */
  const pastDeadline = verified !== null && isPastAbsoluteDeadline(verified);
  const session = pastDeadline ? null : verified;

  if (!session) {
    /*
     * An expired access token is not the same as being signed out. A phone
     * session is meant to survive indefinitely and a desktop one for a day,
     * while the access token itself lasts fifteen minutes — so for the vast
     * majority of these requests the right answer is to renew silently and
     * carry on, not to throw someone back to the login screen.
     *
     * The refresh cookie is scoped to /api/auth and so is not readable
     * here; the hint cookie says whether attempting a renewal is worth a
     * redirect. Failure there clears both cookies, so this cannot loop.
     */
    const renewable = !pastDeadline && Boolean(request.cookies.get(SESSION_HINT_COOKIE)?.value);

    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json(
        {
          error: pastDeadline
            ? "You've been signed in for 24 hours. Please sign in again."
            : "You need to sign in to do that.",
          // Lets a client distinguish "renew and retry" from "give up".
          code: renewable ? "SESSION_STALE" : "NOT_AUTHENTICATED",
        },
        { status: 401 }
      );
      response.headers.set("Content-Security-Policy", csp);
      return response;
    }

    if (renewable) {
      const refreshUrl = new URL("/api/auth/refresh", request.url);
      refreshUrl.searchParams.set("next", pathname + request.nextUrl.search);
      const response = NextResponse.redirect(refreshUrl);
      response.headers.set("Content-Security-Policy", csp);
      return response;
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    if (pastDeadline) loginUrl.searchParams.set("reason", "expired");
    const response = NextResponse.redirect(loginUrl);
    // A session past its ceiling is over; leaving the cookies in place
    // would have every later request retry a renewal that cannot succeed.
    if (pastDeadline) {
      response.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
      response.cookies.set(SESSION_HINT_COOKIE, "", { path: "/", maxAge: 0 });
    }
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  /*
   * Role check before rendering starts. Pages carry their own
   * `requireAuth`, but that runs mid-render — and since every segment now
   * has a loading.tsx, the 200 and the skeleton have already been streamed
   * by then, so a refusal can only be a client-side redirect. Deciding here
   * keeps a forbidden route an honest redirect for every client.
   */
  if (!pathname.startsWith("/api/") && !roleMayAccess(pathname, session.role)) {
    const response = NextResponse.redirect(new URL("/unauthorized", request.url));
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  return next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
