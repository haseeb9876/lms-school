import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, verifyAccessToken } from "@/lib/auth/session";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname === "/favicon.ico" || pathname === "/icon" || STATIC_ASSET_PATTERN.test(pathname)) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const session = token ? await verifyAccessToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "You need to sign in to do that." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
