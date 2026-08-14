import type { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { ApiError, handleApiError } from "@/lib/errors";
import { ACCESS_COOKIE, verifyAccessToken } from "./session";

export interface SessionContext {
  session: {
    userId: string;
    role: Role;
    sessionId: string;
  };
}

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Wraps an API route handler so it's structurally impossible to ship an
 * unprotected endpoint by mistake: every handler must go through here to
 * even parse cookies/roles. `scripts/check-route-auth.ts` fails the build
 * if a route file exports a handler that isn't wrapped in this function
 * (or explicitly allowlisted as public).
 *
 * Re-verifies the session cookie itself rather than trusting any header
 * set by middleware — defense in depth against a middleware matcher
 * misconfiguration.
 */
export function withAuth<TContext extends { params?: any } = { params?: any }>(
  allowedRoles: Role[] | null,
  handler: (req: NextRequest, ctx: TContext & SessionContext) => Promise<Response> | Response
) {
  return async (req: NextRequest, context: TContext): Promise<Response> => {
    try {
      if (STATE_CHANGING_METHODS.has(req.method)) {
        const origin = req.headers.get("origin");
        if (origin) {
          const expectedOrigin = new URL(req.url).origin;
          if (origin !== expectedOrigin) {
            throw new ApiError(403, "Cross-origin request blocked.", "CSRF_BLOCKED");
          }
        }
      }

      const token = req.cookies.get(ACCESS_COOKIE)?.value;
      if (!token) {
        throw new ApiError(401, "You need to sign in to do that.", "NOT_AUTHENTICATED");
      }

      const payload = await verifyAccessToken(token);
      if (!payload) {
        throw new ApiError(401, "Your session has expired. Please sign in again.", "SESSION_EXPIRED");
      }

      if (allowedRoles && !allowedRoles.includes(payload.role)) {
        throw new ApiError(403, "You don't have permission to do that.", "FORBIDDEN_ROLE");
      }

      return await handler(req, {
        ...context,
        session: { userId: payload.sub, role: payload.role, sessionId: payload.sid },
      });
    } catch (err) {
      return handleApiError(err);
    }
  };
}
