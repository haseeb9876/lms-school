import { withAuth } from "@/lib/auth/with-auth";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { clearSessionCookies } from "@/lib/auth/cookies";
import { logAudit } from "@/lib/audit";

/** Signs the user out of every device, not just this one. */
export const POST = withAuth(null, async (req, { session }) => {
  await revokeAllSessionsForUser(session.userId);
  await clearSessionCookies();
  await logAudit({ actorId: session.userId, action: "LOGOUT", req, metadata: { everywhere: true } });
  return Response.json({ ok: true });
});
