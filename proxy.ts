import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth/tokens";

/**
 * Default-deny: everything requires a valid session unless explicitly
 * listed here. This inverts the old app's model (which only rate-limited
 * two known paths and left every other route open) — a route that isn't
 * allowlisted is protected automatically, not by remembering to add a check.
 */
const PUBLIC_PAGE_PATHS = ["/login", "/forgot-password", "/reset-password", "/unauthorized"];
const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/2fa/verify",
  "/api/auth/refresh",
  "/api/auth/password-reset/request",
  "/api/auth/password-reset/confirm",
  "/api/health",
];

const STATIC_ASSET_PATTERN = /\.(svg|png|jpg|jpeg|gif|ico|css|js|woff2?|map)$/;

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_API_PATHS.includes(pathname)) return true;
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
  const session = token ? await verifyAccessToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json({ error: "You need to sign in to do that." }, { status: 401 });
      response.headers.set("Content-Security-Policy", csp);
      return response;
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set("Content-Security-Policy", csp);
    return response;
  }

  return next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
