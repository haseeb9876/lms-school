import { withAuth } from "@/lib/auth/with-auth";
import { parseJsonBody } from "@/lib/validation";
import { passwordChangeSchema } from "@/lib/schemas/auth";
import { ApiError } from "@/lib/errors";
import { verifyPassword, hashPassword, validatePasswordPolicy } from "@/lib/crypto/passwords";
import { prisma } from "@/lib/db";
import { revokeAllSessionsForUser, createSession } from "@/lib/auth/session";
import { setSessionCookies } from "@/lib/auth/cookies";
import { logAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/rate-limit";

export const POST = withAuth(null, async (req, { session }) => {
  const { currentPassword, newPassword } = await parseJsonBody(req, passwordChangeSchema);

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) throw new ApiError(404, "User not found.");

  const currentOk = await verifyPassword(currentPassword, user.passwordHash);
  if (!currentOk) {
    throw new ApiError(401, "Your current password is incorrect.", "INVALID_CURRENT_PASSWORD");
  }

  const policy = validatePasswordPolicy(newPassword);
  if (!policy.valid) {
    throw new ApiError(400, policy.reason!, "WEAK_PASSWORD");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  // Changing a password revokes every existing session, including this one —
  // the user is issued a fresh session below so they aren't logged out by
  // their own action.
  await revokeAllSessionsForUser(user.id);
  const { accessToken, refreshToken } = await createSession({
    userId: user.id,
    role: user.role,
    userAgent: req.headers.get("user-agent"),
    ip: clientIp(req),
  });
  await setSessionCookies(accessToken, refreshToken);

  await logAudit({ actorId: user.id, action: "PASSWORD_CHANGED", req });

  return Response.json({ ok: true });
});
