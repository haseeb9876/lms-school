import type { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/errors";
import { REFRESH_COOKIE, rotateSession, type RotationFailure } from "@/lib/auth/session";
import { setSessionCookies, clearSessionCookies } from "@/lib/auth/cookies";
import { clientIp } from "@/lib/auth/rate-limit";

/**
 * Why signing back in a moment ago was ended: shown on the sign-in screen so
 * a person is never bounced out with no explanation.
 */
const REASON_PARAM: Record<RotationFailure, string> = {
  DEADLINE: "expired",
  EXPIRED: "expired",
  INVALID: "signed-out",
  ACCOUNT: "suspended",
};

async function attemptRotation(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return { ok: false as const, reason: "INVALID" as RotationFailure };

  return rotateSession(refreshToken, {
    userAgent: req.headers.get("user-agent"),
    ip: clientIp(req),
  });
}

/** The XHR form, for a client that wants to renew without navigating. */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const result = await attemptRotation(req);

    if (!result.ok) {
      await clearSessionCookies();
      throw new ApiError(
        401,
        result.reason === "DEADLINE"
          ? "You've been signed in for 24 hours. Please sign in again."
          : "Your session has ended. Please sign in again.",
        "SESSION_INVALID"
      );
    }

    await setSessionCookies(
      result.session.accessToken,
      result.session.refreshToken,
      result.session.device
    );
    return Response.json({ ok: true, device: result.session.device });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * The navigation form. The proxy sends a page request here when the access
 * token has expired but a renewable session may still exist, because the
 * refresh cookie is scoped to /api/auth and is only sent on this path.
 *
 * Renewing during a navigation — rather than from a timer in the browser —
 * is what makes "come back tomorrow morning and carry on" work. A client
 * timer cannot help a person whose laptop was asleep: the very first click
 * arrives with a dead token, before any JavaScript of ours has run.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const requested = req.nextUrl.searchParams.get("next");

  /*
   * Only same-site paths. Echoing an arbitrary `next` back into a redirect
   * is the standard open-redirect hole, and it is worse on an auth endpoint:
   * a link that renews a real session and then lands the person on someone
   * else's page is a credible phishing step. A protocol-relative "//evil"
   * is a URL to another host, so it is rejected alongside absolute ones.
   */
  const target =
    requested && requested.startsWith("/") && !/^\/[/\\]/.test(requested) ? requested : "/dashboard";

  const result = await attemptRotation(req);

  if (!result.ok) {
    await clearSessionCookies();
    const login = new URL("/login", req.url);
    login.searchParams.set("reason", REASON_PARAM[result.reason]);
    if (target !== "/dashboard") login.searchParams.set("next", target);
    return Response.redirect(login, 303);
  }

  await setSessionCookies(
    result.session.accessToken,
    result.session.refreshToken,
    result.session.device
  );

  // 303 so the browser issues a plain GET for the destination, and so this
  // hop leaves no entry the back button can land on.
  return Response.redirect(new URL(target, req.url), 303);
}
