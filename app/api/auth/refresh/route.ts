import type { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/errors";
import { REFRESH_COOKIE, rotateSession } from "@/lib/auth/session";
import { setSessionCookies, clearSessionCookies } from "@/lib/auth/cookies";
import { clientIp } from "@/lib/auth/rate-limit";

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) {
      throw new ApiError(401, "Not authenticated.", "NO_REFRESH_TOKEN");
    }

    const issued = await rotateSession(refreshToken, {
      userAgent: req.headers.get("user-agent"),
      ip: clientIp(req),
    });

    if (!issued) {
      await clearSessionCookies();
      throw new ApiError(401, "Your session has ended. Please sign in again.", "SESSION_INVALID");
    }

    await setSessionCookies(issued.accessToken, issued.refreshToken);
    return Response.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
