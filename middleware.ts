import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limiting store (for production server/edge environment)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

// Rate limit parameters: Max 10 requests per 60 seconds for sensitive API routes
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_API_REQUESTS = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return false;
  }

  if (now - record.lastReset > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return false;
  }

  if (record.count >= MAX_API_REQUESTS) {
    return true;
  }

  record.count += 1;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Apply API Rate Limiting on sensitive routes (Login, Ticket Submissions)
  if (
    pathname.startsWith("/api/auth/login") ||
    (pathname.startsWith("/api/desk/tickets") && request.method === "POST")
  ) {
    const ip = request.ip || request.headers.get("x-forwarded-for") || "anonymous-client";

    if (isRateLimited(ip)) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests. Please slow down and try again in a minute.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        }
      );
    }
  }

  // 2. Role-Based Access Control (RBAC) Guard for Dashboard Routes
  if (pathname.startsWith("/dashboard")) {
    const userRole = request.cookies.get("user_role")?.value;
    const sessionToken = request.cookies.get("session_token")?.value;

    // If no session token or cookie exists, redirect to login page
    if (!sessionToken && !userRole) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role Route Restrictions
    if (pathname.startsWith("/dashboard/principal") && userRole !== "PRINCIPAL") {
      return NextResponse.redirect(new URL(`/dashboard/${userRole?.toLowerCase() || "student"}`, request.url));
    }

    if (pathname.startsWith("/dashboard/teacher") && userRole !== "TEACHER" && userRole !== "PRINCIPAL") {
      return NextResponse.redirect(new URL(`/dashboard/${userRole?.toLowerCase() || "student"}`, request.url));
    }

    if (pathname.startsWith("/dashboard/student") && userRole !== "STUDENT" && userRole !== "PARENT" && userRole !== "PRINCIPAL") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 3. Inject Security Headers
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
}

// Apply middleware to Dashboard routes and protected API endpoints
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/auth/login",
    "/api/desk/tickets",
  ],
};
