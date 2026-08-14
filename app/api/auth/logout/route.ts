import { withAuth } from "@/lib/auth/with-auth";
import { revokeSession } from "@/lib/auth/session";
import { clearSessionCookies } from "@/lib/auth/cookies";
import { logAudit } from "@/lib/audit";

export const POST = withAuth(null, async (req, { session }) => {
  await revokeSession(session.sessionId);
  await clearSessionCookies();
  await logAudit({ actorId: session.userId, action: "LOGOUT", req });
  return Response.json({ ok: true });
});
